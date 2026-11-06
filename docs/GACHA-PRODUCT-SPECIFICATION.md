# Gacha Product Specification

**Status:** Product design plus pure validation, Gacha selection, and sequential Gacha UI. No weather service, saved-result persistence, or schema change is implemented.

## 1. Product vision

Virtual Wardrobe should help a person make a daily outfit decision quickly and enjoyably. The primary morning interaction is a sequential slot-machine reveal driven only by the user's current wardrobe:

1. Open Home and review today's context.
2. Select or confirm an occasion.
3. Review whether weather context is available.
4. Spin once.
5. Reveal a complete, structurally valid outfit one slot at a time.
6. Accept it, save it, or spin again.
7. Record a WearLog only after the user later confirms that the outfit was actually worn.

Home should become the Gacha entry point. Closet management, saved outfits, scheduling, wear history, and profile statistics remain useful secondary destinations.

## 2. Source audit: existing implementation

This section describes the repository as inspected for this specification. Proposed behavior is identified separately below.

### Data and persistence

- [`lib/wardrobe-data.ts`](../lib/wardrobe-data.ts) defines `ClothingCategory` as `Tops | Bottoms | Dresses | Outerwear | Shoes | Bags | Accessories`. `ClothingItem` contains `id`, `name`, `category`, `image`, `imageAlt`, `color`, `brand`, `seasons`, `styles`, numeric `price`, `status`, `favorite`, and `provenance`. `ClothingProvenance` is `seed | user | unknown`.
- `WearStatus` is `Available | In laundry | Worn recently`. There are no occasion, temperature, rain, or weather-suitability fields on clothing.
- The same file defines `Outfit`, whose `itemIds` is a string array. This can represent multiple accessory IDs; there is no separate accessory collection or outfit-slot model.
- [`lib/image-storage.ts`](../lib/image-storage.ts) currently opens `virtual-wardrobe` at IndexedDB version 6 with stores `images`, `wardrobe`, `metadata`, `outfits`, `calendar`, and `wearLogs`. Mutations use record-level transactions, are awaitable through the providers, and publish cross-tab change notifications. This task must not change that schema.
- [`components/providers/wardrobe-provider.tsx`](../components/providers/wardrobe-provider.tsx) exposes the current wardrobe and async add/update/delete/favorite methods. Its `updateItem` API persists status changes; the Closet detail sheet exposes `Available` and `In laundry` controls.
- [`components/providers/outfit-provider.tsx`](../components/providers/outfit-provider.tsx) persists outfits through add/update/delete/favorite APIs. Outfit records store clothing IDs, not copied images or clothing details.
- [`components/providers/calendar-provider.tsx`](../components/providers/calendar-provider.tsx) exposes scheduled entries that reference saved outfit IDs.
- [`components/providers/wear-log-provider.tsx`](../components/providers/wear-log-provider.tsx) loads confirmed wear history and exposes `addWearLog` and `recordWearFromCalendar`. `recordWearFromCalendar` snapshots a saved outfit and its current wardrobe items; the generic `addWearLog` API accepts a `NewWearLog` snapshot directly.

The root layout in [`app/layout.tsx`](../app/layout.tsx) mounts `WardrobeProvider > OutfitProvider > CalendarProvider > WearLogProvider > AppShell`. The providers are already the appropriate data interface for a future Gacha UI.

### Current seed wardrobe and composition

The 12 starter records in [`lib/wardrobe-data.ts`](../lib/wardrobe-data.ts) contain:

| Category | Seed count |
|---|---:|
| Tops | 3 |
| Bottoms | 3 |
| Dresses | 0 |
| Outerwear | 1 |
| Shoes | 2 |
| Bags | 2 |
| Accessories | 1 |

Consequences:

- The bundled starter data can form top + bottom + shoes outfits, subject to laundry filtering.
- It cannot form a dress outfit until the user adds a dress.
- It can form at most one accessory-inclusive result from the seed wardrobe. Multi-accessory outfits are possible after users add more accessories.
- Not every possible complete base is available for every user. The generator must report which required category is missing rather than substitute sample data.

### Manual Outfit Studio

- [`components/create/outfit-studio.tsx`](../components/create/outfit-studio.tsx) uses the pure `isValidManualOutfitComposition` function from [`lib/outfit-validation.ts`](../lib/outfit-validation.ts).
- Its current rule requires exactly one dress **or** exactly one top and one bottom. It prevents a dress with a top or bottom and prevents multiple items in every non-accessory category. Accessories are explicitly multi-select.
- Outerwear, shoes, and bags are optional in the manual editor.
- Selecting a dress clears tops and bottoms; selecting a top or bottom clears the dress. Selected IDs are persisted through `OutfitProvider`.
- When editing an outfit, missing IDs are retained so the user's saved record is not silently stripped. This exception is inappropriate for generated results: Gacha must only return currently resolved wardrobe items.
- `validateStrictOutfit` in the same module validates resolved item references, category-slot matches, duplicate IDs, laundry status, and structural composition. It exposes shoe readiness without requiring shoes.
- [`app/create/page.tsx`](../app/create/page.tsx) supports editing through `?edit=<outfitId>`. It should remain the manual creation route.

