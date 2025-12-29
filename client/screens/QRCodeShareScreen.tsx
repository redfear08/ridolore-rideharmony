import React, { useEffect, useState } from "react";
import { StyleSheet, View, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides, generateQRData } from "@/hooks/useStorage";
import QRCodeDisplay from "@/components/QRCodeDisplay";

type QRCodeShareRouteProp = RouteProp<RootStackParamList, "QRCodeShare">;

export default function QRCodeShareScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<QRCodeShareRouteProp>();
  const { getRide } = useRides();
  const [ride, setRide] = useState(getRide(route.params.rideId));

  useEffect(() => {
    const updatedRide = getRide(route.params.rideId);
    setRide(updatedRide);
  }, [route.params.rideId, getRide]);

  const handleShare = async () => {
    try {
      const joinCode = ride?.joinCode || route.params.rideId;
      const qrData = generateQRData(route.params.rideId, ride?.joinCode);
      await Share.share({
        message: `Join my ride group on RideSync! Use code: ${joinCode}`,
        title: "Join My Ride",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleStartRide = () => {
    navigation.replace("ActiveRide", { rideId: route.params.rideId });
  };

  if (!ride) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.danger} />
          <ThemedText type="h3">Ride not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const qrData = generateQRData(route.params.rideId, ride.joinCode);
  const riderCount = ride.riders?.length || 1;
  const joinCode = ride.joinCode || route.params.rideId;

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.qrSection}>
          <Card style={styles.qrCard}>
            <QRCodeDisplay value={qrData} size={200} />
          </Card>
          <View style={[styles.codeContainer, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Join Code:
            </ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary, letterSpacing: 2 }}>
              {joinCode}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Share this QR code or join code with other riders
          </ThemedText>
        </View>

        <Card style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Feather name="navigation" size={20} color={theme.primary} />
            <ThemedText type="h4">Route</ThemedText>
          </View>
          <View style={styles.routeDetails}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
              <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
                {ride.source}
              </ThemedText>
            </View>
            {ride.waypoints && ride.waypoints.length > 0 && (
              <>
                <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.lg }}>
                  {ride.waypoints.length} stop(s)
                </ThemedText>
              </>
            )}
            <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: theme.accent }]} />
              <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
                {ride.destination}
              </ThemedText>
            </View>
          </View>
        </Card>

        <View style={styles.riderInfo}>
          <View style={[styles.riderBadge, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="users" size={18} color={theme.primary} />
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {riderCount} {riderCount === 1 ? "Rider" : "Riders"} Joined
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            onPress={handleShare}
            style={[styles.shareButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.buttonContent}>
              <Feather name="share-2" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.sm }}>
                Share QR Code
              </ThemedText>
            </View>
          </Button>
          <Button onPress={handleStartRide} style={styles.startButton}>
            Start Ride
          </Button>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  qrSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    gap: Spacing.lg,
  },
  qrCard: {
    padding: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  codeContainer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  routeCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  routeDetails: {
    gap: Spacing.xs,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 16,
    marginLeft: 5,
  },
  routeText: {
    flex: 1,
  },
  riderInfo: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  riderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  actions: {
    gap: Spacing.md,
    marginTop: "auto",
  },
  shareButton: {
    borderWidth: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  startButton: {},
});
