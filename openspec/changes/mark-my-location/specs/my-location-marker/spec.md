## ADDED Requirements

### Requirement: Toggle my location marker
The system SHALL provide a toggle in the settings panel that enables or disables rendering of a "My Location" marker on the poster. When disabled, no marker SHALL appear on the rendered poster.

#### Scenario: User enables the marker
- **WHEN** user toggles the "My Location" switch ON and has set coordinates
- **THEN** the system SHALL include the marker in the next poster generation

#### Scenario: User disables the marker
- **WHEN** user toggles the "My Location" switch OFF
- **THEN** the system SHALL render the poster without the marker, regardless of saved coordinates

### Requirement: Auto-detect user position via Geolocation API
The system SHALL provide a button that requests the user's current GPS position using the browser Geolocation API and sets it as the marker position.

#### Scenario: Geolocation succeeds
- **WHEN** user clicks the "Use My Location" button and the browser returns a position
- **THEN** the system SHALL populate the lat/lng fields with the detected coordinates

#### Scenario: Geolocation denied or unavailable
- **WHEN** user clicks the "Use My Location" button and the browser denies or cannot provide a position
- **THEN** the system SHALL display an error message and leave the lat/lng fields unchanged

### Requirement: Manual coordinate input
The system SHALL allow users to manually enter latitude and longitude values for the marker position.

#### Scenario: User enters valid coordinates
- **WHEN** user types valid latitude (-90 to 90) and longitude (-180 to 180) values
- **THEN** the system SHALL accept and store those coordinates for the marker

#### Scenario: User enters invalid coordinates
- **WHEN** user types latitude or longitude outside valid ranges
- **THEN** the system SHALL not crash and SHALL use the last valid values

### Requirement: Render marker icon on poster
The system SHALL render a distinct pin/marker icon at the specified coordinates on the poster during WASM rendering. The marker SHALL be visually distinct from POI circles and use the theme's text color.

#### Scenario: Marker within poster bounds
- **WHEN** the marker coordinates fall within the rendered map area and the marker toggle is ON
- **THEN** the system SHALL draw a pin icon at the projected screen position, drawn after POIs and before gradients/text

#### Scenario: Marker outside poster bounds
- **WHEN** the marker coordinates fall outside the rendered map area
- **THEN** the marker SHALL be clipped (not visible) without affecting other rendering

### Requirement: Persist marker settings
The system SHALL persist the marker enabled state and coordinates to localStorage as part of the existing `maptoposter_config` key, and restore them on page load.

#### Scenario: User reloads the page
- **WHEN** user reloads the browser with marker enabled and coordinates set
- **THEN** the system SHALL restore the marker toggle state and saved coordinates
