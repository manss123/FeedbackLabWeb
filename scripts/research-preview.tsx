// Synthetic fixtures for the isolated preview server; never imported by the app.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { AdminResearchDashboard } from "../src/components/admin-research-dashboard";
import { makeParticipantCodes } from "../src/lib/research-log";
import "../src/styles.css";

const users = Array.from({ length: 30 }, (_, i) => ({
  uid: `fixture-${i}`,
  profile: {
    displayName: `ผู้เรียนทดสอบ ${i + 1}`,
    faculty: "คณะทดสอบ",
    teachingExperienceYears: i % 12,
  },
  consent: { researchConsent: true },
}));
const scores = (n: number) => ({
  speechClarity: n,
  linguisticAppropriateness: n + 2,
  balance: n - 2,
  intentConsistency: n,
  overall: n,
});
const sessions = users.slice(0, 4).map((user, i) => ({
  id: `fixture-session-${i}`,
  userId: user.uid,
  scenarioId: `s${(i % 2) + 1}`,
  createdAt: "2026-09-16T03:00:00Z",
  stage1: {
    transcript: "ข้อมูลทดสอบ: งานมีโครงสร้างชัดเจน ลองเพิ่มตัวอย่างอีกหนึ่งเรื่อง",
    durationSeconds: 35,
    completedAt: "2026-09-16T03:01:00Z",
  },
  stage2: {
    selfRatings: [3, 4, 3, 4, 5, 4, 3, 4],
    bestPart: "ข้อมูลทดสอบ: ชื่นชมจุดแข็ง",
    personalGoal: "ข้อมูลทดสอบ: แนะนำให้เจาะจง",
    completedAt: "2026-09-16T03:02:00Z",
  },
  stage3: {
    aiScores: i === 1 ? null : scores(55),
    selectedGoals: ["ข้อมูลทดสอบ: เพิ่มแนวทางปฏิบัติ"],
    customGoal: "",
    completedAt: "2026-09-16T03:03:00Z",
  },
  stage4:
    i === 2
      ? null
      : {
          transcript: "ข้อมูลทดสอบ: ครั้งหน้าลองเพิ่มตัวอย่างการใช้งานจริง",
          durationSeconds: 40,
          aiScores: scores(75),
          completedAt: "2026-09-16T03:05:00Z",
        },
}));
const events = users.flatMap((user, i) => [
  {
    id: `fixture-event-${i}-1`,
    userId: user.uid,
    type: "signed_in",
    createdAt: "2026-09-16T02:00:00Z",
  },
  {
    id: `fixture-event-${i}-2`,
    userId: user.uid,
    type: "module_started",
    moduleId: "m1",
    createdAt: "2026-09-16T02:01:00Z",
  },
  {
    id: `fixture-event-${i}-3`,
    userId: user.uid,
    type: "module_completed",
    moduleId: "m1",
    createdAt: "2026-09-16T02:15:00Z",
  },
  {
    id: `fixture-event-${i}-4`,
    userId: user.uid,
    type: "module_started",
    moduleId: "m1",
    createdAt: "2026-09-16T02:20:00Z",
  },
  ...(i < 4
    ? [
        {
          id: `fixture-event-${i}-5`,
          userId: user.uid,
          type: "vr_scenario_started",
          scenarioId: sessions[i].scenarioId,
          createdAt: "2026-09-16T03:00:00Z",
        },
        {
          id: `fixture-event-${i}-6`,
          userId: user.uid,
          type: "vr_scenario_retried",
          scenarioId: sessions[i].scenarioId,
          sessionId: sessions[i].id,
          createdAt: "2026-09-16T03:04:00Z",
        },
        {
          id: `fixture-event-${i}-7`,
          userId: user.uid,
          type: "vr_scenario_completed",
          scenarioId: sessions[i].scenarioId,
          sessionId: sessions[i].id,
          createdAt: "2026-09-16T03:06:00Z",
        },
      ]
    : []),
]);
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false } },
});
client.setQueryData(["admin-research-data"], {
  users,
  sessions,
  events,
  codes: await makeParticipantCodes(users.map((user) => user.uid)),
});
const route = createRootRoute({
  component: () => (
    <QueryClientProvider client={client}>
      <div className="bg-secondary p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 rounded-xl border border-border bg-background p-3 text-sm">
            หน้าตรวจ UI · ข้อมูลทดสอบเท่านั้น · ไม่เชื่อม Firebase (อย่ากดอัปเดตข้อมูล)
          </p>
          <AdminResearchDashboard />
        </div>
      </div>
    </QueryClientProvider>
  ),
});
const router = createRouter({ routeTree: route });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
