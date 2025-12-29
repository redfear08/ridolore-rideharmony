import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker as RNMarker, Polyline as RNPolyline } from "react-native-maps";
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

export function MapViewWrapper({ children, style, ...props }: MapViewWrapperProps) {
  return (
    <MapView
      style={[StyleSheet.absoluteFill, style]}
      showsUserLocation={false}
      showsMyLocationButton={false}
      {...props}
    >
      {children}
    </MapView>
  );
}

export function useMapComponents() {
  return { Marker: RNMarker, Polyline: RNPolyline };
}

export const Marker = RNMarker;
export const Polyline = RNPolyline;

const styles = StyleSheet.create({
  webMapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing["2xl"],
  },
});
