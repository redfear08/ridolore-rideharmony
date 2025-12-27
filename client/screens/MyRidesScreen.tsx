import React from "react";
import { StyleSheet, View, FlatList } from "react-native";
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
import { useRides, Ride } from "@/hooks/useStorage";

export default function MyRidesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rides } = useRides();

  const renderRideItem = ({ item }: { item: Ride }) => {
    const statusColor =
      item.status === "active"
        ? theme.accent
        : item.status === "waiting"
          ? theme.primary
          : theme.textSecondary;

    const statusText =
      item.status === "active"
        ? "In Progress"
        : item.status === "waiting"
          ? "Waiting"
          : "Completed";

    return (
      <Card
        style={styles.rideCard}
        onPress={() => {
          if (item.status === "active" || item.status === "waiting") {
            navigation.navigate("ActiveRide", { rideId: item.id });
          }
        }}
      >
        <View style={styles.rideHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ThemedText type="small" style={{ color: statusColor, fontWeight: "600" }}>
              {statusText}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>

        <View style={styles.rideRoute}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
            <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
              {item.source}
            </ThemedText>
          </View>
          <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: theme.accent }]} />
            <ThemedText type="body" numberOfLines={1} style={styles.routeText}>
              {item.destination}
            </ThemedText>
          </View>
        </View>

        <View style={styles.rideMeta}>
          <View style={styles.metaItem}>
            <Feather name="users" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {item.riders?.length || 1} riders
            </ThemedText>
          </View>
          {item.waypoints && item.waypoints.length > 0 && (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {item.waypoints.length} stops
              </ThemedText>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="navigation" size={48} color={theme.textSecondary} />
            </View>
            <ThemedText type="h3" style={styles.emptyTitle}>
              No Rides Yet
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
              Create your first ride or join an existing group to get started
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  rideCard: {
    padding: Spacing.lg,
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rideRoute: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 20,
    marginLeft: 4,
  },
  routeText: {
    flex: 1,
  },
  rideMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
});
