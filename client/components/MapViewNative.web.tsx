import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

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
  initialRegion: any;
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
}

export function MapViewNative(_props: MapViewNativeProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.webMapPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
      <Feather name="map" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ textAlign: "center", marginTop: Spacing.lg }}>
        Map View
      </ThemedText>
      <ThemedText type="body" style={{ textAlign: "center", color: theme.textSecondary, marginTop: Spacing.sm }}>
        Open in Expo Go to see the live map with route tracking
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  webMapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
});
