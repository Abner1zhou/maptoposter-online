import type { RoutePoint } from "@/components/artistic-map";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_POINTS = 500;
const COINCIDENT_EPSILON = 0.0001; // ~10 meters

export interface TrackViewport {
  center: { lat: number; lon: number };
  radius: number;
}

export function validateGpxFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".gpx")) {
    return "Invalid file format. Please upload a .gpx file.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 5MB.";
  }
  return null;
}

export function parseGpx(xmlString: string): RoutePoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file: XML parsing failed.");
  }

  const trkpts = doc.querySelectorAll("trkpt");
  if (trkpts.length === 0) {
    throw new Error("No track points found in GPX file.");
  }

  const points: RoutePoint[] = [];
  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute("lat") || "");
    const lon = parseFloat(pt.getAttribute("lon") || "");
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    points.push({ lat, lon });
  }

  if (points.length === 0) {
    throw new Error("No valid track points found in GPX file.");
  }

  return points;
}

export function simplifyTrack(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= MAX_POINTS) return points;

  // Calculate epsilon from bounding box diagonal
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  const diag = Math.sqrt((maxLat - minLat) ** 2 + (maxLon - minLon) ** 2);
  // Start with a fraction of diagonal and bisect toward target count
  let epsilon = diag * 0.005;

  const simplified = douglasPeucker(points, epsilon);
  if (simplified.length <= MAX_POINTS) return simplified;

  // If still too many, increase epsilon
  epsilon = diag * 0.01;
  return douglasPeucker(points, epsilon);
}

function douglasPeucker(points: RoutePoint[], epsilon: number): RoutePoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDist(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDist(point: RoutePoint, lineStart: RoutePoint, lineEnd: RoutePoint): number {
  const dx = lineEnd.lon - lineStart.lon;
  const dy = lineEnd.lat - lineStart.lat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((point.lon - lineStart.lon) ** 2 + (point.lat - lineStart.lat) ** 2);
  }

  const t = ((point.lon - lineStart.lon) * dx + (point.lat - lineStart.lat) * dy) / lenSq;
  const projLon = lineStart.lon + t * dx;
  const projLat = lineStart.lat + t * dy;

  return Math.sqrt((point.lon - projLon) ** 2 + (point.lat - projLat) ** 2);
}

export function calculateTrackViewport(points: RoutePoint[]): TrackViewport {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  // Convert lat/lon delta to approximate meters
  const latDeltaM = (maxLat - minLat) * 111_320;
  const lonDeltaM = (maxLon - minLon) * 111_320 * Math.cos((centerLat * Math.PI) / 180);

  // Radius with 25% padding to ensure >= 10% margin on all sides
  const radiusLat = (latDeltaM / 2) * 1.25;
  const radiusLon = (lonDeltaM / 2) * 1.25;
  const radius = Math.max(radiusLat, radiusLon);

  return {
    center: { lat: centerLat, lon: centerLon },
    radius: Math.max(radius, 500), // minimum 500m
  };
}

export function arePointsCoincident(a: RoutePoint, b: RoutePoint): boolean {
  return Math.abs(a.lat - b.lat) < COINCIDENT_EPSILON && Math.abs(a.lon - b.lon) < COINCIDENT_EPSILON;
}
