import React, { memo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Post, toggleLike, isPostLiked } from "@/lib/firebase";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MEDIA_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onPress?: () => void;
  onCommentPress?: () => void;
  onAuthorPress?: () => void;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

const PostCardInner = ({
  post,
  currentUserId,
  onPress,
  onCommentPress,
  onAuthorPress,
}: PostCardProps) => {
  const { theme } = useTheme();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const likeScale = useSharedValue(1);

  React.useEffect(() => {
    isPostLiked(post.id, currentUserId).then(setLiked);
  }, [post.id, currentUserId]);

  const handleLike = useCallback(async () => {
    if (isLiking) return;
    setIsLiking(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    likeScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikeCount((prev) => prev + (optimisticLiked ? 1 : -1));

    try {
      await toggleLike(post.id, currentUserId);
    } catch (error) {
      setLiked(!optimisticLiked);
      setLikeCount((prev) => prev + (optimisticLiked ? -1 : 1));
    } finally {
      setIsLiking(false);
    }
  }, [post.id, currentUserId, liked, isLiking]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / MEDIA_WIDTH);
    setCurrentMediaIndex(index);
  }, []);

  const hasMedia = post.media && post.media.length > 0;
  const hasMultipleMedia = post.media && post.media.length > 1;

  return (
    <Pressable onPress={onPress} style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <Pressable onPress={onAuthorPress} style={styles.authorInfo}>
          {post.author.photoUri ? (
            <Image
              source={{ uri: post.author.photoUri }}
              style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {post.author.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.authorDetails}>
            <Text style={[styles.authorName, { color: theme.text }]}>
              {post.author.name}
            </Text>
            {post.author.vehicleName ? (
              <Text style={[styles.vehicleName, { color: theme.textSecondary }]}>
                {post.author.vehicleName}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
          {formatTimeAgo(post.createdAt)}
        </Text>
      </View>

      {hasMedia ? (
        <View style={styles.mediaContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {post.media.map((media, index) => (
              <Image
                key={index}
                source={{ uri: media.uri }}
                style={[styles.mediaImage, { backgroundColor: theme.backgroundSecondary }]}
                contentFit="cover"
                transition={200}
              />
            ))}
          </ScrollView>
          {hasMultipleMedia ? (
            <View style={styles.paginationContainer}>
              {post.media.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor:
                        index === currentMediaIndex ? theme.primary : theme.backgroundTertiary,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {post.postType === "ride_announcement" && post.rideTitle ? (
        <View style={[styles.announcementBadge, { backgroundColor: theme.accent + "20" }]}>
          <Feather name="navigation" size={14} color={theme.accent} />
          <Text style={[styles.announcementText, { color: theme.accent }]}>
            Ride: {post.rideTitle}
          </Text>
        </View>
      ) : null}

      <View style={styles.content}>
        {post.caption ? (
          <Text style={[styles.caption, { color: theme.text }]} numberOfLines={4}>
            <Text style={styles.captionAuthor}>{post.author.name} </Text>
            {post.caption}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={styles.actionButton} disabled={isLiking}>
          <Animated.View style={likeAnimatedStyle}>
            <Feather
              name={liked ? "heart" : "heart"}
              size={22}
              color={liked ? theme.danger : theme.text}
              style={liked ? { opacity: 1 } : { opacity: 0.8 }}
            />
          </Animated.View>
          <Text style={[styles.actionCount, { color: theme.text }]}>{likeCount}</Text>
        </Pressable>

        <Pressable onPress={onCommentPress} style={styles.actionButton}>
          <Feather name="message-circle" size={22} color={theme.text} style={{ opacity: 0.8 }} />
          <Text style={[styles.actionCount, { color: theme.text }]}>{post.commentCount}</Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <Feather name="share" size={22} color={theme.text} style={{ opacity: 0.8 }} />
        </Pressable>
      </View>
    </Pressable>
  );
};

export const PostCard = memo(PostCardInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  authorDetails: {
    marginLeft: Spacing.sm,
  },
  authorName: {
    ...Typography.body,
    fontWeight: "600",
  },
  vehicleName: {
    ...Typography.caption,
  },
  timeAgo: {
    ...Typography.caption,
  },
  mediaContainer: {
    position: "relative",
  },
  mediaImage: {
    width: MEDIA_WIDTH,
    height: MEDIA_WIDTH,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    position: "absolute",
    bottom: Spacing.sm,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  announcementBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  announcementText: {
    ...Typography.caption,
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  caption: {
    ...Typography.body,
    lineHeight: 22,
  },
  captionAuthor: {
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xl,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actionCount: {
    ...Typography.small,
    fontWeight: "500",
  },
});
