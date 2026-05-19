## Why

MapPoster currently renders city maps as artistic posters, but has no way to display personal routes or tracks. Marathon runners, cyclists, and hikers want to commemorate their routes by printing posters that show exactly where they went. This is a highly requested feature that transforms a generic city poster into a personal keepsake.

## What Changes

- Add GPX file upload UI in the settings panel as a new section
- Parse GPX files client-side to extract track points (lat/lon arrays)
- Simplify track geometry (Douglas-Peucker) to reduce point count for rendering
- Auto-fit the poster viewport (center + radius) to the track's bounding box on import
- Render track line on the MapLibre preview (wiring existing scaffolded `RoutePoint` + `showRoute` code)
- Render track line in the WASM renderer as a new draw layer (between roads and POIs)
- Draw start marker (green circle) and end marker (red circle); if coincident, draw a half-green/half-red circle
- Pass track data to the render worker via Float64Array binary format
- Extend `BinaryRenderConfig` with track points and start/end coordinates

## Capabilities

### New Capabilities
- `gpx-import`: Parse GPX files, extract track points, simplify geometry, auto-fit viewport
- `track-rendering`: Render track lines with start/end circle markers in both MapLibre preview and WASM final poster

### Modified Capabilities

## Impact

- **UI**: New "Track" settings section with file upload input
- **WASM renderer**: New `draw_track` and `draw_track_markers` methods in `renderer.rs`
- **Worker pipeline**: Track binary data passed alongside roads/water/parks to render worker
- **Config JSON**: `BinaryRenderConfig` gains `track`, `track_start`, `track_end` fields
- **Viewport**: `App.tsx` overrides `location` and `baseRadius` when GPX is imported
- **Dependencies**: New GPX parsing utility (lightweight, no external library needed)
- **State**: `trackPoints` state in `App.tsx`, not persisted to localStorage
