import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  Post,
  PostComment,
  getPost,
  getComments,
  addComment,
  toggleLike,
  isPostLiked,
  deletePost,
} from "@/lib/firebase";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type PostDetailRouteProp = RouteProp<RootStackParamList, "PostDetail">;

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const CommentItem = memo(function CommentItem({
  comment,
  theme,
}: {
  comment: PostComment;
  theme: any;
}) {
  return (
    <View style={styles.commentItem}>
      {comment.authorPhotoUri ? (
        <Image
          source={{ uri: comment.authorPhotoUri }}
          style={[styles.commentAvatar, { backgroundColor: theme.backgroundSecondary }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.commentAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.commentAvatarText}>
            {comment.authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.commentContent}>
        <View style={[styles.commentBubble, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.commentAuthor, { color: theme.text }]}>
            {comment.authorName}
          </Text>
          <Text style={[styles.commentText, { color: theme.text }]}>{comment.text}</Text>
        </View>
        <Text style={[styles.commentTime, { color: theme.textSecondary }]}>
          {formatTimeAgo(comment.createdAt)}
        </Text>
      </View>
    </View>
  );
});

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PostDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { postId, focusComments } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const commentInputRef = useRef<TextInput>(null);
  const likeScale = useSharedValue(1);

  useEffect(() => {
    loadData();
  }, [postId]);

  useEffect(() => {
    if (focusComments && !loading) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 300);
    }
  }, [focusComments, loading]);

  const loadData = async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        getPost(postId),
        getComments(postId),
      ]);

      if (postData) {
        setPost(postData);
        setLikeCount(postData.likeCount);
        if (user) {
          const likedStatus = await isPostLiked(postId, user.id);
          setLiked(likedStatus);
        }
      }
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = useCallback(async () => {
    if (!user) return;

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
      await toggleLike(postId, user.id);
    } catch (error) {
      setLiked(!optimisticLiked);
      setLikeCount((prev) => prev + (optimisticLiked ? -1 : 1));
    }
  }, [postId, user, liked]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleSubmitComment = useCallback(async () => {
    if (!user || !profile || !newComment.trim()) return;

    setIsSubmitting(true);

    try {
      await addComment(
        postId,
        user.id,
        profile.name,
        newComment.trim(),
        profile.photoUri
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setNewComment("");
      const updatedComments = await getComments(postId);
      setComments(updatedComments);
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [postId, user, profile, newComment]);

  const handleDeletePost = useCallback(() => {
    if (!post || !user || post.authorId !== user.id) return;

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
            navigation.goBack();
          } catch (error) {
            Alert.alert("Error", "Failed to delete post.");
          }
        },
      },
    ]);
  }, [post, user, postId, navigation]);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentMediaIndex(index);
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!post) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText style={[styles.errorText, { marginTop: Spacing.md }]}>
          Post not found
        </ThemedText>
      </ThemedView>
    );
  }

  const hasMedia = post.media && post.media.length > 0;
  const hasMultipleMedia = post.media && post.media.length > 1;
  const isAuthor = user && post.authorId === user.id;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: 80 + insets.bottom,
        }}
      >
        <View style={styles.header}>
          <View style={styles.authorInfo}>
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
              <Text style={[styles.postTime, { color: theme.textSecondary }]}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
          {isAuthor ? (
            <Pressable onPress={handleDeletePost} style={styles.menuButton}>
              <Feather name="trash-2" size={20} color={theme.danger} />
            </Pressable>
          ) : null}
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

        <View style={styles.actions}>
          <Pressable onPress={handleLike} style={styles.actionButton}>
            <Animated.View style={likeAnimatedStyle}>
              <Feather
                name="heart"
                size={24}
                color={liked ? theme.danger : theme.text}
              />
            </Animated.View>
            <Text style={[styles.actionCount, { color: theme.text }]}>{likeCount}</Text>
          </Pressable>

          <Pressable
            onPress={() => commentInputRef.current?.focus()}
            style={styles.actionButton}
          >
            <Feather name="message-circle" size={24} color={theme.text} />
            <Text style={[styles.actionCount, { color: theme.text }]}>{comments.length}</Text>
          </Pressable>
        </View>

        {post.caption ? (
          <View style={styles.captionContainer}>
            <Text style={[styles.caption, { color: theme.text }]}>
              <Text style={styles.captionAuthor}>{post.author.name} </Text>
              {post.caption}
            </Text>
          </View>
        ) : null}

        <View style={styles.commentsSection}>
          <ThemedText style={styles.commentsTitle}>
            Comments ({comments.length})
          </ThemedText>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} theme={theme} />
          ))}
          {comments.length === 0 ? (
            <ThemedText style={[styles.noComments, { color: theme.textSecondary }]}>
              No comments yet. Be the first to comment!
            </ThemedText>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.commentInputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.sm,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TextInput
          ref={commentInputRef}
          style={[
            styles.commentInput,
            { color: theme.text, backgroundColor: theme.backgroundSecondary },
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={theme.textSecondary}
          value={newComment}
          onChangeText={setNewComment}
          maxLength={500}
        />
        <Pressable
          onPress={handleSubmitComment}
          disabled={isSubmitting || !newComment.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                isSubmitting || !newComment.trim() ? theme.backgroundTertiary : theme.primary,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="send" size={18} color="#FFFFFF" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    ...Typography.body,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  authorDetails: {
    marginLeft: Spacing.md,
  },
  authorName: {
    ...Typography.body,
    fontWeight: "600",
  },
  postTime: {
    ...Typography.caption,
    marginTop: 2,
  },
  menuButton: {
    padding: Spacing.sm,
  },
  mediaContainer: {
    position: "relative",
  },
  mediaImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xl,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionCount: {
    ...Typography.body,
    fontWeight: "500",
  },
  captionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  caption: {
    ...Typography.body,
    lineHeight: 22,
  },
  captionAuthor: {
    fontWeight: "600",
  },
  commentsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  commentsTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  commentContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  commentBubble: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  commentAuthor: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: 2,
  },
  commentText: {
    ...Typography.small,
    lineHeight: 18,
  },
  commentTime: {
    ...Typography.caption,
    marginTop: 4,
    marginLeft: Spacing.sm,
  },
  noComments: {
    ...Typography.body,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  commentInputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Typography.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
});
