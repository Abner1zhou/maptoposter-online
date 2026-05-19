import type { RoutePoint } from "@/components/artistic-map";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_POINTS = 500;

export const COINCIDENT_EPSILON = 0.0001; // ~10 meters

export interface TrackViewport {
  center: { lat: number; lon: number };
  radius: number;
}

interface BBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function calculateBBox(points: RoutePoint[]): BBox {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
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

  const bbox = calculateBBox(points);
  const diag = Math.sqrt((bbox.maxLat - bbox.minLat) ** 2 + (bbox.maxLon - bbox.minLon) ** 2);

  const simplified = douglasPeucker(points, diag * 0.005);
  if (simplified.length <= MAX_POINTS) return simplified;

  return douglasPeucker(points, diag * 0.01);
}

function douglasPeucker(points: RoutePoint[], epsilon: number): RoutePoint[] {
  // Iterative implementation to avoid stack overflow on large tracks
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDist(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      keep[maxIdx] = 1;
      if (maxIdx - start > 1) stack.push([start, maxIdx]);
      if (end - maxIdx > 1) stack.push([maxIdx, end]);
    }
  }

  const result: RoutePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
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
  const { minLat, maxLat, minLon, maxLon } = calculateBBox(points);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const latDeltaM = (maxLat - minLat) * 111_320;
  const lonDeltaM = (maxLon - minLon) * 111_320 * Math.cos((centerLat * Math.PI) / 180);

  // 25% padding on radius ensures >= 10% margin on all sides
  const radius = Math.max(latDeltaM, lonDeltaM) / 2 * 1.25;

  return {
    center: { lat: centerLat, lon: centerLon },
    radius: Math.max(radius, 500),
  };
}

export function arePointsCoincident(a: RoutePoint, b: RoutePoint): boolean {
  return Math.abs(a.lat - b.lat) < COINCIDENT_EPSILON && Math.abs(a.lon - b.lon) < COINCIDENT_EPSILON;
}
