import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const { theme } = useTheme();
  
  const generatePattern = (data: string) => {
    const hash = data.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    return Math.abs(hash);
  };

  const pattern = generatePattern(value);
  const gridSize = 9;
  const cellSize = size / gridSize;

  const renderGrid = () => {
    const cells = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isCorner =
          (row < 3 && col < 3) ||
          (row < 3 && col > gridSize - 4) ||
          (row > gridSize - 4 && col < 3);
        
        const isCornerOuter =
          (row === 0 || row === 2 || row === gridSize - 1 || row === gridSize - 3) &&
          ((col < 3 && (col === 0 || col === 2)) || (col > gridSize - 4 && (col === gridSize - 1 || col === gridSize - 3)));
        
        const isCornerInner =
          row === 1 && col === 1 ||
          row === 1 && col === gridSize - 2 ||
          row === gridSize - 2 && col === 1;

        const patternBit = ((pattern >> ((row * gridSize + col) % 31)) & 1) === 1;
        
        const isFilled = isCorner || (!isCornerOuter && (isCornerInner || patternBit));

        cells.push(
          <View
            key={`${row}-${col}`}
            style={[
              styles.cell,
              {
                width: cellSize - 2,
                height: cellSize - 2,
                backgroundColor: isFilled ? theme.text : "transparent",
                borderRadius: 2,
              },
            ]}
          />
        );
      }
    }
    return cells;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.qrContainer,
          {
            width: size,
            height: size,
            backgroundColor: "#FFFFFF",
          },
        ]}
      >
        <View style={[styles.grid, { width: size, height: size }]}>
          {renderGrid()}
        </View>
      </View>
      <View style={styles.dataContainer}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Code: {value.slice(-8)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  qrContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  cell: {
    margin: 1,
  },
  dataContainer: {
    marginTop: Spacing.xs,
  },
});
