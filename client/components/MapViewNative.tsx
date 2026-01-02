import React, { useMemo, memo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
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
}

const RoutePolylineComponent = memo(function RoutePolylineComponent({ 
  coordinates, 
  color 
}: RoutePolylineProps) {
  if (coordinates.length <= 1) return null;
  
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={color}
      strokeWidth={4}
      lineDashPattern={[0]}
      lineJoin="round"
      lineCap="round"
    />
  );
});

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
  destinationCoord,
  routeCoordinates,
  riderLocations,
  currentUserId,
  theme,
  onRiderPress,
}: MapViewNativeProps) {
  const otherRiders = useMemo(() => 
    riderLocations.filter((r) => r.id !== currentUserId),
    [riderLocations, currentUserId]
  );

  // Validate and provide safe fallback for initialRegion
  const safeInitialRegion: Region = useMemo(() => {
    if (isValidRegion(initialRegion)) {
      return initialRegion;
    }
    // Safe fallback to San Francisco coordinates
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
  }, [initialRegion]);

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

      <RoutePolylineComponent 
        coordinates={routeCoordinates} 
        color={theme.primary} 
      />
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
