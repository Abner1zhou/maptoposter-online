/**
 * MapLibre GL 艺术模式地图 - React + TypeScript
 *
 * 使用方法：
 * 1. 安装依赖: npm install maplibre-gl
 * 2. 传入你的自定义配色
 */

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { isValidHexColor } from "@/lib/utils";
import { COINCIDENT_EPSILON } from "@/lib/gpx-parser";
import { MARKER_START_COLOR, MARKER_END_COLOR } from "@/lib/types";
import type { RoutePoint } from "@/lib/types";

// ============================================
// 类型定义
// ============================================

export interface PosterSize {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface ArtisticTheme {
  /** 背景色 */
  bg: string;
  /** 水域颜色 */
  water: string;
  /** 公园/绿地颜色 */
  parks: string;
  /** 高速公路颜色 */
  road_motorway: string;
  /** 主干道颜色 */
  road_primary: string;
  /** 次干道颜色 */
  road_secondary: string;
  /** 支路颜色 */
  road_tertiary: string;
  /** 住宅区道路颜色 */
  road_residential: string;
  /** 默认道路颜色 */
  road_default: string;
  /** 路线颜色 */
  route: string;
  /** POI 文字颜色 */
  poi?: string;
  /** 渐变遮罩颜色 */
  gradientColor?: string;
}

export interface MapLocation {
  lat: number;
  lon: number;
}

// ============================================
// 根据 radius 计算合适的 zoom 级别
// ============================================
const POSTER_TRANSITION_MS = 300;
const RESIZE_SETTLE_MS = POSTER_TRANSITION_MS + 100;

function getZoomFromRadius(
  radiusMeters: number,
  mapWidthPx: number,
  mapHeightPx: number
): number {
  const sizePx = Math.min(mapWidthPx, mapHeightPx);
  // WASM calculate_bounds 使用 Web Mercator 世界坐标（x = R * lon_rad，与纬度无关）。
  // MapLibre 的 metersPerPixel 已包含 cos(lat)，反推 zoom 时无需再乘。
  const zoom = Math.log2((156543.03392 * sizePx) / (2 * radiusMeters));
  return Math.max(10, Math.min(16, zoom - 0.3));
}

// ============================================
// Shared route marker helpers
// ============================================

function buildMarkerGeoJSON(routePoints: RoutePoint[]) {
  const start = routePoints[0];
  const end = routePoints[routePoints.length - 1];
  const coincident = Math.abs(start.lat - end.lat) < COINCIDENT_EPSILON && Math.abs(start.lon - end.lon) < COINCIDENT_EPSILON;
  const point = (type: string, lat: number, lon: number) => ({
    type: "Feature" as const,
    properties: { type },
    geometry: { type: "Point" as const, coordinates: [lon, lat] },
  });
  return {
    type: "FeatureCollection" as const,
    features: coincident
      ? [point("coincident", start.lat, start.lon)]
      : [point("start", start.lat, start.lon), point("end", end.lat, end.lon)],
  };
}

function routeMarkerLayers(theme: ArtisticTheme) {
  return [
    {
      id: "route-start-marker",
      source: "route-markers-source",
      type: "circle",
      filter: ["==", ["get", "type"], "start"],
      paint: { "circle-radius": 6, "circle-color": MARKER_START_COLOR, "circle-stroke-width": 2, "circle-stroke-color": theme.bg },
    },
    {
      id: "route-end-marker",
      source: "route-markers-source",
      type: "circle",
      filter: ["==", ["get", "type"], "end"],
      paint: { "circle-radius": 6, "circle-color": MARKER_END_COLOR, "circle-stroke-width": 2, "circle-stroke-color": theme.bg },
    },
    {
      id: "route-coincident-marker",
      source: "route-markers-source",
      type: "circle",
      filter: ["==", ["get", "type"], "coincident"],
      paint: { "circle-radius": 7, "circle-color": MARKER_START_COLOR, "circle-stroke-width": 3, "circle-stroke-color": MARKER_END_COLOR },
    },
  ];
}

// ============================================
// 样式生成器（仅用于初始化）
// ============================================

function generateMapLibreStyle(
  theme: ArtisticTheme,
  showRoute: boolean,
  routePoints?: RoutePoint[],
  roadWidthMultiplier: number = 1,
  poiDensity: "none" | "sparse" | "medium" | "dense" = "medium"
): maplibregl.StyleSpecification {
  const routeData =
    routePoints && routePoints.length >= 2
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: routePoints.map((p) => [p.lon, p.lat]),
          },
        }
      : null;

  return {
    version: 8,
    sources: {
      openfreemap: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        maxzoom: 14,
      },
      ...(routeData && showRoute
        ? {
            "route-source": { type: "geojson" as const, data: routeData },
            ...(routePoints && routePoints.length >= 2
              ? { "route-markers-source": { type: "geojson" as const, data: buildMarkerGeoJSON(routePoints) } }
              : {}),
          }
        : {}),
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": theme.bg } },
      {
        id: "water",
        source: "openfreemap",
        "source-layer": "water",
        type: "fill",
        paint: { "fill-color": theme.water },
      },
      {
        id: "park",
        source: "openfreemap",
        "source-layer": "park",
        type: "fill",
        paint: { "fill-color": theme.parks },
      },
      {
        id: "road-default",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: [
          "!",
          [
            "match",
            ["get", "class"],
            ["motorway", "trunk", "primary", "secondary", "tertiary", "residential"],
            true,
            false,
          ],
        ],
        paint: { "line-color": theme.road_default, "line-width": 0.4 * roadWidthMultiplier },
      },
      {
        id: "road-residential",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: ["==", ["get", "class"], "residential"],
        paint: { "line-color": theme.road_residential, "line-width": 0.4 * roadWidthMultiplier },
      },
      {
        id: "road-tertiary",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: ["==", ["get", "class"], "tertiary"],
        paint: { "line-color": theme.road_tertiary, "line-width": 0.6 * roadWidthMultiplier },
      },
      {
        id: "road-secondary",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: ["==", ["get", "class"], "secondary"],
        paint: { "line-color": theme.road_secondary, "line-width": 0.8 * roadWidthMultiplier },
      },
      {
        id: "road-trunk",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: ["==", ["get", "class"], "trunk"],
        paint: { "line-color": theme.road_primary, "line-width": 1.0 * roadWidthMultiplier },
      },
      {
        id: "road-primary",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: ["==", ["get", "class"], "primary"],
        paint: { "line-color": theme.road_primary, "line-width": 1.0 * roadWidthMultiplier },
      },
      {
        id: "road-motorway",
        source: "openfreemap",
        "source-layer": "transportation",
        type: "line",
        filter: ["==", ["get", "class"], "motorway"],
        paint: { "line-color": theme.road_motorway, "line-width": 1.2 * roadWidthMultiplier },
      },
      ...(poiDensity !== "none"
        ? ([
            {
              id: "poi",
              source: "openfreemap",
              "source-layer": "poi",
              type: "circle" as const,
              minzoom: 11,
              ...(poiDensity === "sparse"
                ? { filter: ["<=", ["get", "rank"], 3] as maplibregl.FilterSpecification }
                : poiDensity === "medium"
                  ? { filter: ["<=", ["get", "rank"], 10] as maplibregl.FilterSpecification }
                  : {}),
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 14, 3],
                "circle-color": theme.poi || theme.road_default || "#666",
                "circle-stroke-width": 1,
                "circle-stroke-color": theme.bg,
              },
            },
          ] as maplibregl.LayerSpecification[])
        : []),
      ...(showRoute && routeData
        ? ([
            {
              id: "route-line-casing",
              source: "route-source",
              type: "line",
              layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
              paint: { "line-color": theme.bg, "line-width": 9 },
            },
            {
              id: "route-line",
              source: "route-source",
              type: "line",
              layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
              paint: { "line-color": theme.route, "line-width": 5 },
            },
            ...(routePoints && routePoints.length >= 2 ? routeMarkerLayers(theme) : []),
          ] as maplibregl.LayerSpecification[])
        : []),
    ],
  };
}

