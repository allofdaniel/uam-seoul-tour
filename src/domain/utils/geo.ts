import type { Coordinate, POI, POIZone, POIZoneCode, TimeOfDay } from '../types';

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 두 좌표 사이의 거리를 미터 단위로 반환 (Haversine 공식)
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

/**
 * from에서 to까지의 방위각을 0-360도로 반환
 */
export function calculateBearing(from: Coordinate, to: Coordinate): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = toDeg(Math.atan2(y, x));
  return ((bearing % 360) + 360) % 360;
}

/**
 * 대상이 시야각(FOV) 내에 있고 최대 범위 내에 있는지 판별
 */
export function isInViewFrustum(
  position: Coordinate,
  heading: number,
  target: Coordinate,
  fovDeg: number,
  maxRange_m: number,
): boolean {
  const distance = haversineDistance(position, target);
  if (distance > maxRange_m) return false;

  const bearing = calculateBearing(position, target);
  let diff = Math.abs(bearing - heading);
  if (diff > 180) diff = 360 - diff;

  return diff <= fovDeg / 2;
}

/**
 * 현재 시간대를 반환
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * 시야각과 최대 범위 내에 있는 POI 목록을 거리순으로 반환
 */
export function findPOIsInRange(
  position: Coordinate,
  heading: number,
  pois: POI[],
  fovDeg: number,
  maxRange_m: number,
): POI[] {
  return pois
    .filter((poi) => {
      const target: Coordinate = { lat: poi.lat, lon: poi.lon };
      const effectiveRange = Math.min(maxRange_m, poi.visible_range_m);
      return isInViewFrustum(position, heading, target, fovDeg, effectiveRange);
    })
    .sort((a, b) => {
      const distA = haversineDistance(position, { lat: a.lat, lon: a.lon });
      const distB = haversineDistance(position, { lat: b.lat, lon: b.lon });
      return distA - distB;
    });
}

/**
 * 주어진 좌표가 속하는 구역 코드를 반환 (없으면 null)
 */
export function getZoneForPosition(
  position: Coordinate,
  zones: POIZone[],
): POIZoneCode | null {
  let closestZone: POIZoneCode | null = null;
  let closestDistance = Infinity;

  for (const zone of zones) {
    const center: Coordinate = { lat: zone.center_lat, lon: zone.center_lon };
    const distance = haversineDistance(position, center);
    const radiusM = zone.radius_km * 1000;

    if (distance <= radiusM && distance < closestDistance) {
      closestDistance = distance;
      closestZone = zone.code;
    }
  }

  return closestZone;
}
