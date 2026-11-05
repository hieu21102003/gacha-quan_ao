# Local Persistence Hardening

## Pre-change audit

Source inspection found:

- `lib/image-storage.ts` is IndexedDB v5 and keeps all six existing stores. The DB opens per operation and resolves writes on transaction completion.
- Wardrobe, outfit, and calendar providers updated React state immediately, then queued full-store `clear()`/rewrite persistence. Those methods returned synchronously; callers could display success before commit, and one tab could erase another tab's unrelated rows using a stale array.
- WearLog provider serialized writes and awaited its single-record create/delete operations, but its retry path rewrote the full `wearLogs` store.
- The add/edit clothing form deleted the previous image before calling the non-awaited item update. If persistence then failed, the row could keep pointing to a deleted Blob. New Blob cleanup also assumed provider mutations were durable.
- Clothing deletion removed only the row, leaving image lifecycle unspecified. Static asset paths must never be treated as `images` keys.
- No test runner or test files are declared in `package.json`.
- Seed items have exact canonical IDs in `lib/wardrobe-data.ts`; the old model had no provenance. A matching ID alone is insufficient proof because a user may have edited a seed record.

The implementation below preserves v5 data and changes ordinary mutations to record-level IndexedDB transactions. The detailed implementation, guarantees, verification, and remaining limitations are maintained in this document as work proceeds.