### Images and unavailable references

- Seed image fields are public asset paths. User-uploaded image Blobs are stored in the `images` object store and referenced by `idb-image:<UUID>`.
- [`components/closet/use-clothing-image.ts`](../components/closet/use-clothing-image.ts) resolves stored references to temporary object URLs with cleanup. [`components/outfits/outfit-clothing-photo.tsx`](../components/outfits/outfit-clothing-photo.tsx) renders a loading or unavailable-image fallback.
- `resolveOutfitItems` in `lib/wardrobe-data.ts` only resolves IDs against current clothing records and reports missing IDs. It does not check image availability, category compatibility, or laundry status.
- Gacha should use the current wardrobe records directly, not saved outfit records, as its candidate source. Missing saved-outfit references must never be treated as candidate clothes. Image failure should use the existing unavailable-image fallback and should not create a fabricated clothing item.

### Pure Gacha engine

[`lib/gacha/gacha-engine.ts`](../lib/gacha/gacha-engine.ts) exports `generateGachaOutfit`, `GachaEngineInput`, the typed success/failure result, initial occasion values, and weather-availability types. The caller supplies the current wardrobe records and RNG; the engine does not read providers, saved outfits, browser state, or persistence.

- Only well-formed current records with unique IDs are candidates. Duplicate IDs are excluded as ambiguous and malformed records are counted. `In laundry` is excluded; `Available` and `Worn recently` remain eligible. Empty image strings do not disqualify an item.
- Candidate bases are one dress or one top plus one bottom. The shared `validateStrictOutfit` checks every base and final candidate. Optional Outerwear, Bags, and zero or more Accessories may be added.
- If any Shoes are eligible, one pair is included, preferring pairs not in the supplied recent-wear IDs. If no pair is eligible, the structurally valid result reports `missing-shoes` rather than failing.
- The caller may pass recently worn item IDs and the prior composition IDs. The engine prefers non-repeated compositions, then candidates with fewer recently worn items; it relaxes those preferences when necessary and reports that in the result.
- Occasion and weather availability are returned as context only. No clothing-to-occasion or weather suitability is inferred, and unavailable weather does not prevent generation.
- The final candidate is checked by the strict validator before success. Empty or incomplete wardrobes return a typed failure rather than a partial or synthetic outfit.
- Base combinations are currently enumerated from the supplied wardrobe before choosing a result. Extremely large wardrobes may therefore require a bounded sampling strategy in a later optimization.

### Sequential Gacha UI

The client component in `components/gacha/gacha-studio.tsx` is exposed at `/gacha` and linked from the primary navigation. It reads current records from `WardrobeProvider`, reports available/in-laundry counts, and lets the user choose an occasion. Weather is honestly labeled “not checked.”

- The UI invokes `generateGachaOutfit` once per spin before starting the reveal, stores that candidate in component state, and reveals only those preselected records in category order. It does not choose items during animation.
- Spin Again passes the last generated composition and uses the latest provider items. Repeated clicks are guarded until reveal completion; animation callbacks are invalidated on a new spin or when a selected item is deleted, moved to laundry, or recategorized.
- Framer Motion reveal transitions respect reduced-motion preferences. A live status announces revealed items, and the existing `OutfitClothingPhoto` handles stored image resolution and missing-image fallback.
- The final result shows occasion, unchecked weather, shoe readiness, and engine warnings/anti-repeat relaxation. Accept changes only in-memory UI state; it does not call outfit, calendar, wear-log, or wardrobe mutation APIs. Refreshing clears the accepted result.
- UI integration/browser testing is separate from the pure engine unit suite.

### Laundry and actual wear history

- `In laundry` is persisted as a value of `ClothingItem.status`. The Closet detail sheet now provides a direct `Available` / `In laundry` status control through `WardrobeProvider.updateItem`; the existing `Worn recently` value remains visible until the user explicitly chooses one of those two states. A soft amber status badge distinguishes laundry items without hiding them from the Closet.
- [`lib/wear-log-data.ts`](../lib/wear-log-data.ts) stores actual wear snapshots: `outfitId`, nullable `calendarEntryId`, `wornOn`, note, item snapshots (`clothingItemId`, name, category, brand, price), historical outfit name/value, and creation time.
- `countWearsByClothingItem` and `countWearsByOutfit` use WearLogs only. Calendar entries are planned outfits, not wears.
- `createWearLogFromCalendar` requires a saved outfit and all referenced current clothing items to build a snapshot. A Gacha result that is not saved cannot use that helper as-is. The generic `addWearLog` can accept snapshots without looking up an outfit, so a future Gacha-confirm flow can use it or add a clearly named Gacha adapter.
- `isWearLog` requires a non-empty `outfitId`; a future unsaved Gacha result must be assigned a unique result identifier if it is recorded directly. `calendarEntryId: null` is appropriate when no calendar entry was involved.
- `DuplicateCalendarWearError` prevents a calendar entry from being recorded more than once. It does not provide general duplicate-result or user feedback storage.

