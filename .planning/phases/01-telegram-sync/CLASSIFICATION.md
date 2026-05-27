## Audit-Fix Classification

| # | Finding | Severity | Classification | Reason |
|---|---------|----------|---------------|--------|
| F-01 | Multiple profiles in Analytics | High | auto-fixable | Clear fix via UI grouping and DB constraints. |
| F-02 | 400 Bad Request on Primary | High | auto-fixable | Specific fix in hook's onConflict parameters. |
| F-03 | Real-time not working | Medium | auto-fixable | DB-level fix (enable Realtime) + check subscription. |
