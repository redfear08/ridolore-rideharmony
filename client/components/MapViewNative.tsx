import React, { useMemo, memo, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, Platform } from "react-native";
import MapView, { Marker, Polyline, Region, Camera } from "react-native-maps";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Shadows } from "@/constants/theme";

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RiderLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface AlternateRouteData {
  coordinates: Coordinate[];
  distance: string;
  duration: string;
  isDefault: boolean;
}

interface MapViewNativeProps {
  mapRef: React.RefObject<any>;
  initialRegion: Region;
  isDark: boolean;
  userLocation: Coordinate | null;
  destinationCoord: Coordinate | null;
  routeCoordinates: Coordinate[];
  riderLocations: RiderLocation[];
  currentUserId?: string;
  theme: {
    accent: string;
    primary: string;
    riderMarker: string;
  };
  onRiderPress: (rider: RiderLocation) => void;
  enable3D?: boolean;
  showTraffic?: boolean;
  mapType?: "standard" | "satellite" | "hybrid" | "terrain";
  alternateRoutes?: AlternateRouteData[];
  selectedRouteIndex?: number;
  onRouteSelect?: (index: number) => void;
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

function findNearestPointIndex(coords: Coordinate[], userLoc: Coordinate): number {
  let minDist = Infinity;
  let nearestIndex = 0;
  
  for (let i = 0; i < coords.length; i++) {
    const dist = Math.pow(coords[i].latitude - userLoc.latitude, 2) + 
                 Math.pow(coords[i].longitude - userLoc.longitude, 2);
    if (dist < minDist) {
      minDist = dist;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
}

interface RiderMarkerProps {
  rider: RiderLocation;
  color: string;
  onPress: () => void;
}

const RiderMarkerComponent = memo(function RiderMarkerComponent({ 
  rider, 
  color, 
  onPress 
}: RiderMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: rider.latitude, longitude: rider.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <View style={[styles.riderMarker, { backgroundColor: color }]}>
        <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
          {(rider.name || "R").charAt(0)}
        </ThemedText>
      </View>
    </Marker>
  );
});

interface DestinationMarkerProps {
  coordinate: Coordinate;
  color: string;
}

const DestinationMarkerComponent = memo(function DestinationMarkerComponent({ 
  coordinate, 
  color 
}: DestinationMarkerProps) {
  return (
    <Marker 
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
    >
      <View style={styles.destinationMarker}>
        <View style={[styles.destinationPin, { backgroundColor: color }]}>
          <Feather name="flag" size={16} color="#FFFFFF" />
        </View>
        <View style={[styles.destinationPinTail, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
});

interface RoutePolylineProps {
  coordinates: Coordinate[];
  color: string;
  isAlternate?: boolean;
  onPress?: () => void;
}

const RoutePolylineComponent = memo(function RoutePolylineComponent({ 
  coordinates, 
  color,
  isAlternate = false,
  onPress
}: RoutePolylineProps) {
  if (coordinates.length <= 1) return null;
  
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={color}
      strokeWidth={isAlternate ? 4 : 5}
      lineDashPattern={isAlternate ? [10, 5] : [0]}
      lineJoin="round"
      lineCap="round"
      tappable={!!onPress}
      onPress={onPress}
    />
  );
});

const ALTERNATE_ROUTE_COLORS = ["#6B7280", "#9CA3AF", "#D1D5DB"];

function isValidRegion(region: Region | null | undefined): region is Region {
  if (!region) return false;
  return (
    typeof region.latitude === 'number' &&
    typeof region.longitude === 'number' &&
    typeof region.latitudeDelta === 'number' &&
    typeof region.longitudeDelta === 'number' &&
    !isNaN(region.latitude) &&
    !isNaN(region.longitude) &&
    !isNaN(region.latitudeDelta) &&
    !isNaN(region.longitudeDelta) &&
    isFinite(region.latitude) &&
    isFinite(region.longitude) &&
    isFinite(region.latitudeDelta) &&
    isFinite(region.longitudeDelta)
  );
}

function MapViewNativeInner({
  mapRef,
  initialRegion,
  isDark,
  userLocation,
  destinationCoord,
  routeCoordinates,
  riderLocations,
  currentUserId,
  theme,
  onRiderPress,
  enable3D = true,
  showTraffic = true,
  mapType = "standard",
  alternateRoutes = [],
  selectedRouteIndex = 0,
  onRouteSelect,
}: MapViewNativeProps) {
  const has3DSetup = useRef(false);
  
  const otherRiders = useMemo(() => 
    riderLocations.filter((r) => r.id !== currentUserId),
    [riderLocations, currentUserId]
  );

  const safeInitialRegion: Region = useMemo(() => {
    if (isValidRegion(initialRegion)) {
      return initialRegion;
    }
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
  }, [initialRegion]);

  const trimRouteFromUser = useCallback((coords: Coordinate[]): Coordinate[] => {
    if (!userLocation || coords.length < 2) {
      return coords;
    }
    
    const nearestIndex = findNearestPointIndex(coords, userLocation);
    const routeFromCurrentPosition = coords.slice(nearestIndex);
    
    if (routeFromCurrentPosition.length > 0) {
      return [userLocation, ...routeFromCurrentPosition];
    }
    
    return coords;
  }, [userLocation]);

  const trimmedRoute = useMemo(() => {
    return trimRouteFromUser(routeCoordinates);
  }, [routeCoordinates, trimRouteFromUser]);

  const trimmedSelectedRoute = useMemo(() => {
    if (alternateRoutes.length > 0 && alternateRoutes[selectedRouteIndex]) {
      return trimRouteFromUser(alternateRoutes[selectedRouteIndex].coordinates);
    }
    return [];
  }, [alternateRoutes, selectedRouteIndex, trimRouteFromUser]);

  useEffect(() => {
    if (enable3D && mapRef.current && userLocation && Platform.OS !== "web" && !has3DSetup.current) {
      has3DSetup.current = true;
      setTimeout(() => {
        try {
          const camera: Camera = {
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            pitch: 45,
            heading: 0,
            altitude: 1000,
            zoom: 16,
          };
          mapRef.current?.animateCamera(camera, { duration: 1000 });
        } catch (e) {
          console.log("Camera animation not supported:", e);
        }
      }, 1500);
    }
  }, [enable3D, userLocation, mapRef]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={safeInitialRegion}
      showsUserLocation={true}
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? "dark" : "light"}
      showsCompass={true}
      showsScale={true}
      moveOnMarkerPress={false}
      pitchEnabled={true}
      rotateEnabled={true}
      showsBuildings={true}
      showsTraffic={showTraffic}
      showsIndoors={true}
      showsIndoorLevelPicker={true}
      mapType={mapType}
      customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
    >
      {destinationCoord ? (
        <DestinationMarkerComponent 
          coordinate={destinationCoord} 
          color={theme.accent} 
        />
      ) : null}

      {otherRiders.map((rider) => (
        <RiderMarkerComponent
          key={rider.id}
          rider={rider}
          color={theme.riderMarker}
          onPress={() => onRiderPress(rider)}
        />
      ))}

      {alternateRoutes.length > 0 ? (
        <>
          {alternateRoutes.map((route, index) => {
            if (index === selectedRouteIndex) return null;
            return (
              <RoutePolylineComponent
                key={`alt-route-${index}`}
                coordinates={route.coordinates}
                color={ALTERNATE_ROUTE_COLORS[index % ALTERNATE_ROUTE_COLORS.length]}
                isAlternate={true}
                onPress={onRouteSelect ? () => onRouteSelect(index) : undefined}
              />
            );
          })}
          {trimmedSelectedRoute.length > 0 ? (
            <RoutePolylineComponent
              coordinates={trimmedSelectedRoute}
              color={theme.primary}
            />
          ) : null}
        </>
      ) : (
        <RoutePolylineComponent 
          coordinates={trimmedRoute} 
          color={theme.primary} 
        />
      )}
    </MapView>
  );
}

export const MapViewNative = memo(MapViewNativeInner);

const styles = StyleSheet.create({
  riderMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...Shadows.card,
  },
  destinationMarker: {
    alignItems: "center",
  },
  destinationPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...Shadows.card,
  },
  destinationPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -3,
  },
});
