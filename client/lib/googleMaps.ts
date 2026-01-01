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
  distanceKm: number;
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
    const requestBody: any = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "en-US",
      units: "METRIC",
    };

    if (waypoints && waypoints.length > 0) {
      requestBody.intermediates = waypoints.map((wp) => ({
        location: {
          latLng: {
            latitude: wp.latitude,
            longitude: wp.longitude,
          },
        },
      }));
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Routes API error:", data.error.message);
      return null;
    }

    if (!data.routes || data.routes.length === 0) {
      console.error("No routes found");
      return null;
    }

    const route = data.routes[0];
    const polyline = route.polyline?.encodedPolyline;

    if (!polyline) {
      return null;
    }

    const coordinates = decodePolyline(polyline);

    const distanceMeters = route.distanceMeters || 0;
    const distanceKmNum = distanceMeters / 1000;
    const distanceText = distanceKmNum >= 1 
      ? distanceKmNum.toFixed(1) + " km" 
      : Math.round(distanceMeters) + " m";
    const durationMatch = route.duration?.match(/(\d+)s/);
    const durationSecs = durationMatch ? parseInt(durationMatch[1]) : 0;
    const durationMins = Math.round(durationSecs / 60);
    const durationStr = durationMins >= 60 
      ? `${Math.floor(durationMins / 60)} hr ${durationMins % 60} min` 
      : `${durationMins} min`;

    return {
      coordinates,
      distance: distanceText,
      distanceKm: distanceKmNum,
      duration: durationStr,
      bounds: {
        northeast: {
          latitude: route.viewport?.high?.latitude || destination.latitude,
          longitude: route.viewport?.high?.longitude || destination.longitude,
        },
        southwest: {
          latitude: route.viewport?.low?.latitude || origin.latitude,
          longitude: route.viewport?.low?.longitude || origin.longitude,
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
