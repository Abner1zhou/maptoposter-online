## ADDED Requirements

### Requirement: GPX file upload
The system SHALL provide a file upload control in the settings panel that accepts `.gpx` files. The system SHALL reject files larger than 5MB with an error message.

#### Scenario: User uploads a valid GPX file
- **WHEN** user selects a `.gpx` file under 5MB via the file upload control
- **THEN** the system parses the file and extracts track points as an array of `{lat, lon}` objects

#### Scenario: User uploads a file that is too large
- **WHEN** user selects a `.gpx` file larger than 5MB
- **THEN** the system displays an error message indicating the file is too large

#### Scenario: User uploads an invalid file
- **WHEN** user selects a file that is not a valid GPX file
- **THEN** the system displays an error message indicating the file format is invalid

### Requirement: GPX parsing
The system SHALL parse GPX files using the browser's native `DOMParser`. The system SHALL extract all `<trkpt>` elements' `lat` and `lon` attributes from `<trkseg>` elements. If multiple `<trkseg>` elements exist, the system SHALL concatenate them in document order.

#### Scenario: GPX file with a single track segment
- **WHEN** user uploads a GPX file containing one `<trkseg>` with N `<trkpt>` elements
- **THEN** the system produces an array of N `{lat, lon}` points in order

#### Scenario: GPX file with multiple track segments
- **WHEN** user uploads a GPX file containing multiple `<trkseg>` elements
- **THEN** the system concatenates all segments' points in document order into a single array

#### Scenario: GPX file with no track points
- **WHEN** user uploads a GPX file containing zero `<trkpt>` elements
- **THEN** the system displays an error indicating no track data was found

### Requirement: Point simplification
The system SHALL simplify the extracted track points using the Douglas-Peucker algorithm to reduce point count while preserving visual fidelity. The target is 200–500 points maximum.

#### Scenario: Track with more than 500 points
- **WHEN** parsed track contains more than 500 points
- **THEN** the system simplifies to approximately 200–500 points using Douglas-Peucker with an epsilon derived from the track bounding box

#### Scenario: Track with 500 or fewer points
- **WHEN** parsed track contains 500 or fewer points
- **THEN** the system uses all points without simplification

### Requirement: Auto-fit viewport on GPX import
The system SHALL automatically adjust the poster's center coordinates and radius to fit the imported track's bounding box with 15% padding. This SHALL override the current center and radius values.

#### Scenario: GPX track imported successfully
- **WHEN** a GPX file is parsed and simplified
- **THEN** the system calculates the bounding box of all track points, sets the center to the midpoint, and sets the radius to `max(width, height) / 2 × 1.15`

#### Scenario: User imports a new GPX after viewport change
- **WHEN** user has manually adjusted the viewport and imports a new GPX file
- **THEN** the system overrides the viewport to fit the new track's bounding box

### Requirement: Ephemeral track state
The system SHALL NOT persist track point data to localStorage. The system SHALL only persist a boolean flag indicating whether a track was previously imported. On page reload, the user SHALL need to re-upload the GPX file.

#### Scenario: Page reload after GPX import
- **WHEN** user reloads the page after importing a GPX file
- **THEN** the track is cleared and the user must re-upload the file

#### Scenario: User clears the track
- **WHEN** user removes or replaces the GPX file
- **THEN** the track data is cleared from state and the preview updates to show no track
