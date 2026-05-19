## Context

MapPoster renders city maps as artistic posters using a two-worker pipeline (data worker + render worker) with a Rust/WASM rendering engine. The MapLibre preview already has scaffolded route rendering code (`RoutePoint` interface, `showRoute` prop, GeoJSON LineString layers with casing) but it is not wired to App.tsx. The WASM renderer draws layers in order: background → water → parks → roads → POIs → gradients → my_location marker → text. Road drawing uses tiny-skia's `PathBuilder` for efficient polyline rendering with casing.

## Goals / Non-Goals

**Goals:**
- Parse GPX files client-side and display the track on both preview and final poster
- Auto-fit viewport to track bounds on import
- Render track with start/end circle markers (green start, red end, half-and-half if coincident)
- Keep track data ephemeral (no localStorage persistence of points)

**Non-Goals:**
- Import from Strava/Garmin URLs or other platforms
- Manual route drawing on the map
- Multiple track support per poster
- Custom track color picker (use `theme.route`)
- Track statistics display (distance, elevation, pace)

## Decisions

### 1. GPX parsing on main thread (no worker)

GPX files for a marathon are typically 100KB–2MB with ~5000–10000 track points. XML parsing + point extraction + Douglas-Peucker simplification runs in <100ms on main thread. Not worth the worker communication overhead.

**Alternative considered**: Parse in data worker — rejected because the data worker's protocol is designed for map data fetching, not file import. Adding a new message type for GPX parsing would overcomplicate the worker contract.

### 2. Douglas-Peucker point simplification

Simplify to ~500 points max. This is more than enough for visual fidelity at poster resolution (typically 3000–6000px) while keeping the binary payload small (~8KB as Float64Array).

**Algorithm**: Recursive Douglas-Peucker with epsilon calculated from track bounding box diagonal. Target: 200–500 points.

### 3. Track binary format

```
Float64Array: [point_count, lat1, lon1, lat2, lon2, ..., latN, lonN]
```

Same flat array pattern as POIs. Passed to render worker as part of config JSON (small enough) or as a separate Float64Array transferable. Since ~500 points × 2 doubles = 8KB, embedding in config JSON is acceptable but using a separate Float64Array transferable is more consistent with existing patterns.

**Decision**: Use a separate Float64Array transferable, consistent with how roads/water/parks are passed.

### 4. Track rendering insertion point

Insert track drawing between roads and POIs in the WASM rendering pipeline:

```
background → water → parks → roads → TRACK → POIs → gradients → my_location → text
```

This ensures the track is visible above roads but below POIs and text. The track casing uses the background color, making it stand out against any underlying road.

### 5. Start/end marker rendering

Draw as filled circles using tiny-skia's `Paint` + `PathBuilder::from_circle`. Radius: 6px × render_scale (visible but not overwhelming at poster resolution).

- Start: solid green circle (#22C55E)
- End: solid red circle (#EF4444)
- Coincident: clip left half to green, right half to red (draw green full circle, then overlay red right half using tiny-skia clip or two arc paths)

**Implementation**: Draw two half-circle arcs for the coincident case. Simpler than clipping and produces clean edges.

### 6. Auto-fit viewport calculation

From the track's bounding box (min/max lat/lon):
1. Calculate center = midpoint of bbox
2. Calculate radius = max(bbox_width, bbox_height) / 2, with 15% padding
3. Override `location` (center lat/lon) and `baseRadius` in App.tsx state
4. Do NOT change city/country selection (user may still want that context)

The radius padding ensures the track doesn't touch the poster edges.

### 7. No new npm dependency for GPX parsing

GPX is simple XML. Parse with `DOMParser` (browser native) — extract `<trkpt>` elements with `lat`/`lon` attributes. No need for a GPX-specific library.

## Risks / Trade-offs

- **Large GPX files** (>10MB, ultra-long routes): DOMParser loads entire file into memory. Mitigation: reject files >5MB with a user-facing error.
- **Track outside poster bounds**: If user imports GPX then manually changes center/radius, track may be partially or fully off-screen. Mitigation: this is acceptable — user has control.
- **Coincident start/end detection**: Floating point comparison. Mitigation: use epsilon of ~10 meters (0.0001 degrees).
- **WASM rebuild required**: Adding track rendering to the Rust code means running `bun run build:wasm`. Mitigation: document this clearly in tasks.
