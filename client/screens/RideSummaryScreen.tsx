import React, { useEffect, useState, useMemo } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getRideStats, RideStats, getRide, Ride } from "@/lib/firebase";

type RideSummaryRouteProp = RouteProp<RootStackParamList, "RideSummary">;

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  theme: any;
}

function StatCard({ icon, label, value, color, theme }: StatCardProps) {
  return (
    <Card elevation={1} style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={24} color={color} />
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        {label}
      </ThemedText>
      <ThemedText type="h4" style={{ fontWeight: "700", marginTop: Spacing.xs }}>
        {value}
      </ThemedText>
    </Card>
  );
}

function SafetyScoreRing({ score, theme }: { score: number; theme: any }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return theme.accent;
    if (s >= 70) return "#F59E0B";
    return theme.danger;
  };

  const color = getScoreColor(score);

  return (
    <View style={styles.safetyScoreContainer}>
      <View style={[styles.safetyScoreRing, { borderColor: color }]}>
        <ThemedText type="h1" style={{ color, fontWeight: "700" }}>
          {Math.round(score)}
        </ThemedText>
      </View>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        Safety Score
      </ThemedText>
    </View>
  );
}

export default function RideSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RideSummaryRouteProp>();
  const { rideId } = route.params;

  const [ride, setRide] = useState<Ride | null>(null);
  const [stats, setStats] = useState<RideStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rideData, statsData] = await Promise.all([
          getRide(rideId),
          getRideStats(rideId),
        ]);
        setRide(rideData);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching ride summary:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [rideId]);

  const aggregatedStats = useMemo(() => {
    if (stats.length === 0) {
      return {
        totalDistance: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        totalTime: 0,
        totalStops: 0,
        avgSafetyScore: 100,
      };
    }

    const totalDistance = stats.reduce((sum, s) => sum + s.distanceKm, 0);
    const avgSpeed = stats.reduce((sum, s) => sum + s.avgSpeedKmh, 0) / stats.length;
    const maxSpeed = Math.max(...stats.map((s) => s.maxSpeedKmh));
    const totalTime = stats.reduce((sum, s) => sum + s.totalTimeMinutes, 0);
    const totalStops = stats.reduce((sum, s) => sum + s.stopsCount, 0);
    const avgSafetyScore = stats.reduce((sum, s) => sum + s.safetyScore, 0) / stats.length;

    return {
      totalDistance,
      avgSpeed,
      maxSpeed,
      totalTime,
      totalStops,
      avgSafetyScore,
    };
  }, [stats]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Loading ride summary...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Feather name="flag" size={32} color={theme.accent} />
          <ThemedText type="h2" style={{ marginTop: Spacing.md }}>
            Ride Complete
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {ride?.title || "Group Ride"}
          </ThemedText>
        </View>

        <SafetyScoreRing score={aggregatedStats.avgSafetyScore} theme={theme} />

        <View style={styles.statsGrid}>
          <StatCard
            icon="navigation"
            label="Distance"
            value={`${aggregatedStats.totalDistance.toFixed(1)} km`}
            color={theme.primary}
            theme={theme}
          />
          <StatCard
            icon="clock"
            label="Duration"
            value={formatDuration(aggregatedStats.totalTime)}
            color={theme.accent}
            theme={theme}
          />
          <StatCard
            icon="activity"
            label="Avg Speed"
            value={`${Math.round(aggregatedStats.avgSpeed)} km/h`}
            color="#8B5CF6"
            theme={theme}
          />
          <StatCard
            icon="zap"
            label="Max Speed"
            value={`${Math.round(aggregatedStats.maxSpeed)} km/h`}
            color="#F59E0B"
            theme={theme}
          />
        </View>

        <Card elevation={2} style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Feather name="map-pin" size={18} color={theme.accent} />
            <View style={styles.routeTextContainer}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                From
              </ThemedText>
              <ThemedText type="body" numberOfLines={1}>
                {ride?.source || "Unknown"}
              </ThemedText>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Feather name="flag" size={18} color={theme.danger} />
            <View style={styles.routeTextContainer}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                To
              </ThemedText>
              <ThemedText type="body" numberOfLines={1}>
                {ride?.destination || "Unknown"}
              </ThemedText>
            </View>
          </View>
        </Card>

        <Card elevation={1} style={styles.ridersCard}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Riders ({stats.length})
          </ThemedText>
          {stats.map((riderStat, index) => (
            <View
              key={riderStat.riderId}
              style={[
                styles.riderRow,
                index < stats.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <View style={[styles.riderAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  {(riderStat.riderName || "R").charAt(0)}
                </ThemedText>
              </View>
              <View style={styles.riderInfo}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  {riderStat.riderName}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {riderStat.distanceKm.toFixed(1)} km | Avg {Math.round(riderStat.avgSpeedKmh)} km/h
                </ThemedText>
              </View>
              <View style={styles.riderScore}>
                <ThemedText
                  type="body"
                  style={{ color: riderStat.safetyScore >= 80 ? theme.accent : "#F59E0B", fontWeight: "600" }}
                >
                  {Math.round(riderStat.safetyScore)}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>

        <Pressable
          style={({ pressed }) => [
            styles.doneButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => navigation.navigate("Main")}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Done
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  safetyScoreContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  safetyScoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: Spacing.lg,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  routeCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeDivider: {
    height: 24,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginLeft: 8,
    marginVertical: Spacing.xs,
  },
  ridersCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  riderInfo: {
    flex: 1,
  },
  riderScore: {
    width: 40,
    alignItems: "center",
  },
  doneButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
});
