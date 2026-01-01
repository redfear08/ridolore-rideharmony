import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing["2xl"] }]}>
        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="navigation" size={64} color={theme.primary} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(800)} style={styles.textContainer}>
          <ThemedText type="h1" style={styles.title}>
            Ridolore
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Create and join group rides with real-time tracking, chat, and SOS alerts
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.features}>
          <FeatureItem icon="map-pin" text="Live location tracking" theme={theme} />
          <FeatureItem icon="users" text="Ride with your crew" theme={theme} />
          <FeatureItem icon="message-circle" text="Group chat on the go" theme={theme} />
          <FeatureItem icon="shield" text="SOS emergency alerts" theme={theme} />
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInDown.delay(800).duration(800)}
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Button
          onPress={() => navigation.navigate("Register")}
          style={styles.primaryButton}
        >
          Get Started
        </Button>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => navigation.navigate("Login")}
        >
          <ThemedText type="body" style={{ color: theme.primary }}>
            Already have an account? Sign In
          </ThemedText>
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

function FeatureItem({ icon, text, theme }: { icon: string; text: string; theme: any }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: theme.accent + "20" }]}>
        <Feather name={icon as any} size={20} color={theme.accent} />
      </View>
      <ThemedText type="body">{text}</ThemedText>
    </View>
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
  logoContainer: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
  },
  subtitle: {
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  features: {
    marginTop: Spacing["2xl"],
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  primaryButton: {
    width: "100%",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