### Existing routes and Home

- [`app/page.tsx`](../app/page.tsx) currently composes `DashboardHeader`, `OutfitOfTheDay`, `QuickActions`, `RecentlyWorn`, and `WardrobeOverview`.
- [`components/home/outfit-of-the-day.tsx`](../components/home/outfit-of-the-day.tsx) is a carousel over saved outfits. Its “Change Outfit” action cycles saved records; it does not generate an outfit from wardrobe items.
- `RecentlyWorn` reads real WearLogs. `WardrobeOverview` displays provider-backed counts. These may remain available below or alongside the primary Gacha action, but should not dominate Home.
- `QuickActions` links to manual `/create` and `/closet`.
- [`components/layout/nav-items.ts`](../components/layout/nav-items.ts) currently emphasizes `/create`; mobile and desktop navigation share that list. A recommendation to emphasize Home is made below; no navigation change is part of this task.
- Routes map to Closet (`/closet`), Saved Outfits (`/outfits`), Calendar (`/calendar`), and Profile (`/profile`). Profile statistics in [`components/profile/profile-statistics.tsx`](../components/profile/profile-statistics.tsx) are provider-derived. These remain secondary features rather than being removed.
- [`public/service-worker.js`](../public/service-worker.js) caches only the offline fallback page for navigation failures. It does not make weather available offline or cache user data for Gacha.
- The inspected `package.json` has no declared test-runner dependency, weather package, or Supabase package. A pure Gacha engine is implemented in `lib/gacha/gacha-engine.ts`, with built-in Node tests in `tests/gacha-engine.test.cjs`; no Gacha UI or weather integration exists.

### Documentation consistency note

[`docs/LOCAL-PERSISTENCE-HARDENING.md`](./LOCAL-PERSISTENCE-HARDENING.md) matches the inspected version-6 database and awaitable record-level mutation architecture. [`docs/CLOUD-AUTH-SYNC-ARCHITECTURE.md`](./CLOUD-AUTH-SYNC-ARCHITECTURE.md) contains useful account/sync design, but its local-persistence audit describes an earlier v5 schema and bulk rewrite behavior. For Gacha's current-state assumptions, the source and local-persistence hardening document take precedence over those older statements.

## 3. Current capabilities and gaps

| Capability | Current state | Gacha implication |
|---|---|---|
| Clothing categories | Seven categories in the model | Structural category filtering can be implemented without inventing types. |
| Dress vs separates | Manual Studio uses `isValidManualOutfitComposition`; the edit flow retains its missing-reference preservation exception. | `validateStrictOutfit` is shared by the engine and validates resolved items, assigned slots, duplicates, and laundry status. Shoes remain optional structurally and are reported separately in readiness. |
| Multiple accessories | Supported through `Outfit.itemIds` and Studio's accessory array | Gacha can select zero or more accessories; exact number and bias need product decisions. |
| Shoes | Optional in the Manual Studio and strict structural validation; the engine includes an eligible pair when available. | A missing pair is explicitly reported as `missing-shoes`; it does not invalidate the outfit. |
| Laundry | `In laundry` data value exists, is persisted, and can now be changed in the Closet detail sheet | Exclude it as a hard rule. Continue using the existing status field; do not create another laundry store or status model. |
| Occasion | No clothing metadata or preferences exist; the engine accepts the initial occasion enum as context only. | Do not filter or score clothing by occasion until explicit compatibility data and policy exist. |
| Weather | No API, provider, location preference, or weather suitability fields exist; the engine accepts an availability state as context only. | Weather compatibility cannot be guaranteed from current data. Do not infer conditions or block generation based on weather. |
| Wear feedback | WearLogs record actual wears and historical item snapshots | Useful for future anti-repeat and wear frequency only; they contain no accepted/skipped feedback. |
| Images | Existing utility resolves IndexedDB Blobs and public asset paths | Reuse existing image components and their graceful fallback. |
| Random Gacha result | None | A separate pure engine is required; saved-outfit carousel is not a substitute. |

## 4. Proposed user journey

### Morning Home

Home opens on a daily outfit decision panel with:

