import React from "react";
import { StyleSheet, ScrollView, View, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides } from "@/hooks/useStorage";

export default function HomeScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rides } = useRides();

  const upcomingRides = rides.filter((r) => r.status === "waiting" || r.status === "active");

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Upcoming Rides</ThemedText>
          </View>
          {upcomingRides.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {upcomingRides.map((ride) => (
                <Card
                  key={ride.id}
                  style={styles.rideCard}
                  onPress={() => navigation.navigate("ActiveRide", { rideId: ride.id })}
                >
                  <View style={styles.rideCardContent}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="navigation" size={20} color={theme.primary} />
                    </View>
                    <ThemedText type="h4" style={styles.rideCardTitle} numberOfLines={1}>
                      {ride.destination}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                      From {ride.source}
                    </ThemedText>
                    <View style={styles.rideCardMeta}>
                      <Feather name="users" size={14} color={theme.textSecondary} />
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                        {ride.riders?.length || 1} riders
                      </ThemedText>
                    </View>
                  </View>
                </Card>
              ))}
            </ScrollView>
          ) : (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyContent}>
                <Feather name="map" size={40} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                  No upcoming rides
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                  Create your first ride or scan a QR code to join
                </ThemedText>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Quick Actions</ThemedText>
          </View>
          <View style={styles.quickActions}>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => navigation.navigate("JoinRide")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.primary }]}>
                <Feather name="camera" size={24} color="#FFFFFF" />
              </View>
              <ThemedText type="body" style={styles.quickActionText}>
                Scan QR
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Join a ride group
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => navigation.navigate("CreateRide")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.accent }]}>
                <Feather name="plus" size={24} color="#FFFFFF" />
              </View>
              <ThemedText type="body" style={styles.quickActionText}>
                Create Ride
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Start a new group
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Recent Activity</ThemedText>
          </View>
          <Card style={styles.activityCard}>
            {rides.length > 0 ? (
              rides.slice(0, 3).map((ride, index) => (
                <React.Fragment key={ride.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  <View style={styles.activityItem}>
                    <View style={[styles.activityIcon, { backgroundColor: theme.primary + "20" }]}>
                      <Feather
                        name={ride.status === "completed" ? "check-circle" : "navigation"}
                        size={18}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <ThemedText type="body" numberOfLines={1}>
                        {ride.status === "completed" ? "Completed ride to" : "Created ride to"} {ride.destination}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {new Date(ride.createdAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  No recent activity
                </ThemedText>
              </View>
            )}
          </Card>
        </View>
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
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  horizontalScroll: {
    paddingRight: Spacing.xl,
    gap: Spacing.md,
  },
  rideCard: {
    width: 180,
    padding: Spacing.lg,
  },
  rideCardContent: {
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  rideCardTitle: {
    marginTop: Spacing.xs,
  },
  rideCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  emptyCard: {
    padding: Spacing["2xl"],
  },
  emptyContent: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  activityCard: {
    padding: Spacing.lg,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  emptyActivity: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
});
