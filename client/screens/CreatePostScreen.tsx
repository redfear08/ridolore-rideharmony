import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { createPost, PostMedia, PostAuthor } from "@/lib/firebase";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3;

type PostType = "general" | "ride_announcement";

export default function CreatePostScreen() {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [postType, setPostType] = useState<PostType>("general");
  const [isPosting, setIsPosting] = useState(false);

  const pickImage = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Image picker is not available on web. Please use Expo Go on your mobile device.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - media.length,
    });

    if (!result.canceled && result.assets) {
      const newMedia: PostMedia[] = result.assets.map((asset) => ({
        type: "image" as const,
        uri: asset.uri,
        aspectRatio: asset.width / asset.height,
      }));
      setMedia((prev) => [...prev, ...newMedia].slice(0, 10));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [media.length]);

  const takePhoto = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Camera is not available on web. Please use Expo Go on your mobile device.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera permission is needed to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const newMedia: PostMedia = {
        type: "image",
        uri: asset.uri,
        aspectRatio: asset.width / asset.height,
      };
      setMedia((prev) => [...prev, newMedia].slice(0, 10));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const removeMedia = useCallback((index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePost = useCallback(async () => {
    if (!user || !profile) {
      Alert.alert("Error", "Please sign in to create a post.");
      return;
    }

    if (!caption.trim() && media.length === 0) {
      Alert.alert("Empty Post", "Please add a caption or media to your post.");
      return;
    }

    setIsPosting(true);

    try {
      const author: PostAuthor = {
        id: user.id,
        name: profile.name,
        photoUri: profile.photoUri,
        vehicleName: profile.vehicleName,
      };

      await createPost(author, caption.trim(), media, postType);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  }, [user, profile, caption, media, postType, navigation]);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.userHeader}>
          {profile?.photoUri ? (
            <Image
              source={{ uri: profile.photoUri }}
              style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <ThemedText style={styles.userName}>{profile?.name || "User"}</ThemedText>
            {profile?.vehicleName ? (
              <ThemedText style={[styles.vehicleName, { color: theme.textSecondary }]}>
                {profile.vehicleName}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <TextInput
          style={[
            styles.captionInput,
            { color: theme.text, backgroundColor: theme.backgroundSecondary },
          ]}
          placeholder="Share your ride, vehicle updates, or thoughts..."
          placeholderTextColor={theme.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        <View style={styles.postTypeContainer}>
          <ThemedText style={styles.sectionLabel}>Post Type</ThemedText>
          <View style={styles.postTypeButtons}>
            <Pressable
              onPress={() => setPostType("general")}
              style={[
                styles.postTypeButton,
                {
                  backgroundColor:
                    postType === "general" ? theme.primary : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather
                name="edit-3"
                size={16}
                color={postType === "general" ? "#FFFFFF" : theme.text}
              />
              <Text
                style={[
                  styles.postTypeText,
                  { color: postType === "general" ? "#FFFFFF" : theme.text },
                ]}
              >
                General
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPostType("ride_announcement")}
              style={[
                styles.postTypeButton,
                {
                  backgroundColor:
                    postType === "ride_announcement" ? theme.accent : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather
                name="navigation"
                size={16}
                color={postType === "ride_announcement" ? "#FFFFFF" : theme.text}
              />
              <Text
                style={[
                  styles.postTypeText,
                  { color: postType === "ride_announcement" ? "#FFFFFF" : theme.text },
                ]}
              >
                Ride Announcement
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mediaSection}>
          <ThemedText style={styles.sectionLabel}>
            Photos ({media.length}/10)
          </ThemedText>
          <View style={styles.mediaGrid}>
            {media.map((item, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image
                  source={{ uri: item.uri }}
                  style={[styles.mediaImage, { backgroundColor: theme.backgroundSecondary }]}
                  contentFit="cover"
                />
                <Pressable
                  onPress={() => removeMedia(index)}
                  style={[styles.removeButton, { backgroundColor: theme.danger }]}
                >
                  <Feather name="x" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {media.length < 10 ? (
              <View style={styles.addMediaButtons}>
                <Pressable
                  onPress={pickImage}
                  style={[styles.addMediaButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Feather name="image" size={24} color={theme.textSecondary} />
                  <Text style={[styles.addMediaText, { color: theme.textSecondary }]}>Gallery</Text>
                </Pressable>
                <Pressable
                  onPress={takePhoto}
                  style={[styles.addMediaButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Feather name="camera" size={24} color={theme.textSecondary} />
                  <Text style={[styles.addMediaText, { color: theme.textSecondary }]}>Camera</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          onPress={handlePost}
          disabled={isPosting || (!caption.trim() && media.length === 0)}
          style={[
            styles.postButton,
            {
              backgroundColor:
                isPosting || (!caption.trim() && media.length === 0)
                  ? theme.backgroundTertiary
                  : theme.primary,
            },
          ]}
        >
          {isPosting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.postButtonText}>Post</ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  userInfo: {
    marginLeft: Spacing.md,
  },
  userName: {
    ...Typography.h4,
  },
  vehicleName: {
    ...Typography.caption,
  },
  captionInput: {
    minHeight: 120,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  postTypeContainer: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  postTypeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  postTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  postTypeText: {
    ...Typography.small,
    fontWeight: "500",
  },
  mediaSection: {
    marginBottom: Spacing.lg,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  mediaItem: {
    position: "relative",
  },
  mediaImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: BorderRadius.sm,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addMediaButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  addMediaButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  addMediaText: {
    ...Typography.caption,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  postButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonText: {
    color: "#FFFFFF",
    ...Typography.body,
    fontWeight: "600",
  },
});
