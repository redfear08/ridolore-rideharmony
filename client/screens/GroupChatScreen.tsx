import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRides, useProfile, Message } from "@/hooks/useStorage";

type GroupChatRouteProp = RouteProp<RootStackParamList, "GroupChat">;

export default function GroupChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<GroupChatRouteProp>();
  const { getRide, addMessage, refreshRides } = useRides();
  const { profile } = useProfile();
  const [ride, setRide] = useState(getRide(route.params.rideId));
  const [messageText, setMessageText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRides();
    const updatedRide = getRide(route.params.rideId);
    setRide(updatedRide);
    setRefreshing(false);
  }, [refreshRides, getRide, route.params.rideId]);

  useEffect(() => {
    const updatedRide = getRide(route.params.rideId);
    setRide(updatedRide);
  }, [route.params.rideId, getRide]);

  const handleSend = async () => {
    if (!messageText.trim() || !profile || !ride) return;

    await addMessage(ride.id, {
      senderId: profile.id,
      senderName: profile.name,
      text: messageText.trim(),
    });

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setMessageText("");
    await refreshRides();
    const updatedRide = getRide(route.params.rideId);
    setRide(updatedRide);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === profile?.id;
    const rider = ride?.riders.find((r) => r.id === item.senderId);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <View style={[styles.avatar, { backgroundColor: theme.riderMarker }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {item.senderName.charAt(0)}
            </ThemedText>
          </View>
        )}
        <View style={styles.messageBubbleWrapper}>
          {!isOwnMessage && (
            <View style={styles.senderInfo}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {item.senderName}
              </ThemedText>
              {rider && (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {rider.vehicleNumber}
                </ThemedText>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText
              type="body"
              style={{ color: isOwnMessage ? "#FFFFFF" : theme.text }}
            >
              {item.text}
            </ThemedText>
          </View>
          <ThemedText
            type="small"
            style={[
              styles.timestamp,
              { color: theme.textSecondary },
              isOwnMessage && styles.ownTimestamp,
            ]}
          >
            {formatTime(item.timestamp)}
          </ThemedText>
        </View>
      </View>
    );
  };

  const messages = ride?.messages || [];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: Spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
          inverted={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={48} color={theme.textSecondary} />
              <ThemedText type="h4" style={{ color: theme.textSecondary }}>
                No messages yet
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                Start a conversation with your ride group
              </ThemedText>
            </View>
          }
        />

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.sm },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: messageText.trim() ? theme.primary : theme.backgroundDefault,
                opacity: pressed && messageText.trim() ? 0.7 : 1,
              },
            ]}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <Feather
              name="send"
              size={20}
              color={messageText.trim() ? "#FFFFFF" : theme.textSecondary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesList: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  messageContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    maxWidth: "80%",
  },
  ownMessageContainer: {
    alignSelf: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubbleWrapper: {
    gap: Spacing.xs,
  },
  senderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  timestamp: {
    marginLeft: Spacing.xs,
  },
  ownTimestamp: {
    textAlign: "right",
    marginRight: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
});
