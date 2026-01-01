import React, { useState, useEffect } from "react";
import { StyleSheet, View, TextInput, Pressable, Image, Alert, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  useProfile,
  UserProfile,
  BLOOD_GROUPS,
  validateAge,
  validateEmail,
  validateVehicleNumber,
  validatePhone,
} from "@/hooks/useStorage";

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, saveProfile } = useProfile();

  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(profile?.age || "");
  const [vehicleName, setVehicleName] = useState(profile?.vehicleName || "");
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicleNumber || "");
  const [profilePicture, setProfilePicture] = useState(profile?.profilePicture || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || "");
  const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(profile.age);
      setVehicleName(profile.vehicleName);
      setVehicleNumber(profile.vehicleNumber);
      setProfilePicture(profile.profilePicture || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setBloodGroup(profile.bloodGroup || "");
    }
  }, [profile]);

  const validateField = (field: string, value: string) => {
    let result: { valid: boolean; error?: string } = { valid: true };
    
    switch (field) {
      case "age":
        result = validateAge(value);
        break;
      case "email":
        result = validateEmail(value);
        break;
      case "vehicleNumber":
        result = validateVehicleNumber(value);
        break;
      case "phone":
        result = validatePhone(value);
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [field]: result.error || "",
    }));

    return result.valid;
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const ageValid = validateField("age", age);
    const emailValid = validateField("email", email);
    const vehicleValid = validateField("vehicleNumber", vehicleNumber);
    const phoneValid = validateField("phone", phone);

    if (!name.trim()) {
      Alert.alert("Missing Information", "Please enter your name.");
      return;
    }
    if (!vehicleName.trim()) {
      Alert.alert("Missing Information", "Please enter your vehicle name.");
      return;
    }

    if (!ageValid || !emailValid || !vehicleValid || !phoneValid) {
      Alert.alert("Invalid Information", "Please fix the highlighted errors.");
      return;
    }

    const newProfile: UserProfile = {
      id: profile?.id || Date.now().toString(),
      name: name.trim(),
      age: age.trim(),
      vehicleName: vehicleName.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      profilePicture: profilePicture || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      bloodGroup: bloodGroup || undefined,
    };

    await saveProfile(newProfile);
    navigation.goBack();
  };

  const isValid =
    name.trim() &&
    age.trim() &&
    vehicleName.trim() &&
    vehicleNumber.trim() &&
    !errors.age &&
    !errors.email &&
    !errors.vehicleNumber &&
    !errors.phone;

  const renderBloodGroupPicker = () => (
    <View style={[styles.pickerContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
      {BLOOD_GROUPS.map((group) => (
        <Pressable
          key={group}
          style={[
            styles.bloodGroupOption,
            bloodGroup === group && { backgroundColor: theme.primary },
          ]}
          onPress={() => {
            setBloodGroup(group);
            setShowBloodGroupPicker(false);
          }}
        >
          <ThemedText
            style={[
              styles.bloodGroupText,
              bloodGroup === group && { color: "#FFFFFF" },
            ]}
          >
            {group}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="user" size={40} color={theme.textSecondary} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
              <Feather name="camera" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Tap to add photo (optional)
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Full Name *
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
              placeholder="Enter your name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Age * (18-90)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: errors.age ? theme.danger : theme.border,
                },
              ]}
              placeholder="Enter your age"
              placeholderTextColor={theme.textSecondary}
              value={age}
              onChangeText={(text) => {
                setAge(text);
                if (text) validateField("age", text);
              }}
              onBlur={() => validateField("age", age)}
              keyboardType="number-pad"
              maxLength={2}
            />
            {errors.age ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: 4 }}>
                {errors.age}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Email (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: errors.email ? theme.danger : theme.border,
                },
              ]}
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (text) validateField("email", text);
              }}
              onBlur={() => validateField("email", email)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: 4 }}>
                {errors.email}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Phone Number (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: errors.phone ? theme.danger : theme.border,
                },
              ]}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (text) validateField("phone", text);
              }}
              onBlur={() => validateField("phone", phone)}
              keyboardType="phone-pad"
            />
            {errors.phone ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: 4 }}>
                {errors.phone}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Blood Group (optional)
            </ThemedText>
            <Pressable
              style={[
                styles.input,
                styles.pickerButton,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowBloodGroupPicker(!showBloodGroupPicker)}
            >
              <ThemedText style={{ color: bloodGroup ? theme.text : theme.textSecondary }}>
                {bloodGroup || "Select blood group"}
              </ThemedText>
              <Feather name="chevron-down" size={20} color={theme.textSecondary} />
            </Pressable>
            {showBloodGroupPicker ? renderBloodGroupPicker() : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Vehicle Name *
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
              placeholder="e.g., Honda CBR, Yamaha R15"
              placeholderTextColor={theme.textSecondary}
              value={vehicleName}
              onChangeText={setVehicleName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Vehicle Number * (10 characters)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: errors.vehicleNumber ? theme.danger : theme.border,
                },
              ]}
              placeholder="e.g., AB12CD3456"
              placeholderTextColor={theme.textSecondary}
              value={vehicleNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/\s/g, "").toUpperCase();
                setVehicleNumber(cleaned);
                if (cleaned) validateField("vehicleNumber", cleaned);
              }}
              onBlur={() => validateField("vehicleNumber", vehicleNumber)}
              autoCapitalize="characters"
              maxLength={10}
            />
            {errors.vehicleNumber ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: 4 }}>
                {errors.vehicleNumber}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <Button onPress={handleSave} disabled={!isValid} style={styles.saveButton}>
          {profile ? "Save Changes" : "Complete Setup"}
        </Button>
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
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  avatarContainer: {
    position: "relative",
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
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  bloodGroupOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  bloodGroupText: {
    fontWeight: "600",
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
});
