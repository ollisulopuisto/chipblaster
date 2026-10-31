# Bolt's Performance Journal

## 2026-05-18 - Pre-normalizing large static search catalogs
**Learning:** In browser catalog/library search interfaces with large datasets (~61k strings), executing Unicode normalization (`s.normalize('NFD')`) and regex transforms on every keystroke in React component render cycles blocks the UI thread for ~50ms+. Pre-normalizing paths once when catalog data arrives cuts per-keystroke search latency from ~55ms down to ~7-12ms (~5-8x speedup).
**Action:** Always pre-normalize static text datasets during initial load/worker ingest rather than running string normalizations repeatedly inside search/filter loops.
