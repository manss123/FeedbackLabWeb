import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { adminResearchPage } from "@/lib/admin.functions";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { makeParticipantCodes, participantIds, type ResearchData } from "@/lib/research-log";
import { Button } from "@/components/ui/button";

export interface ResearchLoadProps {
  data: ResearchData;
  loadedAt: number;
  refreshing: boolean;
  refresh: () => void;
  range: { from: string; to: string };
  complete: boolean;
  asOf: string;
}
function defaultRange() {
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  return { from: new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10), to: today };
}
export function ResearchDataLoader({
  children,
}: {
  children: (props: ResearchLoadProps) => ReactNode;
}) {
  const [range, setRange] = useState(defaultRange);
  const [draft, setDraft] = useState(range);
  const valid = Boolean(draft.from && draft.to && draft.from <= draft.to);
  return (
    <div className="space-y-5">
      <section className="space-y-3 border-b border-border pb-5">
        <h2 className="text-lg font-semibold">ช่วงเวลาที่ต้องการติดตาม</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            ตั้งแต่วันที่ (ไทย)
            <input
              aria-label="วันที่เริ่มอ่านข้อมูลจากระบบ"
              className="block rounded border p-2"
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label className="text-sm">
            ถึงวันที่ (รวมวันสิ้นสุด)
            <input
              aria-label="วันที่สิ้นสุดอ่านข้อมูลจากระบบ"
              className="block rounded border p-2"
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <Button disabled={!valid} onClick={() => setRange({ ...draft })}>
            แสดงช่วงวันที่นี้
          </Button>
        </div>
        <p className="text-xs text-slate-text">
          เริ่มต้น 7 วันล่าสุด · วันที่และเวลาแสดงตามประเทศไทย
        </p>
      </section>
      <ResearchPages key={`${range.from}:${range.to}`} range={range}>
        {children}
      </ResearchPages>
    </div>
  );
}
function ResearchPages({
  range,
  children,
}: {
  range: ResearchLoadProps["range"];
  children: (props: ResearchLoadProps) => ReactNode;
}) {
  const client = useQueryClient();
  const queryKey = ["admin-research-pages", range.from, range.to];
  const [loadingAll, setLoadingAll] = useState(false);
  const stopped = useRef(false);
  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      await waitForFirebaseUser();
      const page = await adminResearchPage({ ...range, cursor: pageParam });
      return { ...page, codes: await makeParticipantCodes(participantIds(page)) };
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const data = useMemo(() => {
    const pages = query.data?.pages ?? [];
    // Stable IDs avoid duplicate contributions when a page is retried.
    return {
      users: [...new Map(pages.flatMap((p) => p.users).map((r) => [r.uid, r])).values()],
      sessions: [...new Map(pages.flatMap((p) => p.sessions).map((r) => [r.id, r])).values()],
      events: [...new Map(pages.flatMap((p) => p.events).map((r) => [r.id, r])).values()],
      codes: Object.assign({}, ...pages.map((p) => p.codes)) as Record<string, string>,
    };
  }, [query.data]);
  const loadAll = async () => {
    stopped.current = false;
    setLoadingAll(true);
    try {
      while (!stopped.current) {
        const result = await query.fetchNextPage({ cancelRefetch: false });
        if (result.isError || !result.hasNextPage) break;
      }
    } finally {
      if (!stopped.current) setLoadingAll(false);
    }
  };
  const complete = Boolean(query.data && !query.hasNextPage && !query.isError);
  return (
    <>
      <section
        hidden={complete}
        className="space-y-2 border-l-4 border-monitor-amber bg-background p-4 text-sm"
        aria-live="polite"
      >
        <p>
          {query.isPending
            ? "กำลังโหลดข้อมูล..."
            : `โหลดแล้ว ${data.events.length} เหตุการณ์ · ${data.sessions.length} รอบฝึก · ${data.users.length} ผู้เรียน`}
        </p>
        {query.isError && (
          <p role="alert" className="text-destructive">
            โหลดข้อมูลไม่สำเร็จ ข้อมูลยังไม่ครบ กรุณาลองอีกครั้ง
          </p>
        )}
        <p className="text-sm">
          {complete
            ? "ข้อมูลพร้อมสำหรับดูภาพรวมและส่งออก"
            : "ข้อมูลยังไม่ครบ — กราฟและยอดรวมแสดงเฉพาะส่วนที่โหลด กรุณาโหลดเพิ่มก่อนสรุปผล"}
        </p>
        <div className="flex flex-wrap gap-3">
          {query.hasNextPage && (
            <>
              <Button
                variant="outline"
                disabled={query.isFetching || loadingAll}
                onClick={() => void query.fetchNextPage({ cancelRefetch: false })}
              >
                โหลดหน้าถัดไป
              </Button>
              <Button disabled={query.isFetching || loadingAll} onClick={() => void loadAll()}>
                โหลดให้ครบในช่วงนี้
              </Button>
            </>
          )}
          {loadingAll && (
            <Button
              variant="outline"
              onClick={() => {
                stopped.current = true;
                setLoadingAll(false);
              }}
            >
              หยุดโหลดเพิ่ม
            </Button>
          )}
          {query.isError && (
            <Button
              variant="outline"
              disabled={query.isFetching || loadingAll}
              onClick={() => void client.resetQueries({ queryKey, exact: true })}
            >
              ลองโหลดใหม่
            </Button>
          )}
        </div>
      </section>
      {query.data &&
        children({
          data,
          range,
          complete,
          asOf: query.data.pages[0].asOf,
          loadedAt: query.dataUpdatedAt,
          refreshing: query.isFetching || loadingAll,
          refresh: () => {
            void client.resetQueries({ queryKey, exact: true });
          },
        })}
    </>
  );
}
