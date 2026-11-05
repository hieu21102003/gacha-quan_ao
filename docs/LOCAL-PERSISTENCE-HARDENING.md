# Local Persistence Hardening

## Pre-change audit

Before implementation, source inspection found:

- `lib/image-storage.ts` used IndexedDB version 5 and retained six stores: `images`, `wardrobe`, `metadata`, `outfits`, `calendar`, and `wearLogs`.
- Wardrobe, outfit, and calendar providers updated React state before a queued full-store clear/rewrite. Their APIs returned synchronously, so callers could report success before IndexedDB committed. A stale tab could also overwrite unrelated records from another tab.
- WearLog writes were serialized and awaited, but its retry path rewrote the whole store.
- The clothing form deleted a previous image before an item update had committed. A failed update could leave a record pointing at a deleted image. New-image cleanup also relied on non-awaited provider writes.
- Clothing deletion did not account for stored-image references. Static asset URLs must not be used as keys in the `images` store.
- There was no declared test runner or existing test suite.
- Starter clothing records had canonical IDs but no provenance field. Matching an ID alone could not distinguish an untouched starter from an edited record.

## Implementation and guarantees

### Awaitable mutations and state

Provider mutations for wardrobe, outfits, calendar entries, and WearLogs now return promises. They update in-memory provider state only after the corresponding IndexedDB transaction completes. Callers await mutations before closing forms, dialogs, or showing success. Failed operations reject and keep the previous UI state; provider error banners or action-level alerts expose storage errors. “Reload saved data” retries the read and does not claim to replay a failed write.

### Record-level transactions

Normal mutations no longer clear and rewrite an entire object store:

- Clothing add/update/delete operates on the affected record. Updates merge a patch into the latest record inside a readwrite transaction.
- Outfit add/update/delete operates on the affected record and resolves the update callback against the latest saved value.
- Calendar add/update/delete is record-level. Duplicate outfit/date detection runs within the same calendar-store readwrite transaction as the write, so concurrent tabs cannot both pass a stale pre-check.
- WearLog add/delete is record-level. The calendar-entry duplicate check runs inside the WearLog readwrite transaction.
- Provider retries reload persisted state; they do not bulk-rewrite stores.

The browser serializes overlapping readwrite transactions for a store. Unrelated records and fields are preserved. Concurrent changes to the same field remain last-commit-wins; this is local persistence, not a conflict-resolution or multi-device sync system.

### Database upgrade and provenance

IndexedDB is now version 6. The upgrade creates no new stores and does not delete or recreate existing stores. It adds `provenance` to legacy wardrobe records:

- `seed` only when the full legacy record has exactly the canonical starter fields and values.
- `unknown` for all other legacy records, without guessing whether they are user-created.
- `user` for newly created clothing records.

Unknown records remain visible and editable. The wardrobe displays a review notice for them so a future backup feature can avoid silently classifying ambiguous legacy rows. Outfits, calendar entries, wear logs, metadata, and image Blobs are not rewritten by the migration.

### Image lifecycle

- Uploads persist the Blob before the wardrobe record is written. If the record write fails, cleanup removes the new Blob only when no wardrobe row references it.
- Replacing a stored image updates the wardrobe row and deletes the old Blob only if no other row references it, in the same transaction across `wardrobe` and `images`.
- Deleting clothing removes the row and its stored Blob atomically only when the Blob is no longer referenced.
- Static paths are not considered IndexedDB image references.
- If cleanup cannot safely verify the wardrobe data, the transaction fails rather than deleting an image speculatively.

### Cross-tab updates

Successful record mutations publish a `BroadcastChannel` notice. Matching providers reload the affected store in other tabs. Focus/visibility events provide a refresh fallback where BroadcastChannel is unavailable. This keeps tabs eventually consistent; it does not prevent or resolve simultaneous edits to the same field.

## Repeatable browser verification procedure

There is no automated test runner in `package.json`. The following manual test is repeatable without touching a user's existing data:

1. Use a disposable browser origin (a different hostname or port from the user's normal app). Confirm `indexedDB.databases()` does not already contain `virtual-wardrobe`.
2. Before loading the app, create a synthetic version-5 `virtual-wardrobe` database with all six stores and representative wardrobe, metadata, outfit, calendar, WearLog, and optional image records. Include one exact canonical starter record and one noncanonical legacy record.
3. Load the app. Confirm it upgrades to version 6, retains all stores and fixture rows, classifies only the exact canonical row as `seed`, marks the ambiguous row `unknown`, and shows the review notice.
4. Through the UI, add a clothing item with a small test image. Refresh and verify the row and image remain. Replace its image and verify the old Blob is removed only after the record update; delete the item and verify its unreferenced Blob is removed.
5. In two tabs on the same disposable origin, change a clothing favorite in one tab and confirm the other tab refreshes.
6. Create an outfit, reload, and confirm the outfit record contains clothing IDs. Add a calendar entry and confirm it persists. Mark it as worn, reload, and confirm the WearLog snapshot persists independently.
7. Remove the disposable database after testing. Do not clear the user's normal-origin database.

## Verification performed

Executed against a local production server using isolated test origins `http://127.0.0.1:3001` and `http://localhost:3001`; no normal user-origin IndexedDB data was used.

- Seeded a synthetic v5 database with all six stores, two wardrobe rows, metadata, one outfit, one calendar entry, and one WearLog. After app startup, observed version 6, all six stores, preserved rows/counts, exact starter as `seed`, legacy custom row as `unknown`, and the ambiguity notice.
- Added a clothing item with an image through the closet UI. Reloaded and confirmed the item remained, its provenance was `user`, and its Blob resolved to an object URL.
- Replaced the image and confirmed the row pointed to the new Blob and the old unreferenced Blob was gone. Deleted the item and confirmed both the row and now-unreferenced Blob were gone.
- Used two tabs on the same origin. A favorite change in one tab appeared in the other without a reload.
- Created an outfit in the UI and confirmed it persisted after reload with only clothing IDs.
- Added a calendar entry, marked it as worn, reloaded, and confirmed both the scheduled entry and WearLog with historical item snapshots remained in their respective stores.
- Loaded a fresh origin and confirmed starter wardrobe onboarding populated 12 clothing records while outfits and wear history remained empty.
- The existing development server on port 3000 remained on “Loading your wardrobe…” and logged failed HMR WebSocket handshakes. Browser checks therefore used a separate production server on port 3001; the development server was not stopped or modified.
- Removed only the synthetic IndexedDB databases created on the three disposable test origins after verification. No existing/user-origin database was opened or deleted.
- Browser interactions preceded the final defensive guards that classify legacy seed rows with extra fields as `unknown` and reject whitespace-only calendar outfit IDs. The final type check and production build include those guards.
- Final `npx.cmd tsc --noEmit` passed.
- Final `npm.cmd run build` passed.
- `node --check public/service-worker.js` passed.
- `git diff --check` passed.

Not verified in this browser pass: forced IndexedDB quota/transaction failure UX, same-field concurrent edit conflict behavior, exhaustive duplicate-race testing, and tests on real mobile devices.
