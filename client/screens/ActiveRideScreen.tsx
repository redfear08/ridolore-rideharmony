import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MapViewNative } from "@/components/MapViewNative";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides, useProfile, Rider, Ride } from "@/hooks/useStorage";
import { getDirections } from "@/lib/googleMaps";
import { 
  updateRiderLocation, 
  subscribeToRiderLocations,
  RiderLocation 
} from "@/lib/firebase";

type ActiveRideRouteProp = RouteProp<RootStackParamList, "ActiveRide">;

interface Coordinate {
  latitude: number;
  longitude: number;
}

export default function ActiveRideScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ActiveRideRouteProp>();
  const { rides, getRide, fetchRideById, updateRide } = useRides();
  const { profile } = useProfile();
  const mapRef = useRef<any>(null);
  
  const [ride, setRide] = useState<Ride | undefined>(undefined);
  const [isLoadingRide, setIsLoadingRide] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [riderLocations, setRiderLocations] = useState<RiderLocation[]>([]);
  const [showRidersList, setShowRidersList] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [destinationCoord, setDestinationCoord] = useState<Coordinate | null>(null);
  const [sourceCoord, setSourceCoord] = useState<Coordinate | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const hasSetupFallbackRoute = useRef(false);
  const hasFetchedFromFirebase = useRef(false);
  const lastLocationUpdate = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    const loadRide = async () => {
      const rideId = route.params.rideId;
      
      const localRide = getRide(rideId);
      if (localRide) {
        setRide(localRide);
        setIsLoadingRide(false);
        return;
      }
      
      if (!hasFetchedFromFirebase.current) {
        hasFetchedFromFirebase.current = true;
        const fetchedRide = await fetchRideById(rideId);
        if (fetchedRide) {
          setRide(fetchedRide);
        }
        setIsLoadingRide(false);
      }
    };
    
    loadRide();
  }, [route.params.rideId, rides, getRide, fetchRideById]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    const rideId = route.params.rideId;

    const shouldUpdateFirebase = (lat: number, lng: number): boolean => {
      const now = Date.now();
      const last = lastLocationUpdate.current;
      
      if (!last) return true;
      
      const timeDiff = now - last.time;
      const distance = Math.sqrt(
        Math.pow((lat - last.lat) * 111320, 2) + 
        Math.pow((lng - last.lng) * 111320 * Math.cos(lat * Math.PI / 180), 2)
      );
      
      return distance >= 5 || timeDiff >= 5000;
    };

    const publishLocation = async (loc: Location.LocationObject) => {
      if (!profile?.id || !profile?.name) return;
      
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      
      if (!shouldUpdateFirebase(lat, lng)) return;
      
      try {
        await updateRiderLocation(rideId, profile.id, profile.name, {
          latitude: lat,
          longitude: lng,
          heading: loc.coords.heading ?? undefined,
          speed: loc.coords.speed ?? undefined,
          accuracy: loc.coords.accuracy ?? undefined,
        });
        lastLocationUpdate.current = { lat, lng, time: Date.now() };
      } catch (error) {
        console.error("Failed to update location:", error);
      }
    };

    const startLocationTracking = async () => {
      const permissionResponse = await Location.requestForegroundPermissionsAsync();
      if (permissionResponse.status !== "granted") {
        if (permissionResponse.status === "denied" && !permissionResponse.canAskAgain && Platform.OS !== "web") {
          setLocationPermissionDenied(true);
        } else if (Platform.OS === "web") {
          window.alert("Location permission is required for live tracking.");
        } else {
          Alert.alert("Permission Denied", "Location permission is required for live tracking.");
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(currentLocation);
      publishLocation(location);

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 2000,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          const newLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(newLocation);
          publishLocation(loc);
        }
      );
    };

    startLocationTracking();

    return () => {
      locationSubscription?.remove();
    };
  }, [route.params.rideId, profile?.id, profile?.name]);

  useEffect(() => {
    const rideId = route.params.rideId;
    const unsubscribe = subscribeToRiderLocations(rideId, (locations) => {
      setRiderLocations(locations);
    });

    return () => {
      unsubscribe();
    };
  }, [route.params.rideId]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!ride) return;
      
      const srcCoords = ride.sourceCoords;
      const destCoords = ride.destinationCoords;
      
      if (srcCoords && destCoords) {
        setSourceCoord(srcCoords);
        setDestinationCoord(destCoords);
        setIsLoadingRoute(true);
        
        try {
          const waypointCoordsList = ride.waypointCoords || [];
          const directionsResult = await getDirections(srcCoords, destCoords, waypointCoordsList);
          
          if (directionsResult && directionsResult.coordinates.length > 0) {
            setRouteCoordinates(directionsResult.coordinates);
          } else {
            setRouteCoordinates(generateFallbackRoute(srcCoords, destCoords));
          }
        } catch (error) {
          console.error("Error fetching directions:", error);
          setRouteCoordinates(generateFallbackRoute(srcCoords, destCoords));
        } finally {
          setIsLoadingRoute(false);
        }
      } else if (userLocation && !hasSetupFallbackRoute.current) {
        hasSetupFallbackRoute.current = true;
        const destLat = userLocation.latitude + 0.02;
        const destLng = userLocation.longitude + 0.015;
        setSourceCoord(userLocation);
        setDestinationCoord({ latitude: destLat, longitude: destLng });
        setRouteCoordinates(generateFallbackRoute(userLocation, { latitude: destLat, longitude: destLng }));
      }
    };
    
    fetchRoute();
  }, [ride, userLocation]);

  const generateFallbackRoute = (start: Coordinate, end: Coordinate): Coordinate[] => {
    const points: Coordinate[] = [];
    const numPoints = 8;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = start.latitude + (end.latitude - start.latitude) * t;
      const lng = start.longitude + (end.longitude - start.longitude) * t;
      
      const curve = i > 0 && i < numPoints ? Math.sin(t * Math.PI) * 0.003 : 0;
      
      points.push({
        latitude: lat + curve,
        longitude: lng,
      });
    }
    
    return points;
  };

  useEffect(() => {
    if (mapRef.current && userLocation && Platform.OS !== "web") {
      const allCoords: Coordinate[] = [userLocation];
      
      if (destinationCoord) {
        allCoords.push(destinationCoord);
      }
      
      riderLocations.forEach((loc) => {
        allCoords.push({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      });
      
      if (allCoords.length > 1) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(allCoords, {
            edgePadding: { top: 200, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }, 500);
      }
    }
  }, [userLocation, destinationCoord, riderLocations]);

  const handleEndRide = async () => {
    const doEndRide = async () => {
      try {
        if (ride) {
          await updateRide(ride.id, { status: "completed" });
        }
        navigation.popToTop();
      } catch (error) {
        console.error("Error ending ride:", error);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to end this ride? All riders will be notified.")) {
        await doEndRide();
      }
    } else {
      Alert.alert(
        "End Ride",
        "Are you sure you want to end this ride? All riders will be notified.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "End Ride",
            style: "destructive",
            onPress: doEndRide,
          },
        ]
      );
    }
  };

  const handleSOS = () => {
    const doSOS = () => {
      if (Platform.OS === "web") {
        window.alert("SOS Sent! All riders have been notified of your emergency.");
      } else {
        Alert.alert("SOS Sent", "All riders have been notified of your emergency.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Send SOS Alert? Your location will be shared with all riders and emergency contacts.")) {
        doSOS();
      }
    } else {
      Alert.alert(
        "Send SOS Alert?",
        "Your location will be shared with all riders and emergency contacts.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send SOS",
            style: "destructive",
            onPress: doSOS,
          },
        ]
      );
    }
  };

  const handleOpenChat = () => {
    navigation.navigate("GroupChat", { rideId: route.params.rideId });
  };

  const handleRiderPress = (rider: Rider | { id: string; name: string }) => {
    navigation.navigate("RiderProfile", { riderId: rider.id });
  };

  const handleCenterMap = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Could not open settings:", error);
    }
  };

  if (locationPermissionDenied) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
            <Feather name="map-pin" size={24} color="#FFFFFF" />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.md, textAlign: "center" }}>
            Location Permission Required
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            Please enable location access in Settings to track your ride in real-time.
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1, marginTop: Spacing.lg },
            ]}
            onPress={handleOpenSettings}
          >
            <Feather name="settings" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Open Settings
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: Spacing.md }}>
            <ThemedText type="link">Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (isLoadingRide) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText type="h3">Loading ride...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!ride) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.danger }]}>
            <ThemedText type="h3" style={{ color: "#FFFFFF" }}>!</ThemedText>
          </View>
          <ThemedText type="h3">Ride not found</ThemedText>
          <Pressable onPress={() => navigation.goBack()}>
            <ThemedText type="link">Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const defaultRegion = {
    latitude: userLocation?.latitude || 37.78825,
    longitude: userLocation?.longitude || -122.4324,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const riders = ride.riders || [];
  
  const realRiderLocations = riderLocations.map((loc) => ({
    id: loc.riderId,
    name: loc.riderName,
    latitude: loc.latitude,
    longitude: loc.longitude,
  }));

  return (
    <View style={styles.container}>
      <MapViewNative
        mapRef={mapRef}
        initialRegion={defaultRegion}
        isDark={isDark}
        userLocation={userLocation}
        destinationCoord={destinationCoord}
        routeCoordinates={routeCoordinates}
        riderLocations={realRiderLocations}
        currentUserId={profile?.id}
        theme={{
          accent: theme.accent,
          primary: theme.primary,
          riderMarker: theme.riderMarker,
        }}
        onRiderPress={handleRiderPress}
      />

      <View style={[styles.topControls, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={[styles.headerCard, { backgroundColor: theme.backgroundRoot + "F5" }]}>
          <View style={styles.headerRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
            <View style={styles.headerInfo}>
              <ThemedText type="h4">Ride Active</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {ride.source} → {ride.destination}
              </ThemedText>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.endButton,
                { backgroundColor: theme.danger, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleEndRide}
            >
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                END
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleOpenChat}
            >
              <Feather name="message-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Chat
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.danger, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleSOS}
            >
              <Feather name="alert-triangle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                SOS
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => setShowRidersList(!showRidersList)}
            >
              <Feather name="users" size={18} color={theme.text} style={{ marginRight: 6 }} />
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {riders.length}
              </ThemedText>
            </Pressable>
          </View>

          {showRidersList ? (
            <View style={styles.ridersList}>
              {riders.map((rider) => (
                <Pressable
                  key={rider.id}
                  style={({ pressed }) => [
                    styles.riderItem,
                    { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleRiderPress(rider)}
                >
                  <View style={[styles.riderAvatar, { backgroundColor: theme.primary }]}>
                    <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      {(rider.name || "R").charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={styles.riderDetails}>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>
                      {rider.name || "Unknown Rider"}
                      {rider.id === profile?.id ? " (You)" : ""}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {rider.vehicleName || "Vehicle"} - {rider.vehicleNumber || "N/A"}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {Platform.OS !== "web" ? (
        <Pressable
          style={({ pressed }) => [
            styles.centerButton,
            { 
              backgroundColor: theme.backgroundRoot,
              bottom: insets.bottom + Spacing.xl,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleCenterMap}
        >
          <Feather name="navigation" size={24} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  endButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginRight: Spacing.sm,
  },
  ridersList: {
    marginTop: Spacing.md,
  },
  riderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  riderDetails: {
    flex: 1,
  },
  centerButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  settingsButton: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
});