- A short local-date greeting.
- An occasion selector, with a quick default such as “Casual” only if the product explicitly approves that default. Otherwise start at “Choose occasion” and require one tap.
- Weather status that distinguishes verified weather, unavailable weather, and stale weather. Do not show guessed temperature, rain, location, or “weather suitable” claims.
- A prominent `SPIN` action.
- Concise readiness information when a complete outfit cannot be produced, such as “Add a pair of shoes” or “No available tops after laundry filtering.”

No separate multi-step questionnaire should block the first spin. Occasion and weather should be visibly editable from the result.

### Sequential reveal

Before any animation, the engine creates one complete result, validates it, and fixes the selected item IDs. The UI then reveals that fixed result in sequence. Animation is presentation only and must never perform additional random selection.

Recommended reveal sequence:

1. **Base choice** — engine chooses either `Separates` or `Dress` from the feasible valid modes.
2. **Top** — reveal only for the separates path.
3. **Bottom** — reveal only for the separates path.
4. **Dress** — reveal only for the dress path.
5. **Shoes** — reveal if the product confirms shoes are required; otherwise show a selected pair only when available.
6. **Outerwear** — optional, selected when compatible and appropriate.
7. **Accessories** — optional, may reveal one or a grouped multi-accessory slot.
8. **Bag** — optional; whether it is part of the animation sequence or simply included in the final composition remains a product choice.

Do not show empty categories as failed spins. If a valid result omits an optional category, display it as optional rather than implying the engine failed to select it.

### Result actions and meaning

- **Accept / Wear this outfit:** marks the current in-memory Gacha result as the user's chosen look. It does not persist an outfit, create a calendar entry, or create a WearLog.
- **Spin again:** generates a new complete valid result. It replaces the prior result only after the replacement has been generated successfully.
- **Save outfit:** optional action that persists the selected clothing IDs through `OutfitProvider.addOutfit`. Since the existing `Outfit` model requires a name, request one or present a clearly editable suggested name; do not silently create an unnamed record.
- **Schedule:** use only through the existing calendar flow and `CalendarProvider.addEntry`, which needs a saved outfit ID and date. Scheduling is a plan, not actual wear.
- **Confirm worn:** explicit later confirmation only. Persist a WearLog snapshot through the WearLog provider. Accepting, saving, scheduling, spinning, or skipping must never count as a wear.

Whether an accepted unsaved result survives refresh/navigation is unresolved. The simplest MVP is session-only acceptance state with an explanation that the result is not saved unless the user chooses Save.

## 5. Sequential slot interaction specification

### Timing and controls

These are design starting points, not existing behavior:

- Keep each stop brief, roughly 350–500 ms per revealed slot, with a total sequence around 2–3 seconds for a normal result.
- Provide a visible progress cue and a `Reveal all`/`Skip animation` control.
- Disable duplicate SPIN submissions while engine generation is running.
- If the user requests another spin during animation, either queue one replacement after the current result or offer an explicit `Stop and spin again` action. Do not silently interleave two animations.
- Generate the replacement result only when the new spin is accepted, then reveal its own precomputed result in order.
- Changing occasion, laundry status, or wardrobe while a result is animating should cancel that result or let it finish with a “wardrobe changed; spin again for an updated result” notice. Never persist a stale result as current without disclosure.
- Ensure reduced-motion preference skips or shortens movement while preserving the ordered reveal and announcements.
- On mobile, use a vertical stack or compact card list with images that fit narrow widths; keep SPIN and skip/reveal controls reachable without obscuring the current item. Desktop can use a wider editorial composition. Preserve current Manrope, warm background, olive accents, card radius, and whitespace.

### Accessibility

- Use buttons with clear names and disabled/busy states.
- Announce each stop and the final result through a restrained `aria-live` region; avoid announcing every visual tick.
- Respect `prefers-reduced-motion`.
- Preserve keyboard operation and focus after modals/actions.
- Provide text equivalents for image-only slot changes and clear empty/error messages.

## 6. Gacha engine specification

### Suggested structure and boundaries

Add a pure domain module, for example:

- `lib/gacha/gacha-types.ts`
- `lib/gacha/gacha-engine.ts`
- `lib/gacha/outfit-compatibility.ts`
- `lib/gacha/gacha-engine.test.ts` if an approved test runner is selected
- `lib/weather/weather-types.ts` and a provider adapter only when weather retrieval is separately approved

The engine must not import React, browser APIs, IndexedDB helpers, image hooks, or provider contexts. It accepts plain values and returns a result or a typed no-result reason. UI owns timing and animation. Weather retrieval remains an injected boundary.

### Suggested types

Illustrative only; do not treat as implemented API:

