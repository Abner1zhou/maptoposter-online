## ADDED Requirements

### Requirement: Track line rendering in preview
The system SHALL render the imported track as a LineString on the MapLibre GL preview map using the existing route rendering infrastructure (`route-source`, `route-line`, `route-line-casing` layers). The track line SHALL use `theme.route` color with a width of 4px, and the casing SHALL use `theme.bg` color with a width of 9px.

#### Scenario: Track imported with route points
- **WHEN** a GPX file is imported and simplified to RoutePoints
- **THEN** the MapLibre preview renders the track as a GeoJSON LineString with casing + main line using the `showRoute` and `routePoints` props

#### Scenario: No track imported
- **WHEN** no GPX file has been imported
- **THEN** the preview renders no track line

### Requirement: Track line rendering in WASM poster
The system SHALL render the track line on the final poster PNG in the WASM renderer. The track SHALL be drawn between the roads layer and the POIs layer. The track SHALL use tiny-skia PathBuilder to build a polyline from projected track coordinates. The line SHALL have a casing (wider stroke in background color) and a main stroke in `theme.route` color. The line width SHALL be approximately 1.5× the motorway width scale to ensure visibility.

#### Scenario: Track data present in render config
- **WHEN** the render worker receives track binary data alongside roads/water/parks
- **THEN** the WASM renderer projects all track points, builds a polyline path, and draws casing + main stroke between roads and POIs

#### Scenario: No track data in render config
- **WHEN** no track data is provided to the render worker
- **THEN** the renderer skips the track drawing step entirely

### Requirement: Start marker rendering
The system SHALL draw a filled green circle (#22C55E) at the first track point's projected position. The circle radius SHALL be 6px × render_scale.

#### Scenario: Track with distinct start and end points
- **WHEN** track data is present and the first point differs from the last point
- **THEN** a solid green circle is drawn at the start point position

#### Scenario: No track data
- **WHEN** no track data is present
- **THEN** no start marker is drawn

### Requirement: End marker rendering
The system SHALL draw a filled red circle (#EF4444) at the last track point's projected position. The circle radius SHALL be 6px × render_scale.

#### Scenario: Track with distinct start and end points
- **WHEN** track data is present and the last point differs from the first point
- **THEN** a solid red circle is drawn at the end point position

#### Scenario: No track data
- **WHEN** no track data is present
- **THEN** no end marker is drawn

### Requirement: Coincident start/end marker
When the start and end points are within 10 meters of each other (epsilon ~0.0001 degrees), the system SHALL draw a single circle with the left half in green (#22C55E) and the right half in red (#EF4444) at the shared position.

#### Scenario: Marathon loop route (start == end)
- **WHEN** track data is present and the first and last points are within 10 meters
- **THEN** a single half-green/half-red circle is drawn at the position, rendered as two half-circle arcs

### Requirement: Track data transfer to render worker
The system SHALL pass track point data to the render worker as a Float64Array in the format `[point_count, lat1, lon1, lat2, lon2, ..., latN, lonN]`. The array SHALL be transferred as a Transferable object for zero-copy performance. The render config JSON SHALL include `track_start: [lat, lon]` and `track_end: [lat, lon]` for marker positioning.

#### Scenario: Generating poster with track
- **WHEN** user clicks generate with a track imported
- **THEN** track points are packed into a Float64Array and transferred to the render worker alongside roads/water/parks data, with start and end coordinates in the config JSON
