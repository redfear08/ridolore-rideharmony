import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProfile, useRides, parseQRData, Ride } from "@/hooks/useStorage";

export default function JoinRideScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();
  const { rides, joinRide, findRideByCode, refreshRides } = useRides();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    processQRCode(data);
  };

  const processQRCode = async (data: string) => {
    const joinCodeOrId = parseQRData(data);
    
    if (!joinCodeOrId) {
      Alert.alert("Invalid QR Code", "This QR code is not a valid RideSync ride.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
      return;
    }

    if (!profile) {
      Alert.alert("Profile Required", "Please complete your profile before joining a ride.", [
        { text: "Cancel", onPress: () => navigation.goBack() },
        {
          text: "Setup Profile",
          onPress: () => {
            navigation.goBack();
            navigation.navigate("ProfileSetup");
          },
        },
      ]);
      return;
    }

    let ride = rides.find((r) => r.id === joinCodeOrId || r.joinCode === joinCodeOrId);
    
    if (!ride) {
      try {
        ride = await findRideByCode(joinCodeOrId) || undefined;
      } catch (error) {
        console.error("Error finding ride:", error);
      }
    }
    
    if (!ride) {
      Alert.alert(
        "Ride Not Found",
        "This ride doesn't exist or has ended.",
        [{ text: "OK", onPress: () => { setScanned(false); } }]
      );
      return;
    }

    await joinRide(ride.id, {
      id: profile.id,
      name: profile.name,
      vehicleName: profile.vehicleName,
      vehicleNumber: profile.vehicleNumber,
      profilePicture: profile.profilePicture,
    });

    await refreshRides();

    Alert.alert("Joined Ride!", `You've joined the ride to ${ride.destination}`, [
      {
        text: "View Ride",
        onPress: () => {
          navigation.replace("ActiveRide", { rideId: ride!.id });
        },
      },
    ]);
  };

  const handleManualJoin = () => {
    if (!manualCode.trim()) return;
    processQRCode(manualCode.trim());
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.webContent, { paddingTop: insets.top + Spacing["3xl"] }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="camera-off" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.webTitle}>
            Camera Not Available
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            QR scanning requires a camera. Run this app in Expo Go on your mobile device to scan QR codes.
          </ThemedText>
          
          <View style={styles.manualInputSection}>
            <ThemedText type="h4" style={styles.manualTitle}>
              Or enter ride code manually:
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="ridesync://join/..."
              placeholderTextColor={theme.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
            />
            <Button onPress={handleManualJoin} disabled={!manualCode.trim()}>
              Join Ride
            </Button>
          </View>

          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <ThemedText type="link">Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.permissionContent, { paddingTop: insets.top + Spacing["3xl"] }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="camera" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Permission Required
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            We need camera access to scan QR codes and join ride groups
          </ThemedText>
          <Button onPress={requestPermission} style={styles.permissionButton}>
            Enable Camera
          </Button>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <ThemedText type="link">Cancel</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <Pressable
          style={[styles.closeIconButton, { backgroundColor: theme.backgroundRoot + "CC" }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.scanFrame}>
        <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.xl }]}>
        <ThemedText type="h4" style={styles.sheetTitle}>
          Scan QR Code
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
          Position the QR code within the frame to join a ride group
        </ThemedText>
        
        {showManualInput ? (
          <View style={styles.manualInputRow}>
            <TextInput
              style={[
                styles.input,
                styles.inputFlex,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter ride code..."
              placeholderTextColor={theme.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
            />
            <Button onPress={handleManualJoin} disabled={!manualCode.trim()}>
              Join
            </Button>
          </View>
        ) : (
          <Pressable onPress={() => setShowManualInput(true)} style={styles.manualLink}>
            <ThemedText type="link">Enter code manually</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    position: "absolute",
    top: "30%",
    left: "15%",
    right: "15%",
    aspectRatio: 1,
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  sheetTitle: {
    textAlign: "center",
  },
  manualLink: {
    marginTop: Spacing.sm,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.md,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  inputFlex: {
    flex: 1,
  },
  webContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  webTitle: {
    textAlign: "center",
  },
  manualInputSection: {
    width: "100%",
    marginTop: Spacing["2xl"],
    gap: Spacing.md,
  },
  manualTitle: {
    textAlign: "center",
  },
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.lg,
  },
  permissionTitle: {
    textAlign: "center",
  },
  permissionButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
  },
  closeButton: {
    marginTop: Spacing.xl,
  },
});