```ts
type Occasion = 'work' | 'casual' | 'date' | 'home' | 'sport' | 'special-event'

type WeatherStatus = 'available' | 'unavailable' | 'stale'

interface WeatherSnapshot {
  status: WeatherStatus
  temperatureC?: number
  precipitation?: 'none' | 'possible' | 'rain' | 'snow'
  observedAt?: string
  locationLabel?: string
  source?: string
}

interface GachaInput {
  wardrobe: readonly ClothingItem[]
  wearLogs: readonly WearLog[]
  occasion: Occasion
  weather: WeatherSnapshot
  previousCompositionKeys: readonly string[]
  random: () => number
  spinId: string
  generatedAt: string
}

interface GachaResult {
  spinId: string
  mode: 'separates' | 'dress'
  itemIds: readonly string[]
  slots: readonly {
    slot: 'top' | 'bottom' | 'dress' | 'shoes' | 'outerwear' | 'bag' | 'accessories'
    itemIds: readonly string[]
  }[]
  compositionKey: string
  occasion: Occasion
  weatherStatus: WeatherStatus
  suitability: 'verified' | 'partial' | 'unknown'
  reasons: readonly string[]
  generatedAt: string
}

type GachaOutcome =
  | { kind: 'ready'; result: GachaResult }
  | { kind: 'no-valid-outfit'; missingCategories: readonly ClothingCategory[]; reason: string }
```

Final type shape should be narrowed to the approved product rules. Do not add these fields to IndexedDB records without a separately reviewed migration.

### Candidate filtering

1. Use only `WardrobeProvider.items`, the current records. Do not use the bundled seed array as a fallback after initialization.
2. Validate required record properties and supported categories before selection. Provider loading errors should be surfaced to the UI, not translated into “empty wardrobe.”
3. Exclude every item with `status === 'In laundry'`. `Worn recently` is not a laundry state and should not be excluded by that label alone.
4. Do not apply a price or brand filter. Unknown/zero price does not mean unsuitable or free.
5. Do not use saved outfit IDs as if they were clothing IDs. No candidate can be inferred from a missing reference.
6. Keep clothing records with a missing photo eligible if their record/category is otherwise valid; use the existing image-unavailable fallback. Image readiness should not silently eliminate clothing from an outfit.
7. Apply explicit structural and metadata compatibility filters before generating a result.
8. If no valid base remains, return `no-valid-outfit` with exact missing/unavailable categories and a link/action to Closet. Never produce a partial result and label it complete.

### Outfit composition and validation

The extracted pure validator is shared by manual creation and Gacha, while retaining a distinct strict generation rule:

- Exactly one base mode: one Dress, or one Top plus one Bottom.
- Never Dress with Top or Bottom.
- One item maximum for each single-item slot (Top, Bottom, Dress, Outerwear, Shoes, Bag).
- Zero or more Accessories, with no duplicate item IDs.
- No item ID repeated across slots; each resolved item's `category` must match its slot.
- No missing or invalid IDs in a generated result.
- Only `Available` and `Worn recently` items can pass the laundry hard exclusion.

The existing Studio validator allows optional shoes and outerwear. The engine strongly prioritizes shoes but does not make them a structural requirement; shoe readiness is explicit in the result.

For any combination, base, layers, and optional items are validated as one unit. Do not choose a top, then independently choose a bottom without checking the combined outfit.

### Generation, scoring, randomness

- Build dress and top-bottom base candidates from currently eligible wardrobe records. Validate the bases and each final candidate with `validateStrictOutfit`.
- The current implementation enumerates valid base combinations, applies optional-item and shoe selection, then prefers a non-repeated composition and minimizes recently worn item reuse.
- Keep any combination scoring deterministic for fixed input and injected random value. Initial scoring should be deliberately simple: hard constraints first, then explicit compatibility, then anti-repeat/soft preferences. Do not claim machine learning.
- Use an injectable random source so unit tests can reproduce results. Invalid or throwing RNG values safely fall back to a deterministic value and produce a warning.
- Current base enumeration grows with the top-by-bottom Cartesian product; a bounded sampling strategy may be needed for unusually large wardrobes.
- The engine returns selected IDs, resolved records, base composition, occasion/weather context, shoe readiness, anti-repeat diagnostics, and warnings. It does not create a persistent result identity.
- Generate and validate the final IDs before animation starts. The animation can display harmless visual cycling, but the selected IDs and final saved/accepted result must not change during reveal.

### Repeated spins and anti-repeat

The engine accepts caller-provided recently worn item IDs and prior composition IDs, preferring a different full composition and then minimizing recently worn item reuse. If no alternative exists, it may repeat and reports relaxed anti-repeat constraints. It does not read WearLogs or Calendar directly; a future UI/provider adapter must derive history from confirmed WearLogs, never planned calendar entries.

Build historical item IDs from each WearLog's snapshot `clothingItemId` set, not just `outfitId`: unsaved Gacha results may not have a saved Outfit record, while deleted clothing remains represented by wear snapshots. Define a lookback period and relaxation behavior as product settings before wiring history to the UI.