// ============================================
// 用 setPaintProperty 更新主题颜色，不调用 setStyle()
// ============================================
function applyThemePaintProperties(map: maplibregl.Map, theme: ArtisticTheme) {
  const safe = (layerId: string, prop: string, value: unknown) => {
    try {
      // Validate hex color if it's a string starting with #
      if (typeof value === "string" && value.startsWith("#") && !isValidHexColor(value)) {
        console.warn(`Invalid color ${value} for ${layerId}:${prop}, skipping`);
        return;
      }
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, prop, value);
    } catch (err) {
      console.warn(`Failed to set paint property for ${layerId}:`, err);
    }
  };
  safe("background", "background-color", theme.bg);
  safe("water", "fill-color", theme.water);
  safe("park", "fill-color", theme.parks);
  safe("road-default", "line-color", theme.road_default);
  safe("road-residential", "line-color", theme.road_residential);
  safe("road-tertiary", "line-color", theme.road_tertiary);
  safe("road-secondary", "line-color", theme.road_secondary);
  safe("road-trunk", "line-color", theme.road_primary);
  safe("road-primary", "line-color", theme.road_primary);
  safe("road-motorway", "line-color", theme.road_motorway);
  safe("poi", "circle-color", theme.poi || theme.road_default || "#666");
  safe("poi", "circle-stroke-color", theme.bg);
  safe("route-line-casing", "line-color", theme.bg);
  safe("route-line", "line-color", theme.route);
  safe("route-start-marker", "circle-stroke-color", theme.bg);
  safe("route-end-marker", "circle-stroke-color", theme.bg);
}

