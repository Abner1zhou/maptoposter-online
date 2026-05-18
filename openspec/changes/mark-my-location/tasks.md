## 1. WASM: Add marker rendering support

- [x] 1.1 Add `my_location: Option<[f64; 2]>` field to `BinaryRenderConfig` in `wasm/src/lib.rs`
- [x] 1.2 Add `draw_my_location_marker(&mut self, lat: f64, lon: f64)` method to `MapRenderer` in `wasm/src/renderer.rs` — project coords, draw a pin shape (filled circle + downward triangle) using theme text color
- [x] 1.3 Call `draw_my_location_marker` in `render_map_binary_internal` after POIs, before gradients, when `config.my_location` is `Some`
- [x] 1.4 Rebuild WASM with `bun run build:wasm`

## 2. UI: Add MyLocationSettings component

- [x] 2.1 Create `src/components/my-location-settings.tsx` with toggle, GPS button, and lat/lng inputs
- [x] 2.2 Add i18n message keys in `project.inlang/` for the new UI strings (label, button, error)
- [x] 2.3 Compile i18n messages

## 3. State: Wire up marker state in App.tsx

- [x] 3.1 Add `myLocation: { lat: number; lng: number } | null` and `showMyLocation: boolean` state to App.tsx
- [x] 3.2 Add `myLocation` to the render config JSON (pass `[lat, lng]` when `showMyLocation` is true and coordinates are set)
- [x] 3.3 Persist and restore `myLocation` + `showMyLocation` in localStorage under `maptoposter_config`

## 4. Integration

- [x] 4.1 Render `<MyLocationSettings />` in the settings sidebar of App.tsx
- [x] 4.2 Test: enable marker → generate poster → verify pin appears at correct position
- [x] 4.3 Test: GPS button → verify coordinates populate (or error shown)
- [x] 4.4 Test: reload page → verify settings persist
