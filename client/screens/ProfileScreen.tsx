import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, Image } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProfile, useRides } from "@/hooks/useStorage";

export default function ProfileScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, updateProfile, clearProfile } = useProfile();
  const { rides } = useRides();
  const [isEditing, setIsEditing] = useState(false);

  const completedRides = rides.filter((r) => r.status === "completed").length;
  const totalRides = rides.length;

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateProfile({ profilePicture: result.assets[0].uri });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out? Your profile data will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            clearProfile();
            navigation.reset({
              index: 0,
              routes: [{ name: "Main" }],
            });
          },
        },
      ]
    );
  };

  if (!profile) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.setupContainer,
            {
              paddingTop: headerHeight + Spacing["3xl"],
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
        >
          <View style={[styles.setupIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="user" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h2" style={styles.setupTitle}>
            Complete Your Profile
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Set up your profile to join ride groups and connect with other riders
          </ThemedText>
          <Button
            style={styles.setupButton}
            onPress={() => navigation.navigate("ProfileSetup")}
          >
            Get Started
          </Button>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
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
        <View style={styles.profileHeader}>
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
            {profile.profilePicture ? (
              <Image source={{ uri: profile.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <ThemedText type="h1" style={{ color: "#FFFFFF" }}>
                  {profile.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="camera" size={14} color={theme.text} />
            </View>
          </Pressable>
          <ThemedText type="h2" style={styles.profileName}>
            {profile.name}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {profile.age} years old
          </ThemedText>
        </View>

        <Card style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Feather name="truck" size={20} color={theme.primary} />
            <ThemedText type="h4">Vehicle Info</ThemedText>
          </View>
          <View style={styles.vehicleDetails}>
            <View style={styles.vehicleRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Vehicle Name
              </ThemedText>
              <ThemedText type="body">{profile.vehicleName}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.vehicleRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Vehicle Number
              </ThemedText>
              <ThemedText type="body">{profile.vehicleNumber}</ThemedText>
            </View>
          </View>
        </Card>

        <Card style={styles.statsCard}>
          <ThemedText type="h4" style={styles.statsTitle}>
            Ride Stats
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {totalRides}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Total Rides
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.accent }}>
                {completedRides}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Completed
              </ThemedText>
            </View>
          </View>
        </Card>

        <View style={styles.menuSection}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => navigation.navigate("ProfileSetup")}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="edit-2" size={20} color={theme.text} />
              <ThemedText type="body">Edit Profile</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="log-out" size={20} color={theme.danger} />
              <ThemedText type="body" style={{ color: theme.danger }}>
                Log Out
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
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
  setupContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  setupIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  setupTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  setupButton: {
    marginTop: Spacing["2xl"],
    paddingHorizontal: Spacing["3xl"],
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    marginBottom: Spacing.xs,
  },
  vehicleCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  vehicleDetails: {
    gap: Spacing.sm,
  },
  vehicleRow: {
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  statsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsTitle: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  menuSection: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
});
