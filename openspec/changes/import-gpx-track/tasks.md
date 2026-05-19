## 1. GPX Parsing Utility

- [x] 1.1 Create `src/lib/gpx-parser.ts` — parse GPX XML with DOMParser, extract `<trkpt>` lat/lon from all `<trkseg>` elements, return `RoutePoint[]`
- [x] 1.2 Add file validation: reject non-GPX files and files >5MB
- [x] 1.3 Implement Douglas-Peucker simplification in `src/lib/gpx-parser.ts` — target 200–500 points, epsilon derived from bbox diagonal
- [x] 1.4 Add bbox calculation utility: return `{ center: {lat, lon}, radius }` from a `RoutePoint[]` with 15% padding

## 2. App State & UI

- [x] 2.1 Add `trackPoints` state (`RoutePoint[] | null`) and `trackFileName` state to `App.tsx`
- [x] 2.2 Add GPX import handler: read file → parse → simplify → set state → auto-fit viewport (override `location` and `baseRadius`)
- [x] 2.3 Add track clear handler: reset `trackPoints` to null
- [x] 2.4 Wire `showRoute` and `routePoints` props to `MapPosterPreview` in `App.tsx` (currently scaffolded but unused)
- [x] 2.5 Create `src/components/track-settings.tsx` — settings section with file upload input, filename display, and clear button
- [x] 2.6 Add track settings to config navigation (`ConfigNav`) with appropriate icon

## 3. Data Flow to Render Worker

- [x] 3.1 Extend `BinaryRenderConfig` in `wasm/src/lib.rs` with `track: Option<Vec<f64>>`, `track_start: Option<Vec<f64>>`, `track_end: Option<Vec<f64>>`
- [x] 3.2 In `App.tsx` generate flow: pack track points into Float64Array `[point_count, lat1, lon1, ...]` and add to worker transfers
- [x] 3.3 Update `worker.ts` to accept and forward track binary data to WASM render call

## 4. WASM Track Rendering

- [x] 4.1 Add `draw_track` method to `MapRenderer` in `wasm/src/renderer.rs` — accept binary track data, project points, build polyline PathBuilder, draw casing (bg color, wider) + main stroke (route color, ~1.5× motorway width)
- [x] 4.2 Add `draw_track_markers` method to `MapRenderer` — draw green circle at start, red circle at end, or half-green/half-red if coincident (within 0.0001 degrees)
- [x] 4.3 Insert track rendering call in `render_map_binary_internal` between draw_roads and draw_pois blocks
- [x] 4.4 Rebuild WASM: run `bun run build:wasm` (requires Rust + wasm-pack + PowerShell)

## 5. Preview Integration

- [x] 5.1 Ensure `showRoute` prop triggers route layer visibility in `MapPosterPreview`
- [x] 5.2 Add start/end circle markers to the MapLibre preview (circle layers on `route-source` or separate source)
- [x] 5.3 Update `applyThemePaintProperties` to sync route color with `theme.route`

## 6. Edge Cases & Polish

- [x] 6.1 Handle track with <2 points gracefully (show error, don't render)
- [x] 6.2 Handle track outside current viewport (acceptable — user can re-import)
- [x] 6.3 Ensure track data is NOT persisted to localStorage (confirm save/load logic)
- [x] 6.4 Verify track renders correctly on different poster sizes and themes
