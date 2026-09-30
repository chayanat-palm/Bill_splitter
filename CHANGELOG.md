# Changelog

## [1.0.3] - 2026-09-30
- Fixed copy button breaking when a name contains `'` or HTML; names are now escaped.
- Saved all inputs to `localStorage` so data survives page refresh.
- Summary text now shows the rounded total (matches the per-person amounts).
- Added a clipboard fallback for in-app browsers (e.g. LINE) and an error message when copying fails.

## [1.0.2]
- Added delete button for person rows.
- 'ยอดหลังหักส่วนตัว' now subtracts from the exact total.

## [1.0.1] - 2026-05-17
- Refactored `resetForm` to clear only numerical values while preserving names.
