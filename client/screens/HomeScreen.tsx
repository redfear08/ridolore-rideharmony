import React, { useState, useCallback, useRef } from "react";
import { StyleSheet, ScrollView, View, Pressable, RefreshControl, Dimensions } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides } from "@/hooks/useStorage";
import { MainTabParamList } from "@/navigation/MainTabNavigator";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

export default function HomeScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { moderateScale, wp, isSmallScreen } = useResponsive();
  const stackNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { rides, refreshRides } = useRides();
  const [refreshing, setRefreshing] = useState(false);
  const hasNavigated = useRef(false);

  const navigateToFeed = useCallback(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      tabNavigation.navigate("Feed");
      setTimeout(() => {
        hasNavigated.current = false;
      }, 500);
    }
  }, [tabNavigation]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((event) => {
      if (event.translationX < -100 && Math.abs(event.velocityX) > 300) {
        runOnJS(navigateToFeed)();
      }
    });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRides();
    setRefreshing(false);
  }, [refreshRides]);

  const upcomingRides = rides.filter((r) => r.status === "waiting" || r.status === "active");
  const spacing = {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(20),
    "2xl": moderateScale(24),
  };
  const rideCardWidth = isSmallScreen ? wp(42) : Math.min(wp(45), 200);

  return (
    <GestureDetector gesture={swipeGesture}>
      <ThemedView style={styles.container}>
        <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + spacing.xl,
            paddingBottom: tabBarHeight + spacing.xl + 80,
            paddingHorizontal: spacing.xl,
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
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Upcoming Rides</ThemedText>
          </View>
          {upcomingRides.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: spacing.xl }}
            >
              {upcomingRides.map((ride, index) => (
                <Card
                  key={ride.id}
                  style={{ width: rideCardWidth, padding: spacing.lg, marginRight: index < upcomingRides.length - 1 ? spacing.md : 0 }}
                  onPress={() => stackNavigation.navigate("ActiveRide", { rideId: ride.id })}
                >
                  <View>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="navigation" size={isSmallScreen ? 18 : 20} color={theme.primary} />
                    </View>
                    <ThemedText type="h4" style={{ marginTop: spacing.xs }} numberOfLines={1}>
                      {ride.destination}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                      From {ride.source}
                    </ThemedText>
                    <View style={[styles.rideCardMeta, { marginTop: spacing.sm }]}>
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
            <Card style={{ padding: spacing["2xl"] }}>
              <View style={styles.emptyContent}>
                <Feather name="map" size={isSmallScreen ? 36 : 40} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: spacing.md }}>
                  No upcoming rides
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                  Create your first ride or scan a QR code to join
                </ThemedText>
              </View>
            </Card>
          )}
        </View>

        <View style={[styles.section, { marginBottom: spacing["2xl"] }]}>
          <View style={[styles.sectionHeader, { marginBottom: spacing.lg }]}>
            <ThemedText type="h3">Quick Actions</ThemedText>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1, padding: spacing.lg, flex: 1 },
              ]}
              onPress={() => stackNavigation.navigate("JoinRide")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.primary }]}>
                <Feather name="camera" size={22} color="#FFFFFF" />
              </View>
              <ThemedText type="body" style={[styles.quickActionText, { marginTop: spacing.sm }]}>
                Scan QR
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: spacing.xs }}>
                Join a ride group
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: spacing["2xl"] }]}>
          <View style={[styles.sectionHeader, { marginBottom: spacing.lg }]}>
            <ThemedText type="h3">Recent Activity</ThemedText>
          </View>
          <Card style={{ padding: spacing.lg }}>
            {rides.length > 0 ? (
              rides.slice(0, 3).map((ride, index) => (
                <React.Fragment key={ride.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: spacing.sm }]} />}
                  <View style={[styles.activityItem, { paddingVertical: spacing.sm }]}>
                    <View style={[styles.activityIcon, { backgroundColor: theme.primary + "20", width: moderateScale(36), height: moderateScale(36) }]}>
                      <Feather
                        name={ride.status === "completed" ? "check-circle" : "navigation"}
                        size={isSmallScreen ? 16 : 18}
                        color={theme.primary}
                      />
                    </View>
                    <View style={[styles.activityContent, { marginLeft: spacing.md }]}>
                      <ThemedText type="body" numberOfLines={1}>
                        {ride.status === "completed" ? "Completed ride to" : "Created ride to"} {ride.destination}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {new Date(ride.createdAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                </React.Fragment>
              ))
            ) : (
              <View style={[styles.emptyActivity, { paddingVertical: spacing.lg }]}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  No recent activity
                </ThemedText>
              </View>
            )}
          </Card>
        </View>
        </ScrollView>
      </ThemedView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rideCardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
  },
  quickAction: {
    flex: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
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
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  divider: {
    height: 1,
  },
  emptyActivity: {
    alignItems: "center",
  },
});