// ============================================
// 组件实现：ArtisticMap
// ============================================

// ============================================
// 工具函数
// ============================================

function isLatinScript(text: string): boolean {
  const latinRegex = /[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F]/;
  let latinCount = 0,
    totalAlpha = 0;
  for (const char of text) {
    if (/[a-zA-Z]/.test(char)) {
      totalAlpha++;
      if (latinRegex.test(char)) latinCount++;
    }
  }
  return totalAlpha > 0 && latinCount / totalAlpha > 0.8;
}

function formatCityName(city: string): string {
  if (isLatinScript(city)) return city.split("").join("  ");
  return city;
}

/// 动态计算字体大小（与 WASM 端 calculate_font_size 逻辑一致）
function calculateFontSize(text: string, baseSize: number, threshold: number): number {
  if (text.length > threshold) {
    return Math.max(10, (baseSize * threshold) / text.length);
  }
  return baseSize;
}

function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir} / ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

// ============================================
// 文字叠加层
// ============================================

interface TextOverlayProps {
  city: string;
  country: string;
  lat: number;
  lon: number;
  textColor: string;
  customFontFamily: string;
  containerWidth: number;
  containerHeight: number;
  showCity?: boolean;
  showCountry?: boolean;
  showCoords?: boolean;
}

function TextOverlay({
  city,
  country,
  lat,
  lon,
  textColor,
  customFontFamily,
  containerWidth,
  containerHeight,
  showCity = true,
  showCountry = true,
  showCoords = true,
}: TextOverlayProps) {
  const widthScale = containerWidth / 1200;
  const heightScale = (containerHeight / 1200) * 1.1;
  const scaleFactor = Math.min(widthScale, heightScale);

  // 城市名需要先格式化再计算字号（与 WASM 端逻辑一致）
  const formattedCity = formatCityName(city);
  const cityFontSize = calculateFontSize(formattedCity, 80 * scaleFactor, 30);
  const countryFontSize = 28 * scaleFactor;
  const coordsFontSize = 18 * scaleFactor;

  const rootFontSize =
    typeof document !== "undefined"
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
  const paddingOffset = rootFontSize;
  const anchorY = 0.88;

  const offsetPool = [50 * scaleFactor, 0, -40 * scaleFactor];
  const visibleItems: { label: string; fontSize: number; opacity?: number }[] = [];
  if (showCity) visibleItems.push({ label: formatCityName(city), fontSize: cityFontSize });
  if (showCountry) visibleItems.push({ label: country.toUpperCase(), fontSize: countryFontSize });
  if (showCoords)
    visibleItems.push({
      label: formatCoordinates(lat, lon),
      fontSize: coordsFontSize,
      opacity: 0.8,
    });

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    color: textColor,
    fontFamily: customFontFamily,
    textAlign: "center",
    whiteSpace: "nowrap",
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      {visibleItems.map((item, i) => (
        <span
          key={i}
          style={{
            ...baseStyle,
            top: anchorY * containerHeight + offsetPool[i] - paddingOffset,
            fontSize: `${item.fontSize}px`,
            fontWeight: 400,
            ...(item.opacity !== undefined ? { opacity: item.opacity } : {}),
          }}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ============================================
// 带文字的海报预览组件
// ============================================

interface MapPosterPreviewProps {
  location: MapLocation;
  city: string;
  country: string;
  zoom?: number;
  radius?: number;
  theme: ArtisticTheme;
  textColor: string;
  showRoute?: boolean;
  routePoints?: RoutePoint[];
  className?: string;
  onLoad?: (map: maplibregl.Map) => void;
  onMoveEnd?: (location: MapLocation) => void;
  roadWidthMultiplier?: number;
  posterSize?: PosterSize;
  fontCacheRef: React.RefObject<Map<string, { data: Uint8Array; fileName: string }> | null>;
  selectedPreset: string;
  poiDensity?: "none" | "sparse" | "medium" | "dense";
  gradientColor?: string;
  showCity?: boolean;
  showCountry?: boolean;
  showCoords?: boolean;
  myLocation?: { lat: number; lng: number } | null;
}

export function MapPosterPreview({
  location,
  city,
  country,
  zoom = 12,
  radius,
  theme,
  textColor,
  showRoute = false,
  routePoints,
  className = "",
  onLoad,
  onMoveEnd,
  roadWidthMultiplier = 1,
  posterSize,
  fontCacheRef,
  selectedPreset,
  poiDensity = "medium",
  gradientColor,
  showCity,
  showCountry,
  showCoords,
  myLocation,
}: MapPosterPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [fontFamily, setFontFamily] = useState<string>("sans-serif");

  // 通过 Object URL + CSS @font-face 加载字体，避免主线程 OTF 解析
  // 从 fontCacheRef 读取数据，不经过 React prop，避免 DevTools clone 大 Uint8Array
  useEffect(() => {
    const fontData = fontCacheRef.current?.get(selectedPreset)?.data;
    if (!fontData) {
      setFontFamily("sans-serif");
      return;
    }

    const blob = new Blob([fontData as BlobPart], { type: "font/otf" });
    const objectUrl = URL.createObjectURL(blob);
    const style = document.createElement("style");
    style.textContent = `@font-face { font-family: "CustomFont"; src: url("${objectUrl}"); }`;
    document.head.appendChild(style);
    setFontFamily("CustomFont");

    return () => {
      document.head.removeChild(style);
      URL.revokeObjectURL(objectUrl);
      setFontFamily("sans-serif");
    };
  }, [fontCacheRef, selectedPreset]);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 初始化地图（只跑一次）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // 在 effect 执行时捕获初始坐标快照。
    // load 事件里只用这个快照做 jumpTo，不读闭包外的 location。
    // 原因：load 触发时 location 可能已经变成新城市，若用最新 location 做 jumpTo，
    // 地图会直接跳到新城市，之后位置 effect 发现 currentCenter === targetCenter，
    // easeTo 不会启动，动画消失。
    const initLat = location.lat;
    const initLon = location.lon;
    const initRadius = radius;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: generateMapLibreStyle(theme, showRoute, routePoints, roadWidthMultiplier, poiDensity),
      center: [initLon, initLat],
      zoom: zoom,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      interactive: false,
    });

    map.on("load", () => {
      onLoad?.(map);
      // 用初始快照做 jumpTo，把地图放在初始城市
      if (initRadius) {
        const canvas = map.getCanvas();
        const targetZoom = getZoomFromRadius(
          initRadius,
          canvas.clientWidth,
          canvas.clientHeight
        );
        map.jumpTo({ center: [initLon, initLat], zoom: targetZoom });
      }
      // setIsLoaded 放在最后，触发位置 effect。
      // 此时若 location 已变成新城市，位置 effect 会从初始城市 easeTo 到新城市，动画出现。
      setIsLoaded(true);
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      onMoveEnd?.({ lat: center.lat, lon: center.lng });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 主题颜色变化：用 setPaintProperty，不调用 setStyle()
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    applyThemePaintProperties(mapRef.current, theme);
  }, [theme, isLoaded]);

  // My Location marker
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (myLocation) {
      const el = document.createElement("div");
      el.style.cssText = `width: 32px; height: 32px;`;
      el.innerHTML = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="${textColor}" d="M512 85.333333c188.501333 0 341.333333 154.325333 341.333333 344.746667 0 98.901333-46.677333 210.005333-107.264 277.034667-36.053333 39.850667-101.973333 111.786667-197.888 215.68a48.768 48.768 0 0 1-71.978666-0.341334l-11.52-12.672a30379.605333 30379.605333 0 0 0-173.994667-191.146666C223.018667 645.546667 170.666667 535.168 170.666667 430.08 170.666667 239.658667 323.498667 85.333333 512 85.333333z m0 172.373334c-94.293333 0-170.666667 77.184-170.666667 172.373333s76.373333 172.373333 170.666667 172.373333 170.666667-77.184 170.666667-172.373333-76.373333-172.373333-170.666667-172.373333z"/></svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([myLocation.lng, myLocation.lat])
        .addTo(mapRef.current);
      markerRef.current = marker;
    }
  }, [myLocation, isLoaded, textColor]);

  // Route track: update source data when routePoints change
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;

    if (!showRoute || !routePoints || routePoints.length < 2) {
      ["route-start-marker", "route-end-marker", "route-coincident-marker", "route-line", "route-line-casing"].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource("route-source")) map.removeSource("route-source");
      if (map.getSource("route-markers-source")) map.removeSource("route-markers-source");
      return;
    }

    const routeData = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: routePoints.map((p) => [p.lon, p.lat]),
      },
    };

    // Update or add route source
    const existingSource = map.getSource("route-source");
    if (existingSource) {
      (existingSource as maplibregl.GeoJSONSource).setData(routeData);
    } else {
      map.addSource("route-source", { type: "geojson", data: routeData });
    }

    // Update or add marker source
    const markerData = buildMarkerGeoJSON(routePoints);
    const existingMarkerSource = map.getSource("route-markers-source");
    if (existingMarkerSource) {
      (existingMarkerSource as maplibregl.GeoJSONSource).setData(markerData);
    } else {
      map.addSource("route-markers-source", { type: "geojson", data: markerData });
    }

    // Add route line layers if they don't exist
    if (!map.getLayer("route-line-casing")) {
      map.addLayer({
        id: "route-line-casing",
        source: "route-source",
        type: "line",
        layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
        paint: { "line-color": theme.bg, "line-width": 12 },
      });
    }
    if (!map.getLayer("route-line")) {
      map.addLayer({
        id: "route-line",
        source: "route-source",
        type: "line",
        layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
        paint: { "line-color": theme.route, "line-width": 6 },
      });
    }

    // Add marker layers if they don't exist
    for (const layer of routeMarkerLayers(theme)) {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer as maplibregl.LayerSpecification);
      }
    }

    // Sync only route-related paint properties
    applyThemePaintProperties(map, theme);
  }, [showRoute, routePoints, isLoaded, theme]);

  // 统一处理位置 / 半径 / 海报尺寸变化
  const prevRadiusRef = useRef(radius);
  const prevLatLonRef = useRef({ lat: location.lat, lon: location.lon });

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const radiusChanged = prevRadiusRef.current !== radius;
    const locationChanged =
      prevLatLonRef.current.lat !== location.lat ||
      prevLatLonRef.current.lon !== location.lon;
    prevRadiusRef.current = radius;
    prevLatLonRef.current = { lat: location.lat, lon: location.lon };

    // Guard: avoid firing when neither radius nor location changed
    // (e.g. isLoaded toggling on mount).
    if (!radiusChanged && !locationChanged) return;

    const canvas = mapRef.current.getCanvas();
    const targetZoom = radius
      ? getZoomFromRadius(radius, canvas.clientWidth, canvas.clientHeight)
      : zoom;

    if (radiusChanged && !locationChanged) {
      // Radius 变化（如海报尺寸切换导致 baseRadius 重新计算）：
      // 延迟执行，等 CSS transition 和 MapLibre resize 稳定后再 jumpTo。
      const timer = setTimeout(() => {
        mapRef.current!.jumpTo({
          center: [location.lon, location.lat],
          zoom: targetZoom,
        });
      }, RESIZE_SETTLE_MS);
      return () => clearTimeout(timer);
    }

    // Location 变化（用户选中新城市）或同时变化：立即 flyTo，带动画
    mapRef.current.flyTo({
      center: [location.lon, location.lat],
      zoom: targetZoom,
      essential: true,
      duration: 1200,
      speed: 1.2,
      curve: 1.42,
    });
  }, [location.lat, location.lon, zoom, radius, isLoaded]);

  const aspectRatio = posterSize ? posterSize.width / posterSize.height : undefined;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : {}),
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      />

      {gradientColor && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            background: `linear-gradient(to bottom, ${gradientColor} 0%, transparent 25%),
                                 linear-gradient(to top,   ${gradientColor} 0%, transparent 25%)`,
          }}
        />
      )}

      {containerSize.width > 0 && containerSize.height > 0 && (
        <TextOverlay
          city={city}
          country={country}
          lat={location.lat}
          lon={location.lon}
          textColor={textColor}
          customFontFamily={fontFamily}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          showCity={showCity}
          showCountry={showCountry}
          showCoords={showCoords}
        />
      )}
    </div>
  );
}
