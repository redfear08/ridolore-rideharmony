import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};
const GOOGLE_MAPS_API_KEY = extra.googleMapsApiKey || "";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  coordinates: Coordinate[];
  distance: string;
  duration: string;
  bounds: {
    northeast: Coordinate;
    southwest: Coordinate;
  };
}

function decodePolyline(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  
  return points;
}

export async function getDirections(
  origin: Coordinate,
  destination: Coordinate,
  waypoints?: Coordinate[]
): Promise<DirectionsResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return null;
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints
        .map((wp) => `${wp.latitude},${wp.longitude}`)
        .join("|");
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
      console.error("Directions API error:", data.status, data.error_message);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const polyline = route.overview_polyline?.points;

    if (!polyline) {
      return null;
    }

    const coordinates = decodePolyline(polyline);

    return {
      coordinates,
      distance: leg.distance?.text || "",
      duration: leg.duration?.text || "",
      bounds: {
        northeast: {
          latitude: route.bounds?.northeast?.lat || destination.latitude,
          longitude: route.bounds?.northeast?.lng || destination.longitude,
        },
        southwest: {
          latitude: route.bounds?.southwest?.lat || origin.latitude,
          longitude: route.bounds?.southwest?.lng || origin.longitude,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching directions:", error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.error("Geocoding error:", data.status);
      return null;
    }

    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

export function isGoogleMapsConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY;
}
