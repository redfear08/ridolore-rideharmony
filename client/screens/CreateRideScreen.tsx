import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProfile, useRides } from "@/hooks/useStorage";

interface SelectedLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function CreateRideScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { moderateScale, isSmallScreen } = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();
  const { createRide } = useRides();

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [sourceLocation, setSourceLocation] = useState<SelectedLocation | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<SelectedLocation | null>(null);
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [newWaypoint, setNewWaypoint] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (Platform.OS === "web") {
          window.alert("Location permission is required to use this feature.");
        } else {
          Alert.alert("Permission Denied", "Location permission is required to use this feature.");
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const locationString = [address.street, address.city, address.region]
          .filter(Boolean)
          .join(", ");
        setSource(locationString || "Current Location");
        setSourceLocation({
          name: address.street || "Current Location",
          address: [address.city, address.region].filter(Boolean).join(", "),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setSource("Current Location");
        setSourceLocation({
          name: "Current Location",
          address: "",
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      if (Platform.OS === "web") {
        window.alert("Could not get your current location. Please enter it manually.");
      } else {
        Alert.alert("Error", "Could not get your current location. Please enter it manually.");
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddWaypoint = () => {
    if (newWaypoint.trim()) {
      setWaypoints([...waypoints, newWaypoint.trim()]);
      setNewWaypoint("");
    }
  };

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const handleCreateRide = async () => {
    if (!profile) {
      if (Platform.OS === "web") {
        if (window.confirm("Please complete your profile before creating a ride. Setup now?")) {
          navigation.navigate("ProfileSetup");
        }
      } else {
        Alert.alert("Profile Required", "Please complete your profile before creating a ride.", [
          { text: "Cancel", style: "cancel" },
          { text: "Setup Profile", onPress: () => navigation.navigate("ProfileSetup") },
        ]);
      }
      return;
    }

    if (!source.trim() || !destination.trim()) {
      if (Platform.OS === "web") {
        window.alert("Please enter both source and destination.");
      } else {
        Alert.alert("Missing Information", "Please enter both source and destination.");
      }
      return;
    }

    const ride = await createRide(
      {
        source: source.trim(),
        destination: destination.trim(),
        waypoints,
        departureTime: new Date().toISOString(),
        createdBy: profile.id,
      },
      profile
    );

    navigation.replace("QRCodeShare", { rideId: ride.id });
  };

  const isValid = source.trim() && destination.trim();

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.form, { zIndex: 100 }]}>
          <View style={[styles.inputGroup, { zIndex: 102 }]}>
            <ThemedText type="small" style={styles.label}>
              Starting Point *
            </ThemedText>
            <LocationAutocomplete
              value={source}
              onChangeText={setSource}
              onSelectLocation={(loc) => setSourceLocation(loc)}
              placeholder="Search starting location"
              showCurrentLocation={true}
              onCurrentLocationPress={handleUseCurrentLocation}
              isLocating={isLocating}
            />
          </View>

          <View style={[styles.inputGroup, { zIndex: 101 }]}>
            <ThemedText type="small" style={styles.label}>
              Destination *
            </ThemedText>
            <LocationAutocomplete
              value={destination}
              onChangeText={setDestination}
              onSelectLocation={(loc) => setDestinationLocation(loc)}
              placeholder="Search destination"
            />
          </View>

          <View style={[styles.inputGroup, { zIndex: 100 }]}>
            <ThemedText type="small" style={styles.label}>
              Waypoints (Optional)
            </ThemedText>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputFlex,
                  {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Add a stop along the way"
                placeholderTextColor={theme.textSecondary}
                value={newWaypoint}
                onChangeText={setNewWaypoint}
                onSubmitEditing={handleAddWaypoint}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: newWaypoint.trim() ? (pressed ? 0.7 : 1) : 0.5,
                  },
                ]}
                onPress={handleAddWaypoint}
                disabled={!newWaypoint.trim()}
              >
                <Feather name="plus" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {waypoints.length > 0 ? (
              <View style={styles.waypointsList}>
                {waypoints.map((wp, index) => (
                  <View
                    key={index}
                    style={[styles.waypointItem, { backgroundColor: theme.backgroundDefault }]}
                  >
                    <View style={styles.waypointContent}>
                      <View style={[styles.waypointDot, { backgroundColor: theme.accent }]} />
                      <ThemedText type="body" numberOfLines={1} style={styles.waypointText}>
                        {wp}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveWaypoint(index)}
                      hitSlop={8}
                    >
                      <Feather name="x" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <Card style={styles.previewCard}>
          <ThemedText type="h4" style={styles.previewTitle}>
            Route Preview
          </ThemedText>
          <View style={styles.routePreview}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
              <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
                {source || "Starting point"}
              </ThemedText>
            </View>
            {waypoints.map((wp, index) => (
              <React.Fragment key={index}>
                <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: theme.accent }]} />
                  <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
                    {wp}
                  </ThemedText>
                </View>
              </React.Fragment>
            ))}
            <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: theme.danger }]} />
              <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
                {destination || "Destination"}
              </ThemedText>
            </View>
          </View>
        </Card>

        <Button onPress={handleCreateRide} disabled={!isValid} style={styles.createButton}>
          Create & Share QR Code
        </Button>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  form: {
    marginBottom: Spacing["2xl"],
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontWeight: "600",
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
  },
  inputFlex: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  addButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  waypointsList: {
    marginTop: Spacing.sm,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.sm,
  },
  waypointContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  waypointText: {
    flex: 1,
  },
  previewCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  previewTitle: {
    marginBottom: Spacing.lg,
  },
  routePreview: {},
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  routeLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
  },
  routeText: {
    flex: 1,
  },
  createButton: {
    marginTop: Spacing.lg,
  },
});
