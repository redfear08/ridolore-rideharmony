import React, { useState, useCallback } from "react";
import { StyleSheet, View, Image, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides, useProfile } from "@/hooks/useStorage";

type RiderProfileRouteProp = RouteProp<RootStackParamList, "RiderProfile">;

export default function RiderProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<RiderProfileRouteProp>();
  const { rides, refreshRides } = useRides();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRides();
    setRefreshing(false);
  }, [refreshRides]);

  const allRiders = rides.flatMap((r) => r.riders);
  const rider = allRiders.find((r) => r.id === route.params.riderId);
  const isCurrentUser = rider?.id === profile?.id;

  if (!rider) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="user-x" size={48} color={theme.textSecondary} />
          <ThemedText type="h3">Rider not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressViewOffset={headerHeight}
          />
        }
      >
        <View style={styles.profileHeader}>
          {rider.profilePicture ? (
            <Image source={{ uri: rider.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.riderMarker }]}>
              <ThemedText type="h1" style={{ color: "#FFFFFF" }}>
                {rider.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText type="h2" style={styles.name}>
            {rider.name}
            {isCurrentUser && " (You)"}
          </ThemedText>
        </View>

        <Card style={styles.vehicleCard}>
          <View style={styles.cardHeader}>
            <Feather name="truck" size={20} color={theme.primary} />
            <ThemedText type="h4">Vehicle Details</ThemedText>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Vehicle Name
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {rider.vehicleName}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Vehicle Number
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {rider.vehicleNumber}
              </ThemedText>
            </View>
          </View>
        </Card>

        <Card style={styles.statusCard}>
          <View style={styles.cardHeader}>
            <Feather name="activity" size={20} color={theme.accent} />
            <ThemedText type="h4">Status</ThemedText>
          </View>
          <View style={styles.statusContent}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
              <ThemedText type="body">Currently on ride</ThemedText>
            </View>
            <View style={styles.locationInfo}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Location tracking active
              </ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.lg,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  name: {
    textAlign: "center",
  },
  vehicleCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailsGrid: {
    gap: Spacing.lg,
  },
  detailItem: {
    gap: Spacing.xs,
  },
  statusCard: {
    padding: Spacing.lg,
  },
  statusContent: {
    gap: Spacing.md,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
