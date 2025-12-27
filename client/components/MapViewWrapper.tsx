import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  userInterfaceStyle?: "light" | "dark";
}

function WebFallback() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.webMapPlaceholder, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name="map" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.webMapText}>
        Map View
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        Run in Expo Go on your mobile device for the full map experience
      </ThemedText>
    </View>
  );
}

let MapViewComponent: any = null;
let MarkerComponent: any = null;
let PolylineComponent: any = null;

if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapViewComponent = Maps.default;
  MarkerComponent = Maps.Marker;
  PolylineComponent = Maps.Polyline;
}

export function MapViewWrapper({ children, style, ...props }: MapViewWrapperProps) {
  if (Platform.OS === "web") {
    return <WebFallback />;
  }

  if (!MapViewComponent) {
    return <WebFallback />;
  }

  return (
    <MapViewComponent
      style={[StyleSheet.absoluteFill, style]}
      showsUserLocation={false}
      showsMyLocationButton={false}
      {...props}
    >
      {children}
    </MapViewComponent>
  );
}

export const Marker = Platform.OS !== "web" && MarkerComponent ? MarkerComponent : View;
export const Polyline = Platform.OS !== "web" && PolylineComponent ? PolylineComponent : View;

const styles = StyleSheet.create({
  webMapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing["2xl"],
  },
  webMapText: {
    marginTop: Spacing.md,
  },
});
