import React, { useState, useCallback } from "react";
import { StyleSheet, View, FlatList, RefreshControl, Alert, Platform, ActionSheetIOS } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides, Ride } from "@/hooks/useStorage";
import { useProfile } from "@/hooks/useStorage";

export default function MyRidesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rides, refreshRides, deleteRide } = useRides();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRides();
    setRefreshing(false);
  }, [refreshRides]);

  const handleLongPress = useCallback((item: Ride) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const isCreator = profile?.id === item.creatorId;
    
    const showRideInfo = () => {
      const ridersCount = item.riders?.length || 1;
      const waypointsCount = item.waypoints?.length || 0;
      const message = `From: ${item.source}\nTo: ${item.destination}\n\nRiders: ${ridersCount}\nStops: ${waypointsCount}\nStatus: ${item.status === "active" ? "In Progress" : item.status === "waiting" ? "Waiting" : "Completed"}\nCreated: ${new Date(item.createdAt).toLocaleDateString()}${item.distanceText ? `\nDistance: ${item.distanceText}` : ""}${item.estimatedDuration ? `\nETA: ${item.estimatedDuration}` : ""}`;
      
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Ride Details", message, [{ text: "OK" }]);
      }
    };

    const confirmDelete = () => {
      if (!isCreator) {
        const errorMsg = "Only the ride creator can delete this ride";
        if (Platform.OS === "web") {
          window.alert(errorMsg);
        } else {
          Alert.alert("Error", errorMsg);
        }
        return;
      }
      
      const doDelete = async () => {
        try {
          await deleteRide(item.id);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error: any) {
          const errorMessage = error?.message || "Failed to delete ride";
          if (Platform.OS === "web") {
            window.alert(errorMessage);
          } else {
            Alert.alert("Error", errorMessage);
          }
        }
      };

      if (Platform.OS === "web") {
        if (window.confirm("Are you sure you want to delete this ride? This action cannot be undone.")) {
          doDelete();
        }
      } else {
        Alert.alert(
          "Delete Ride",
          "Are you sure you want to delete this ride? This action cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: doDelete }
          ]
        );
      }
    };

    if (Platform.OS === "ios") {
      const options = isCreator 
        ? ["Cancel", "View Details", "Delete Ride"]
        : ["Cancel", "View Details"];
      const destructiveIndex = isCreator ? 2 : undefined;
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: destructiveIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            showRideInfo();
          } else if (buttonIndex === 2 && isCreator) {
            confirmDelete();
          }
        }
      );
    } else if (Platform.OS === "web") {
      if (isCreator) {
        const action = window.prompt("Enter action:\n1 - View Details\n2 - Delete Ride\n\nType 1 or 2:");
        if (action === "1") {
          showRideInfo();
        } else if (action === "2") {
          confirmDelete();
        }
      } else {
        showRideInfo();
      }
    } else {
      const buttons: any[] = [
        { text: "Cancel", style: "cancel" },
        { text: "View Details", onPress: showRideInfo },
      ];
      
      if (isCreator) {
        buttons.push({ text: "Delete Ride", style: "destructive", onPress: confirmDelete });
      }
      
      Alert.alert("Ride Options", "Choose an action", buttons);
    }
  }, [profile?.id, deleteRide]);

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
        onLongPress={() => handleLongPress(item)}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressViewOffset={headerHeight}
          />
        }
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
