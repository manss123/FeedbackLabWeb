# Instructor monitoring

Visual revision (2026-09-28): neutral white/gray canvas, four white KPI tiles with colored borders and values, full-width 320px mobile / 384px desktop plots, blue/teal lesson series, and amber/teal VR comparison. Chart surfaces are static; actions stay explicit. A completed load no longer adds a redundant status block above the workspace; partial/error states remain visible. See DESIGN_SYSTEM.md §12. This changes presentation, not aggregation or read frequency.

The admin landing screen now opens on **ภาพรวม**. Three primary views replace the previous five competing log tabs:

- ภาพรวม: observed activity metrics, daily learner counts, per-module start/completion counts, paired VR scores, missing score counts and recent learners.
- ติดตามผู้เรียน: the existing detailed tables, chosen from a labeled select. All prior filters, session dialogs and table exports remain available.
- ส่งออกข้อมูลวิจัย: JSON bundle, assessment CSV, codebook and metadata exports. Exports still require all pages in the selected period to load.

These are monitoring summaries of loaded records, not live presence. No polling, new Firestore reads, writes or backend aggregates were added. The default is the existing seven-day range, with explicit refresh and pagination. Partial datasets remain clearly labeled. Advanced participant/date filters can be expanded, with an indicator when applied. Table-specific event, module and scenario filters do not affect overview charts.

Daily bars count distinct participant codes per stored event day in Asia/Bangkok, not event volume or active attention. Only observed days appear; missing days are not interpolated. Per-module bars count distinct learners with start/completion events independently; completion may occur without a start in the selected date range. They are not a completion funnel or a completion-rate denominator.

VR averages use the same paired set for both rounds, include zero, and exclude missing/invalid scores. The unit is a VR session, not a person. A session without both scores is a data-review item, not proof of learner failure or disengagement. Post-test counts use stored assessment submissions in the selected period, deduplicated across their item-level export rows. Recent activity uses recorded server event time.

The layout uses whitespace, dividers and explicit controls, with data tables available alongside charts for accessible reading. No sample data is substituted for an empty result. Chart logic tests: `node --test scripts/test-admin-monitoring.mjs`.

The overview no longer contains the long research-method notes. The export view shows three short reminders; full RESEARCH_NOTES remain in exported JSON metadata and the metadata download. Invalid timestamp counts remain visible there when nonzero.
