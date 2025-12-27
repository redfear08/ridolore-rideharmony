import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
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
      <View style={[styles.mapIcon, { backgroundColor: theme.primary }]}>
        <ThemedText type="h2" style={{ color: "#FFFFFF" }}>M</ThemedText>
      </View>
      <ThemedText type="h3" style={styles.webMapText}>
        Map View
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        Run in Expo Go on your mobile device for the full map experience
      </ThemedText>
    </View>
  );
}

export function MapViewWrapper({ children, style, ...props }: MapViewWrapperProps) {
  const [MapComponent, setMapComponent] = useState<any>(null);
  
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        const Maps = require("react-native-maps");
        setMapComponent(() => Maps.default);
      } catch (error) {
        console.log("Maps not available:", error);
      }
    }
  }, []);

  if (Platform.OS === "web" || !MapComponent) {
    return <WebFallback />;
  }

  return (
    <MapComponent
      style={[StyleSheet.absoluteFill, style]}
      showsUserLocation={false}
      showsMyLocationButton={false}
      {...props}
    >
      {children}
    </MapComponent>
  );
}

export function useMapComponents() {
  const [components, setComponents] = useState<{
    Marker: any;
    Polyline: any;
  }>({ Marker: View, Polyline: View });

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        const Maps = require("react-native-maps");
        setComponents({
          Marker: Maps.Marker,
          Polyline: Maps.Polyline,
        });
      } catch (error) {
        console.log("Maps components not available:", error);
      }
    }
  }, []);

  return components;
}

export const Marker = View;
export const Polyline = View;

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
  mapIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
