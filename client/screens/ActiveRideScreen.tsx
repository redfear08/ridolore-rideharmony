import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MapViewWrapper, Marker, Polyline } from "@/components/MapViewWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides, useProfile, Rider } from "@/hooks/useStorage";

type ActiveRideRouteProp = RouteProp<RootStackParamList, "ActiveRide">;

export default function ActiveRideScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ActiveRideRouteProp>();
  const { getRide, updateRide } = useRides();
  const { profile } = useProfile();
  
  const [ride, setRide] = useState(getRide(route.params.rideId));
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showRidersList, setShowRidersList] = useState(false);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.3, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for live tracking.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (loc) => {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    };

    startLocationTracking();

    return () => {
      locationSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const updatedRide = getRide(route.params.rideId);
    setRide(updatedRide);
  }, [route.params.rideId, getRide]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const handleEndRide = () => {
    Alert.alert(
      "End Ride",
      "Are you sure you want to end this ride? All riders will be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Ride",
          style: "destructive",
          onPress: async () => {
            if (ride) {
              await updateRide(ride.id, { status: "completed" });
            }
            navigation.popToTop();
          },
        },
      ]
    );
  };

  const handleSOS = () => {
    Alert.alert(
      "Send SOS Alert?",
      "Your location will be shared with all riders and emergency contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: () => {
            Alert.alert("SOS Sent", "All riders have been notified of your emergency.");
          },
        },
      ]
    );
  };

  const handleOpenChat = () => {
    navigation.navigate("GroupChat", { rideId: route.params.rideId });
  };

  const handleRiderPress = (rider: Rider) => {
    navigation.navigate("RiderProfile", { riderId: rider.id });
  };

  if (!ride) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.danger} />
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
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const mockRiderLocations = ride.riders.map((rider, index) => ({
    ...rider,
    latitude: (userLocation?.latitude || 37.78825) + (Math.random() - 0.5) * 0.01,
    longitude: (userLocation?.longitude || -122.4324) + (Math.random() - 0.5) * 0.01,
  }));

  return (
    <View style={styles.container}>
      <MapViewWrapper
        initialRegion={defaultRegion}
        userInterfaceStyle={isDark ? "dark" : "light"}
      >
        {Platform.OS !== "web" && userLocation ? (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userMarker}>
              <Animated.View
                style={[
                  styles.userMarkerPulse,
                  { backgroundColor: theme.primary },
                  pulseStyle,
                ]}
              />
              <View style={[styles.userMarkerDot, { backgroundColor: theme.primary }]} />
            </View>
          </Marker>
        ) : null}

        {Platform.OS !== "web" ? mockRiderLocations
          .filter((r) => r.id !== profile?.id)
          .map((rider) => (
            <Marker
              key={rider.id}
              coordinate={{ latitude: rider.latitude, longitude: rider.longitude }}
              onPress={() => handleRiderPress(rider)}
            >
              <View style={[styles.riderMarker, { backgroundColor: theme.riderMarker }]}>
                <Feather name="navigation" size={16} color="#FFFFFF" />
              </View>
            </Marker>
          )) : null}

        {Platform.OS !== "web" && userLocation ? (
          <Polyline
            coordinates={[
              userLocation,
              { latitude: userLocation.latitude + 0.02, longitude: userLocation.longitude + 0.01 },
            ]}
            strokeColor={theme.routeLine}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        ) : null}
      </MapViewWrapper>

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={[styles.headerCard, { backgroundColor: theme.backgroundRoot + "E6" }]}>
          <View style={styles.headerContent}>
            <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
            <ThemedText type="h4">Ride in Progress</ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [styles.endButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleEndRide}
          >
            <ThemedText type="small" style={{ color: theme.danger, fontWeight: "600" }}>
              End Ride
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.floatingButtons, { bottom: insets.bottom + Spacing.xl }]}>
        <Pressable
          style={({ pressed }) => [
            styles.chatButton,
            { backgroundColor: theme.backgroundRoot, opacity: pressed ? 0.8 : 1 },
            Shadows.fab,
          ]}
          onPress={handleOpenChat}
        >
          <Feather name="message-circle" size={24} color={theme.primary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.sosButton,
            { backgroundColor: theme.danger, opacity: pressed ? 0.8 : 1 },
            Shadows.fab,
          ]}
          onPress={handleSOS}
        >
          <Feather name="alert-triangle" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.ridersCard,
          {
            backgroundColor: theme.backgroundRoot,
            bottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
        onPress={() => setShowRidersList(!showRidersList)}
      >
        <View style={styles.ridersHeader}>
          <View style={styles.ridersInfo}>
            <Feather name="users" size={18} color={theme.primary} />
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {ride.riders.length} Riders
            </ThemedText>
          </View>
          <Feather
            name={showRidersList ? "chevron-down" : "chevron-up"}
            size={20}
            color={theme.textSecondary}
          />
        </View>

        {showRidersList && (
          <View style={styles.ridersList}>
            {ride.riders.map((rider) => (
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
                    {rider.name.charAt(0)}
                  </ThemedText>
                </View>
                <View style={styles.riderDetails}>
                  <ThemedText type="body" style={{ fontWeight: "500" }}>
                    {rider.name}
                    {rider.id === profile?.id && " (You)"}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {rider.vehicleName} - {rider.vehicleNumber}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Pressable>
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
    gap: Spacing.lg,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  endButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  floatingButtons: {
    position: "absolute",
    right: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sosButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  ridersCard: {
    position: "absolute",
    left: Spacing.xl,
    right: Spacing.xl + 80,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  ridersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ridersInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ridersList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  riderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  riderDetails: {
    flex: 1,
    gap: 2,
  },
  userMarker: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  userMarkerPulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  userMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  riderMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
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