## 7. Weather, occasion, and laundry rules

### Weather interface and honest fallback

There is no current weather source, location setting, or weather compatibility metadata. A future adapter should expose an interface similar to:

```ts
interface WeatherProvider {
  getCurrentWeather(input: {
    location?: { latitude: number; longitude: number }
  }): Promise<WeatherSnapshot>
}
```

The provider should return explicit unavailable/stale states, observation time, source, and location label. It should not be coupled to Gacha's selection algorithm. Location acquisition/permission, provider choice, privacy disclosure, forecast horizon, and units are unresolved.

Current `seasons` values (`Spring`, `Summer`, `Fall`, `Winter`, `All season`) are broad labels, not temperature or precipitation data. Do not use them to claim a garment is warm, waterproof, safe in rain, or appropriate at a particular temperature.

Proposed compatibility outcomes are three-valued: `compatible`, `incompatible`, and `unknown`.

- Exclude only an explicitly incompatible item when sufficient observed weather and item metadata exist.
- Do not infer rain resistance, insulation, breathability, or footwear traction from brand, price, name, or season string.
- If weather is unavailable, continue Gacha with `weatherStatus: 'unavailable'`, no weather-based score, and copy such as “Weather unavailable — outfit selected from your wardrobe without a weather check.”
- The current engine accepts `available`, `unavailable`, or `not-checked` weather context, returns it unchanged, and does not infer suitability or block generation based on that state.
- If weather is available but the wardrobe lacks relevant item metadata, label suitability unknown/partial; do not say “weather-safe.”
- Weather thresholds, precipitation-probability thresholds, and location handling must be configurable/product-approved, not silently hard-coded.

To meet the product's strict “weather suitable” requirement, additional clothing metadata is required. Candidate fields to review include thermal/layering level, temperature range, rain protection, and wet-weather footwear suitability. The minimum model and defaults require product approval and a versioned IndexedDB migration; they are not present today.

### Occasion model

The engine accepts Work, Casual, Date, Home, Sport, and Special event as context. No current category/style value is an occasion classification, and the engine does not filter or score clothing by occasion.

Minimum proposed optional per-item metadata:

- `occasionTags`: zero or more explicit values from the approved occasion enum.
- Missing/empty tags represent `unknown` compatibility, not a negative match.

Unknown items should remain eligible for general occasions by default, with no positive suitability claim. Explicitly incompatible items may be excluded only after the user has tagged them or an approved, transparent rule exists. Avoid requiring users to classify every existing clothing item before their first spin. Product must decide whether to offer lightweight optional tags during add/edit or a later “refine your recommendations” action.

This field would require an IndexedDB schema/model migration in a future implementation. It must not be added as part of this specification task.

### Laundry

`In laundry` is a hard exclusion for every slot and every spin. The future UI must pass current provider state into the engine so a status change immediately affects eligibility. Do not add a separate availability store. The Closet detail sheet already exposes a status control backed by `WardrobeProvider.updateItem`.

## 8. Feedback and future personalization

MVP records only actual wears through WearLogs. It does not persist Spin, Skip, Accept, or Like as a wear or as a preference.

Later feedback could add explicit events:

- `accepted` for the chosen result.
- `skipped` for a rejected result.
- Optional `liked`/`disliked` feedback.
- `confirmed-worn` remains a WearLog, not a spin event.

Do not infer dislike from every spin-again action; it may reflect exploration. Do not infer that an accepted result was worn.

Future ranking can combine, in order:

1. Hard constraints (valid composition, laundry, explicit incompatibilities).
2. Avoid the most recent exact composition where alternatives exist.
3. Recent confirmed wear counts using `countWearsByClothingItem` and `countWearsByOutfit`.
4. Explicit accepted/liked feedback.
5. Soft occasion/weather matches.

WearLogs can support confirmed item frequency and historical outfit/item composition because they preserve item ID snapshots and outfit ID/name. They do not represent accepted/skipped results and do not provide actual item images or the user's reason for skipping. Any new feedback persistence needs its own privacy/retention decision and, if stored in IndexedDB, a separately reviewed schema migration.

## 9. Home and navigation recommendations

Recommended hierarchy:

1. **Home (`/`) — Daily Gacha:** occasion/weather context and the primary SPIN action; sequential reveal/result. Keep a compact route to manual creation and lower-page recent wear context.
2. **Closet (`/closet`) — inventory:** add/edit/delete clothing, status control including laundry, image management, optional occasion/weather metadata later.
3. **Create (`/create`) — manual composition:** retain Outfit Studio for users who want direct control.
4. **Outfits (`/outfits`) — saved collection:** saved/reusable combinations from both manual creation and an explicit Gacha save.
5. **Calendar (`/calendar`) — planning and confirmation:** schedule saved outfits and explicitly confirm actual wear.
6. **Profile (`/profile`) — statistics, preferences, and any separately scoped account controls.**

