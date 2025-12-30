import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Post, subscribeToPosts } from "@/lib/firebase";
import { PostCard } from "@/components/PostCard";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CreatePostFAB() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={() => navigation.navigate("CreatePost")}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.fab,
        {
          backgroundColor: theme.primary,
          bottom: tabBarHeight + Spacing.xl,
        },
        Shadows.fab,
        animatedStyle,
      ]}
    >
      <Feather name="plus" size={24} color="#FFFFFF" />
    </AnimatedPressable>
  );
}

const PostItemMemo = memo(function PostItem({
  post,
  currentUserId,
  onPress,
  onCommentPress,
}: {
  post: Post;
  currentUserId: string;
  onPress: () => void;
  onCommentPress: () => void;
}) {
  return (
    <PostCard
      post={post}
      currentUserId={currentUserId}
      onPress={onPress}
      onCommentPress={onCommentPress}
    />
  );
});

export default function SocialFeedScreen() {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigateToCreateRide = useCallback(() => {
    navigation.navigate("CreateRide");
  }, [navigation]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([50, 50])
    .onEnd((event) => {
      if (event.translationX > 100 && Math.abs(event.velocityX) > 300) {
        runOnJS(navigateToCreateRide)();
      }
    });

  useEffect(() => {
    const unsubscribe = subscribeToPosts((newPosts) => {
      setPosts(newPosts);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate("PostDetail", { postId });
  }, [navigation]);

  const handleCommentPress = useCallback((postId: string) => {
    navigation.navigate("PostDetail", { postId, focusComments: true });
  }, [navigation]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostItemMemo
        post={item}
        currentUserId={user?.id || ""}
        onPress={() => handlePostPress(item.id)}
        onCommentPress={() => handleCommentPress(item.id)}
      />
    ),
    [user?.id, handlePostPress, handleCommentPress]
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 450,
      offset: 450 * index,
      index,
    }),
    []
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <ThemedView style={styles.container}>
        <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingHorizontal: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="camera" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyTitle}>Coming Soon</ThemedText>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Share your rides and connect with fellow riders
            </ThemedText>
            <Pressable
              onPress={() => navigation.navigate("CreatePost")}
              style={[styles.createButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="plus" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <ThemedText style={styles.createButtonText}>Post Something</ThemedText>
            </Pressable>
          </View>
        }
      />
        <CreatePostFAB />
      </ThemedView>
    </GestureDetector>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.lg,
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  createButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
