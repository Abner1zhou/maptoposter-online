## Why

Users want to mark a personal location (home, favorite spot, current position) on their poster to make it more meaningful and personal. This is a frequently requested feature that transforms a generic city poster into a personal keepsake.

## What Changes

- Add a "My Location" toggle/option in the poster settings panel
- Allow users to click on the poster preview or enter coordinates to set their marker position
- Render a distinct pin/marker icon at the chosen location on the final poster
- Persist the marker position in user settings (localStorage)
- Support getting the user's current GPS position via the Geolocation API as a quick-set option

## Capabilities

### New Capabilities
- `my-location-marker`: Enables users to place a personal location pin on the poster, rendered as a distinct coordinate icon at the chosen or GPS-detected position

### Modified Capabilities

## Impact

- **UI**: Settings panel gets a new "My Location" section with coordinate input and GPS button
- **Rendering pipeline**: WASM renderer needs a new draw call for the marker icon (distinct from POI circles)
- **Config**: `MapTheme` or render config needs a marker position field
- **Worker**: Render worker needs to receive marker coordinates alongside existing data
- **WASM**: New rendering function for the coordinate pin icon in `renderer.rs`
