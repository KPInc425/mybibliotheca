# Documentation history

These are **historical point-in-time reports**, moved here so they stop reading as
current documentation. Each one describes the project at the moment it was written
and says nothing reliable about today.

Read them for background on how a decision was reached, not for the state of the
code. Where they conflict with `CURRENT_STATUS.md`, `CURRENT_STATUS.md` wins.

| Document | What it was |
|---|---|
| `FRONTEND_MIGRATION_PLAN.md` | The plan for porting the Jinja templates to React |
| `FRONTEND_MIGRATION_SUMMARY.md` | Claimed the port was complete at "100% feature parity" |
| `MIGRATION_STATUS.md` | Per-phase migration tracker, marked all phases complete |
| `UI_MIGRATION_SUMMARY.md` | Bootstrap to Tailwind/DaisyUI conversion |
| `PHASE_1_SUMMARY.md`, `PHASE1_IMPLEMENTATION_SUMMARY.md` | API-first backend extraction |
| `PHASE2_IMPLEMENTATION_SUMMARY.md` | React frontend introduction |
| `MASS_EDIT_FEATURE.md` | Mass edit feature write-up |
| `RATE_LIMITING.md` | Rate limiting write-up |
| `TAILWIND_SETUP.md` | Tailwind configuration notes |
| `NATIVE_BARCODE_SCANNER.md`, `NATIVE_SCANNER_FIXES.md`, `SCANNER_REFACTORING.md` | Native MLKit scanner work |
| `CAMERA_CLEANUP.md` | Camera resource handling |
| `CAPACITOR_AUTH_PERSISTENCE.md` | Capacitor auth session handling |
| `CROSS_PLATFORM.md`, `BUILD_APK.md` | Capacitor/Android build notes |
| `EMAIL_NORMALIZATION_FIX.md` | One-off email normalisation fix |
| `documentation.md` | Pre-fork "Bibliotheca" overview, predates the BookOracle rename |

**The recurring problem with these documents** was the "100% feature parity"
claim. It was not true when written. The template UI was never retired, import
was broken, external search returned nothing, and the wrap-up image could not be
reached at all. Claims like that are how a team ends up with a green dashboard
badge and a dead feature, so prefer stating what is verified and when.
