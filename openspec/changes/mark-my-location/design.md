## Context

MapPoster renders city maps as printable posters. The rendering pipeline is: React UI → data worker (fetch OSM data) → render workers (WASM processing) → final PNG via tiny-skia. Currently, POIs are rendered as simple colored circles. There is no concept of a "user marker" — all points are generic OSM POIs.

The WASM render config (`BinaryRenderConfig` in `wasm/src/lib.rs`) already supports POIs via a `pois` field (`Vec<f64>`). The render pipeline draws them after roads but before gradients and text.

## Goals / Non-Goals

**Goals:**
- Let users toggle a "My Location" marker on/off
- Auto-detect user's GPS position via browser Geolocation API
- Allow manual lat/lng input
- Render a distinct pin/marker icon (not a simple circle like POIs) at the chosen position on the poster
- Persist the marker state and coordinates in localStorage

**Non-Goals:**
- Drag-and-drop marker placement on the preview (can be added later)
- Multiple markers / labeled markers
- Custom marker icon styles

## Decisions

### 1. Pass marker coordinates through the existing `BinaryRenderConfig`

Add a `my_location: Option<[f64; 2]>` field to `BinaryRenderConfig` in `wasm/src/lib.rs`. The marker is a single optional `[lat, lon]` pair — much simpler than POIs which are an array.

**Alternative**: Reuse the POI array and tag one entry as "my location". Rejected because POIs use a flat binary format with spacing deduplication logic that could remove the user's marker.

### 2. Draw the marker as a simple geometric pin in WASM

In `renderer.rs`, add a `draw_my_location_marker(lat, lon)` method that:
1. Projects `(lon, lat)` to screen coordinates via `world_to_screen`
2. Draws a pin shape: a filled circle (bottom-rounded) + a triangle pointer pointing down, using the theme's `text` color (matches poster style)

**Alternative**: Draw in the React canvas overlay. Rejected because the poster must be a single PNG — anything not rendered in WASM won't appear in the download.

### 3. UI: Add a "My Location" section in settings

A new `MyLocationSettings` component with:
- Toggle switch to enable/disable the marker
- "Use My Location" button (calls `navigator.geolocation.getCurrentPosition`)
- Lat/Lng input fields for manual entry
- Place it as a new card in the settings sidebar, similar to `TextDisplaySettings`

### 4. State management: add to App.tsx local state + localStorage

Add `myLocation: { lat: number; lng: number } | null` and `showMyLocation: boolean` to App.tsx state. Persist alongside existing `maptoposter_config` in localStorage.

## Risks / Trade-offs

- **Geolocation API may be blocked or unavailable** → Show a clear error message, user can still manually enter coordinates
- **Marker at poster edge** → WASM should clip to canvas bounds; marker will just be partially visible or hidden — acceptable behavior
- **WASM recompile required** → Adding a field to `BinaryRenderConfig` and a new draw method needs `bun run build:wasm`. This is expected but means the change touches Rust code.
