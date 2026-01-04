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

export interface AlternateRoute {
  coordinates: Coordinate[];
  distance: string;
  distanceKm: number;
  duration: string;
  durationMinutes: number;
  isDefault: boolean;
}

export interface DirectionsWithAlternatives {
  routes: AlternateRoute[];
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

export async function getDirectionsWithAlternatives(
  origin: Coordinate,
  destination: Coordinate
): Promise<DirectionsWithAlternatives | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return null;
  }

  try {
    const requestBody = {
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
      computeAlternativeRoutes: true,
      languageCode: "en-US",
      units: "METRIC",
    };

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,routes.routeLabels",
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

    const routes: AlternateRoute[] = data.routes.map((route: any, index: number) => {
      const polyline = route.polyline?.encodedPolyline;
      const coordinates = polyline ? decodePolyline(polyline) : [];
      
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
      
      const isDefault = route.routeLabels?.includes("DEFAULT_ROUTE") || index === 0;
      
      return {
        coordinates,
        distance: distanceText,
        distanceKm: distanceKmNum,
        duration: durationStr,
        durationMinutes: durationMins,
        isDefault,
      };
    });

    const firstRoute = data.routes[0];
    
    return {
      routes,
      bounds: {
        northeast: {
          latitude: firstRoute.viewport?.high?.latitude || destination.latitude,
          longitude: firstRoute.viewport?.high?.longitude || destination.longitude,
        },
        southwest: {
          latitude: firstRoute.viewport?.low?.latitude || origin.latitude,
          longitude: firstRoute.viewport?.low?.longitude || origin.longitude,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching directions with alternatives:", error);
    return null;
  }
}

export interface ElevationPoint {
  elevation: number;
  location: Coordinate;
  resolution: number;
}

export interface ElevationProfile {
  points: ElevationPoint[];
  minElevation: number;
  maxElevation: number;
  totalAscent: number;
  totalDescent: number;
}

export async function getElevationProfile(
  path: Coordinate[],
  samples: number = 50
): Promise<ElevationProfile | null> {
  if (!GOOGLE_MAPS_API_KEY || path.length === 0) {
    return null;
  }

  try {
    const sampleStep = Math.max(1, Math.floor(path.length / samples));
    const sampledPath = path.filter((_, i) => i % sampleStep === 0);
    
    const locations = sampledPath
      .slice(0, 512)
      .map((p) => `${p.latitude},${p.longitude}`)
      .join("|");

    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results) {
      console.error("Elevation API error:", data.status);
      return null;
    }

    const points: ElevationPoint[] = data.results.map((result: any) => ({
      elevation: result.elevation,
      location: {
        latitude: result.location.lat,
        longitude: result.location.lng,
      },
      resolution: result.resolution,
    }));

    let minElevation = Infinity;
    let maxElevation = -Infinity;
    let totalAscent = 0;
    let totalDescent = 0;

    for (let i = 0; i < points.length; i++) {
      const elev = points[i].elevation;
      minElevation = Math.min(minElevation, elev);
      maxElevation = Math.max(maxElevation, elev);

      if (i > 0) {
        const diff = elev - points[i - 1].elevation;
        if (diff > 0) {
          totalAscent += diff;
        } else {
          totalDescent += Math.abs(diff);
        }
      }
    }

    return {
      points,
      minElevation: minElevation === Infinity ? 0 : minElevation,
      maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
      totalAscent,
      totalDescent,
    };
  } catch (error) {
    console.error("Error fetching elevation:", error);
    return null;
  }
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  isRaining: boolean;
  visibility: number;
}

export async function getWeatherForLocation(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) {
      return null;
    }

    const current = data.current;
    const weatherCode = current.weather_code || 0;
    
    const weatherDescriptions: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with heavy hail",
    };

    const weatherIcons: Record<number, string> = {
      0: "sun",
      1: "sun",
      2: "cloud",
      3: "cloud",
      45: "cloud",
      48: "cloud",
      51: "cloud-drizzle",
      53: "cloud-drizzle",
      55: "cloud-drizzle",
      61: "cloud-rain",
      63: "cloud-rain",
      65: "cloud-rain",
      66: "cloud-rain",
      67: "cloud-rain",
      71: "cloud-snow",
      73: "cloud-snow",
      75: "cloud-snow",
      80: "cloud-rain",
      81: "cloud-rain",
      82: "cloud-rain",
      95: "cloud-lightning",
      96: "cloud-lightning",
      99: "cloud-lightning",
    };

    const isRaining = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode);

    return {
      temperature: current.temperature_2m || 0,
      feelsLike: current.apparent_temperature || current.temperature_2m || 0,
      humidity: current.relative_humidity_2m || 0,
      windSpeed: current.wind_speed_10m || 0,
      windDirection: current.wind_direction_10m || 0,
      description: weatherDescriptions[weatherCode] || "Unknown",
      icon: weatherIcons[weatherCode] || "cloud",
      isRaining,
      visibility: (current.visibility || 10000) / 1000,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}