Emphasize Home in mobile/desktop navigation and stop emphasizing Create as the default primary action. Keep the existing route structure and other destinations; this is a hierarchy recommendation, not a request for routing complexity or a shell redesign.

## 10. MVP scope and prioritization

### MVP — required for a useful first release

- A pure Gacha engine based on real provider wardrobe records.
- Full-result validation before sequential reveal.
- Dress vs Top + Bottom structural exclusion.
- Hard `In laundry` filtering.
- Occasion selector with an approved unknown-metadata fallback.
- A weather status/context panel with honest unavailable fallback. No live weather claim until a weather source and item metadata can support it.
- Sequential slot reveal, reduced-motion behavior, stop/skip control, and mobile/desktop layout.
- Spin again with immediate duplicate avoidance where alternatives exist.
- Accept distinct from saving, scheduling, or actual wear.
- Explicit save through OutfitProvider and optional explicit schedule through CalendarProvider.
- Actual WearLog creation only after a separate confirmation action.
- Clear empty and missing-category states based on the user's actual wardrobe.
- Make laundry status editable through existing wardrobe APIs.

**Important dependency:** the strict weather suitability requirement cannot be fully delivered using the current source model. MVP may expose weather availability and a transparent unverified mode, but release wording must not claim weather-aware suitability until a provider and sufficient item data exist. Product must decide whether this limitation is acceptable for the first release.

### Next iteration

- Approved live weather source, user location flow, freshness policy, thresholds, and clothing suitability metadata.
- Anti-repeat over a product-defined period using WearLog snapshot compositions.
- Accepted/skipped feedback and conservative preference weighting.
- Better ranking and concise, evidence-based explanations.

### Later

- Personalized recommendations beyond explicit feedback and straightforward wear counts.
- Advanced style/occasion preferences.
- Cloud sync and multi-device state, based on the separate reviewed cloud architecture.
- 3D visualization only after the 2D Gacha experience is stable; it is not part of this specification or MVP.

## 11. Suggested technical architecture

### Pure domain

- Extract a pure shared composition validator from `components/create/outfit-studio.tsx` into `lib/` and test it independently.
- Add `lib/gacha/gacha-engine.ts` with candidate filtering, feasible-mode construction, complete composition selection, anti-repeat of current session result, and typed outcomes.
- Keep `lib/gacha` independent of React, IndexedDB, animation, weather network calls, and image loading.
- Add a weather provider interface in a separate module. A fake/test implementation may be used in tests only, never shown as production weather.
- Keep occasion/weather metadata optional in early UX; any record-shape extension requires a separately approved database migration.

### React integration

- Add a Home Gacha feature component or hook that reads `items`, `logs`, `addOutfit`, `addWearLog`, and optionally `addEntry` from the existing providers.
- Keep animation phases/results in component or feature state, not in the engine or provider persistence layer.
- Maintain one immutable `GachaResult` for a spin. During animation, update only the visible/revealed slot index.
- On spin errors, retain the prior valid result and show a useful message. On `no-valid-outfit`, show exact missing categories and a Closet action.
- Resolve each image using existing `OutfitClothingPhoto`/`useClothingImage` behavior; never put Blobs in an Outfit or Gacha result.

### Persistence behavior

- Spin result: memory-only by default; no new DB store for the MVP.
- Accepted result: memory-only unless the user chooses Save or Schedule. Do not create a WearLog.
- Save: call `OutfitProvider.addOutfit` with selected clothing IDs and an explicit name.
- Schedule: require a saved outfit ID and valid date through the current Calendar provider.
- Confirm actual wear: snapshot current result IDs/names/categories/brands/prices and call `addWearLog` with `calendarEntryId: null`, a unique non-empty result ID in `outfitId`, and null/unknown values handled using existing WearLog rules. For a result already saved as an Outfit, use its saved ID; do not invent a second identity.
- If a future implementation wants accepted results or feedback to survive refresh, review a persistence design separately. Never silently change IndexedDB version as part of this UI work.

### Error and empty-state behavior

- Wardrobe provider load failure is an error state, not an empty wardrobe.
- Distinguish no clothing at all, incomplete base categories, all required items in laundry, stale/unavailable weather, and a valid result with unavailable images.
- Never fall back to `closetItems` after provider loading or generation fails.
- A failed outfit save/schedule/wear write must not show success or discard the current result. Existing provider writes are awaitable; await them.

### Testing

No test-runner dependency is declared in `package.json`. Engine tests use Node's built-in test runner and the already-installed TypeScript compiler without adding a package. Future UI/integration tests should cover:

