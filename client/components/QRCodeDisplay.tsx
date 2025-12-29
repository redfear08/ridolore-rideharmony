import React from "react";
import { View, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  showCode?: boolean;
}

export default function QRCodeDisplay({ value, size = 200, showCode = true }: QRCodeDisplayProps) {
  const { theme } = useTheme();
  
  const displayValue = value || "RIDESYNC";
  const displayCode = value.length > 12 ? value.slice(-8).toUpperCase() : value.toUpperCase();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.qrContainer,
          {
            width: size + Spacing.lg * 2,
            height: size + Spacing.lg * 2,
            backgroundColor: "#FFFFFF",
          },
        ]}
      >
        <QRCode
          value={displayValue}
          size={size}
          color="#000000"
          backgroundColor="#FFFFFF"
          ecl="M"
        />
      </View>
      {showCode ? (
        <View style={styles.dataContainer}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Code: {displayCode}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  qrContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dataContainer: {
    marginTop: Spacing.xs,
  },
});
