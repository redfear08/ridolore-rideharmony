import React from "react";
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

export function MapViewNative({
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
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? "dark" : "light"}
      showsCompass={true}
      showsScale={true}
    >
      {destinationCoord ? (
        <Marker 
          coordinate={destinationCoord}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.destinationMarker}>
            <View style={[styles.destinationPin, { backgroundColor: theme.accent }]}>
              <Feather name="flag" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.destinationPinTail, { borderTopColor: theme.accent }]} />
          </View>
        </Marker>
      ) : null}

      {riderLocations
        .filter((r) => r.id !== currentUserId)
        .map((rider) => (
          <Marker
            key={rider.id}
            coordinate={{ latitude: rider.latitude, longitude: rider.longitude }}
            onPress={() => onRiderPress(rider)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.riderMarker, { backgroundColor: theme.riderMarker }]}>
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {rider.name.charAt(0)}
              </ThemedText>
            </View>
          </Marker>
        ))}

      {routeCoordinates.length > 1 ? (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={theme.primary}
          strokeWidth={4}
          lineDashPattern={[0]}
          lineJoin="round"
          lineCap="round"
        />
      ) : null}
    </MapView>
  );
}

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