- Each category and the exact dress-vs-separates rules.
- Laundry exclusion and all-required-category empty states.
- Missing/invalid item IDs and category mismatch.
- Optional and multiple accessories.
- Optional outerwear/bag inclusion.
- Unknown occasion/weather metadata and explicit incompatible tags.
- Result determinism for fixed candidates/random input.
- Immediate repeat avoidance and the one-valid-combination fallback.
- The animation consumes a fixed result and cannot alter item IDs.
- Accept/skip/spin never write WearLogs; explicit wear confirmation writes one snapshot only.
- Saved outfits contain IDs only, and scheduled entries remain distinct from actual wear.

Browser verification should cover real IndexedDB-backed provider integration, image fallback, refresh behavior for saved records, mobile/desktop layout, and reduced motion.

## 12. Implementation task breakdown

Tasks are ordered by dependency; product decisions in section 13 should be resolved before implementing the affected behavior.

1. **Confirm remaining product rules:** decide occasion default behavior, optional-slot preference, weather release claims, accept persistence, and result naming. Engine shoes are prioritized but not mandatory.
2. **Expose laundry management:** complete. The Closet status control uses `WardrobeProvider.updateItem`; the future Gacha UI must pass current provider records to each generation.
3. **Extract shared composition rules:** complete. Manual Studio uses the pure validator, retaining its missing-reference edit behavior; strict validation rejects unresolved or incompatible generated references.
4. **Add engine types and tests:** complete. `generateGachaOutfit` accepts provider data and context, applies shared strict validation, and returns deterministic candidates or typed failures. Bounded sampling remains a future optimization for unusually large wardrobes.
5. **Add Gacha Home flow:** add occasion and weather state, SPIN, sequential presentation, cancellation/skip behavior, accessibility, and responsive result layout.
6. **Wire explicit actions:** implement accept as non-wear state, save via OutfitProvider, schedule via CalendarProvider, and later confirm-worn via WearLog snapshots.
7. **Add approved metadata/weather integration:** only after model, location/privacy, provider, and migration decisions are reviewed. Keep graceful fallback for offline/unavailable weather.
8. **Validate and release:** verify strict combinations, real wardrobe sourcing, persistence distinctions, responsive and reduced-motion behavior, and no regression to manual Studio, calendar, collection, profile, or PWA.

## 13. Risks and unresolved product decisions

1. **Are shoes mandatory?** Resolved for the engine: shoes are strongly prioritized and included when eligible, but a shoe-less result remains structurally valid and clearly marked.
2. **What does Accept mean across sessions?** No current model represents a selected-for-today outfit. Recommended MVP: accept in memory; explicit Save/Calendar actions provide persistence.
3. **What counts as a complete outfit?** The engine requires the validated base, strongly prioritizes shoes, and keeps bags, outerwear, and accessories optional. UI copy should preserve the explicit missing-shoes state.
4. **How should the occasion selector default?** Require explicit selection, default to Casual, or remember the last choice. No existing preference model exists.
5. **What is the weather source and privacy model?** No source or location exists. Decide browser geolocation vs user-entered location, provider, permissions, freshness, units, and offline behavior.
6. **Can MVP claim weather suitability?** No, not from existing data. The source has no temperature, rain protection, or shoe-weather metadata. Either accept honest “weather unavailable/unverified” behavior initially or postpone a hard suitability promise.
7. **Which metadata can users tolerate entering?** Occasion and weather tags require UX and defaults. Missing values should not block first spin.
8. **How are weather thresholds defined?** Avoid embedded guesses. Approve configurable thresholds and explicit mapping from garment tags to conditions.
9. **How long should anti-repeat last?** Define a lookback window and behavior when filtering would leave too few combinations.
10. **Should a result persist after refresh?** Memory-only is simplest and avoids a schema change; persistent drafts need a reviewed design.
11. **How should an unsaved Gacha result be represented in WearLog?** `WearLog.outfitId` is required. Approve a unique Gacha result ID convention or require saving before confirming wear. Existing generic `addWearLog` supports direct snapshots; calendar-based recording does not.
12. **Seed data lacks dresses and has only one accessory.** Decide whether onboarding should explain this limitation or later add useful seed examples. Do not add synthetic candidates inside the engine.
13. **How should status “Worn recently” be interpreted?** It is a display/status enum, not automatically a confirmed wear. Only WearLogs are reliable actual wear history.
14. **Test infrastructure:** no test-runner dependency is declared; the engine currently uses built-in Node tests. Reassess only if the suite needs framework-specific integration.
15. **Documentation drift:** the cloud architecture document's v5/bulk-write descriptions need a separately scoped documentation update if that architecture is revisited; do not expand this Gacha task into unrelated cloud design work.

## 14. Scope confirmation

This document began as a read-only product audit. The pure validation and Gacha selection domain modules are now implemented separately; the UI, animation, weather integration, persistence changes, auth integration, and schema changes remain out of scope and unimplemented.
