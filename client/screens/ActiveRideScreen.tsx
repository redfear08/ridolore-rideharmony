import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, Linking, Share, FlatList } from "react-native";
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
  leaveRide,
  RiderLocation 
} from "@/lib/firebase";

type ActiveRideRouteProp = RouteProp<RootStackParamList, "ActiveRide">;

interface Coordinate {
  latitude: number;
  longitude: number;
}

const RIDER_ITEM_HEIGHT = 60;

interface RiderItemProps {
  rider: Rider;
  isCurrentUser: boolean;
  theme: any;
  onPress: () => void;
}

const RiderItem = memo(function RiderItem({ rider, isCurrentUser, theme, onPress }: RiderItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.riderItem,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.riderAvatar, { backgroundColor: theme.primary }]}>
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          {(rider.name || "R").charAt(0)}
        </ThemedText>
      </View>
      <View style={styles.riderDetails}>
        <ThemedText type="body" style={{ fontWeight: "500" }}>
          {rider.name || "Unknown Rider"}
          {isCurrentUser ? " (You)" : ""}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {rider.vehicleName || "Vehicle"} - {rider.vehicleNumber || "N/A"}
        </ThemedText>
      </View>
    </Pressable>
  );
});

function areLocationsEqual(prev: RiderLocation[], next: RiderLocation[]): boolean {
  if (prev.length !== next.length) return false;
  
  const prevMap = new Map<string, RiderLocation>();
  prev.forEach((loc) => prevMap.set(loc.riderId, loc));
  
  for (const n of next) {
    const p = prevMap.get(n.riderId);
    if (!p) return false;
    const latDiff = Math.abs(p.latitude - n.latitude);
    const lngDiff = Math.abs(p.longitude - n.longitude);
    if (latDiff > 0.00001 || lngDiff > 0.00001) return false;
  }
  
  return true;
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
  const lastLocationUpdate = useRef<{ lat: number; lng: number; time: number; speed: number } | null>(null);
  const previousLocationsRef = useRef<RiderLocation[]>([]);

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

    const getAdaptiveThresholds = (speedMps: number | null) => {
      const speedKmh = (speedMps || 0) * 3.6;
      
      if (speedKmh < 5) {
        return { distance: 10, time: 10000 };
      } else if (speedKmh < 30) {
        return { distance: 8, time: 7000 };
      } else if (speedKmh < 60) {
        return { distance: 10, time: 5000 };
      } else {
        return { distance: 15, time: 4000 };
      }
    };

    const shouldUpdateFirebase = (lat: number, lng: number, speed: number | null): boolean => {
      const now = Date.now();
      const last = lastLocationUpdate.current;
      
      if (!last) return true;
      
      const thresholds = getAdaptiveThresholds(speed);
      const timeDiff = now - last.time;
      const distance = Math.sqrt(
        Math.pow((lat - last.lat) * 111320, 2) + 
        Math.pow((lng - last.lng) * 111320 * Math.cos(lat * Math.PI / 180), 2)
      );
      
      return distance >= thresholds.distance || timeDiff >= thresholds.time;
    };

    const publishLocation = async (loc: Location.LocationObject) => {
      if (!profile?.id || !profile?.name) return;
      
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const speed = loc.coords.speed;
      
      if (!shouldUpdateFirebase(lat, lng, speed)) return;
      
      try {
        await updateRiderLocation(rideId, profile.id, profile.name, {
          latitude: lat,
          longitude: lng,
          heading: loc.coords.heading ?? undefined,
          speed: speed ?? undefined,
          accuracy: loc.coords.accuracy ?? undefined,
        });
        lastLocationUpdate.current = { lat, lng, time: Date.now(), speed: speed || 0 };
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
        accuracy: Location.Accuracy.High,
      });
      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(currentLocation);
      publishLocation(location);

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
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
      const clonedLocations = locations.map((loc) => ({ ...loc }));
      if (!areLocationsEqual(previousLocationsRef.current, clonedLocations)) {
        previousLocationsRef.current = clonedLocations;
        setRiderLocations(clonedLocations);
      }
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

  const initialFitDone = useRef(false);
  useEffect(() => {
    if (mapRef.current && userLocation && Platform.OS !== "web" && !initialFitDone.current) {
      initialFitDone.current = true;
      const allCoords: Coordinate[] = [userLocation];
      
      if (destinationCoord) {
        allCoords.push(destinationCoord);
      }
      
      if (allCoords.length > 1) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(allCoords, {
            edgePadding: { top: 200, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }, 500);
      }
    }
  }, [userLocation, destinationCoord]);

  const isCaptain = profile?.id && ride?.creatorId === profile.id;

  const handleEndRide = useCallback(async () => {
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
  }, [ride, updateRide, navigation]);

  const handleLeaveRide = useCallback(async () => {
    const doLeaveRide = async () => {
      try {
        if (ride && profile?.id) {
          await leaveRide(ride.id, profile.id);
        }
        navigation.popToTop();
      } catch (error) {
        console.error("Error leaving ride:", error);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to leave this ride?")) {
        await doLeaveRide();
      }
    } else {
      Alert.alert(
        "Leave Ride",
        "Are you sure you want to leave this ride?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: doLeaveRide,
          },
        ]
      );
    }
  }, [ride, profile?.id, navigation]);

  const handleSOS = useCallback(() => {
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
  }, []);

  const handleOpenChat = useCallback(() => {
    navigation.navigate("GroupChat", { rideId: route.params.rideId });
  }, [navigation, route.params.rideId]);

  const handleShareQR = useCallback(async () => {
    try {
      const joinCode = ride?.joinCode || route.params.rideId;
      await Share.share({
        message: `Join my ride group on Ridolore! Use code: ${joinCode}\n\nOr scan the QR code in the app.`,
        title: "Join My Ride",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [ride?.joinCode, route.params.rideId]);

  const handleRiderPress = useCallback((rider: Rider | { id: string; name: string }) => {
    navigation.navigate("RiderProfile", { riderId: rider.id });
  }, [navigation]);

  const handleCenterMap = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  }, [userLocation]);

  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Could not open settings:", error);
    }
  }, []);

  const toggleRidersList = useCallback(() => {
    setShowRidersList((prev) => !prev);
  }, []);

  const riders = useMemo(() => ride?.riders || [], [ride?.riders]);
  
  const realRiderLocations = useMemo(() => 
    riderLocations.map((loc) => ({
      id: loc.riderId,
      name: loc.riderName,
      latitude: loc.latitude,
      longitude: loc.longitude,
    })),
    [riderLocations]
  );

  const mapTheme = useMemo(() => ({
    accent: theme.accent,
    primary: theme.primary,
    riderMarker: theme.riderMarker,
  }), [theme.accent, theme.primary, theme.riderMarker]);

  const renderRiderItem = useCallback(({ item }: { item: Rider }) => (
    <RiderItem
      rider={item}
      isCurrentUser={item.id === profile?.id}
      theme={theme}
      onPress={() => handleRiderPress(item)}
    />
  ), [profile?.id, theme, handleRiderPress]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: RIDER_ITEM_HEIGHT,
    offset: RIDER_ITEM_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: Rider) => item.id, []);

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
        theme={mapTheme}
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
              onPress={isCaptain ? handleEndRide : handleLeaveRide}
            >
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {isCaptain ? "END" : "LEAVE"}
              </ThemedText>
            </Pressable>
          </View>

          {(ride.estimatedDuration || ride.distanceText) ? (
            <View style={styles.etaRow}>
              {ride.estimatedDuration ? (
                <View style={styles.etaItem}>
                  <Feather name="clock" size={14} color={theme.primary} />
                  <ThemedText type="small" style={[styles.etaText, { color: theme.text }]}>
                    {ride.estimatedDuration}
                  </ThemedText>
                </View>
              ) : null}
              {ride.distanceText ? (
                <View style={styles.etaItem}>
                  <Feather name="map" size={14} color={theme.accent} />
                  <ThemedText type="small" style={[styles.etaText, { color: theme.text }]}>
                    {ride.distanceText}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleOpenChat}
            >
              <Feather name="message-circle" size={16} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleShareQR}
            >
              <Feather name="share-2" size={16} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.danger, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleSOS}
            >
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                SOS
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={toggleRidersList}
            >
              <Feather name="users" size={16} color={theme.text} style={{ marginRight: 4 }} />
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {riders.length}
              </ThemedText>
            </Pressable>
          </View>

          {showRidersList ? (
            <View style={styles.ridersList}>
              <FlatList
                data={riders}
                renderItem={renderRiderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                scrollEnabled={riders.length > 4}
                style={{ maxHeight: RIDER_ITEM_HEIGHT * 4 }}
              />
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
  etaRow: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  etaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  etaText: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
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
    height: RIDER_ITEM_HEIGHT,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
});
