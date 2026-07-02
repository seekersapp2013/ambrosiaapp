/**
 * Circle Chat Screen
 *
 * Real-time message list with reactions, pin/delete actions, emoji picker.
 * Phase 8 — PLAN.MD
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

function timeLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateDivider(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const diff = today.getDate() - d.getDate();
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

const ROLE_COLORS: Record<string, string> = {
  CREATOR: Colors.purple,
  ADMIN: Colors.statusInfo,
  MODERATOR: Colors.statusSuccess,
  MEMBER: Colors.textMuted,
};

export default function CircleChatScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const flatListRef = useRef<FlatList>(null);

  // ── Message input state ────────────────────────────────────────────────────
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const emojiBarHeight = useRef(new Animated.Value(0)).current;

  // ── Data ────────────────────────────────────────────────────────────────────
  const circle = useQuery(
    api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );
  const messages = useQuery(
    api.circleMessages.getMessages,
    circleId ? { circleId: circleId as Id<"circles">, limit: 60 } : "skip"
  );
  const pinnedMessages = useQuery(
    api.circleMessages.getPinnedMessages,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );

  const sendMessage = useMutation(api.circleMessages.sendMessage);
  const deleteMessage = useMutation(api.circleMessages.deleteMessage);
  const togglePin = useMutation(api.circleMessages.togglePinMessage);
  const addReaction = useMutation(api.circleMessages.addReaction);

  const isAdmin =
    circle?.membership?.role === "CREATOR" ||
    circle?.membership?.role === "ADMIN" ||
    circle?.membership?.role === "MODERATOR";

  // ── Emoji bar animation ────────────────────────────────────────────────────
  const toggleEmojiBar = () => {
    const toValue = showEmojiBar ? 0 : 44;
    setShowEmojiBar(!showEmojiBar);
    Animated.timing(emojiBarHeight, {
      toValue,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !circleId) return;
    setIsSending(true);
    setMessageText("");
    try {
      await sendMessage({
        circleId: circleId as Id<"circles">,
        messageType: "text",
        content: text,
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to send message.");
      setMessageText(text); // restore
    } finally {
      setIsSending(false);
    }
  };

  // ── Long press actions ─────────────────────────────────────────────────────
  const handleLongPress = (message: any, isOwn: boolean) => {
    const options: { text: string; onPress: () => void; style?: "destructive" | "cancel" | "default" }[] = [];

    if (isAdmin) {
      options.push({
        text: message.isPinned ? "Unpin" : "Pin",
        onPress: async () => {
          try {
            await togglePin({ messageId: message._id as Id<"circleMessages"> });
          } catch (err: any) {
            Alert.alert("Error", err?.message);
          }
        },
      });
    }

    if (isOwn || isAdmin) {
      options.push({
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete Message", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteMessage({ messageId: message._id as Id<"circleMessages"> });
                } catch (err: any) {
                  Alert.alert("Error", err?.message);
                }
              },
            },
          ]);
        },
      });
    }

    if (options.length === 0) return;
    options.push({ text: "Cancel", style: "cancel", onPress: () => {} });
    Alert.alert("Message Actions", undefined as any, options);
  };

  // ── Reaction ────────────────────────────────────────────────────────────────
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction({
        messageId: messageId as Id<"circleMessages">,
        emoji,
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message);
    }
  };

  // ── Render message bubble ──────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item: msg }: { item: any }) => {
      const isOwn = msg.sender?.id === (circle?.membership as any)?.userId;
      const roleColor = ROLE_COLORS[msg.sender?.role ?? "MEMBER"] ?? Colors.textMuted;

      return (
        <TouchableOpacity
          onLongPress={() => handleLongPress(msg, isOwn)}
          activeOpacity={0.95}
          style={[styles.msgWrap, isOwn && styles.msgWrapOwn]}
          accessibilityLabel={`Message from ${msg.sender?.name ?? "Unknown"}`}
        >
          {/* Avatar */}
          {!isOwn && (
            <View style={styles.avatar}>
              <Ionicons name="person" size={14} color={Colors.textMuted} />
            </View>
          )}

          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            {/* Sender name + role (non-own) */}
            {!isOwn && (
              <View style={styles.senderRow}>
                <Text style={[styles.senderName, { color: roleColor }]}>
                  {msg.sender?.name ?? msg.sender?.username ?? "Unknown"}
                </Text>
                {msg.sender?.role && msg.sender.role !== "MEMBER" && (
                  <View style={[styles.rolePill, { borderColor: roleColor }]}>
                    <Text style={[styles.roleText, { color: roleColor }]}>{msg.sender.role}</Text>
                  </View>
                )}
                {msg.isPinned && (
                  <Ionicons name="pin" size={11} color={Colors.statusWarning} style={{ marginLeft: 4 }} />
                )}
              </View>
            )}

            {/* Reply preview */}
            {msg.replyTo && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  ↩ {msg.replyTo.senderName}: {msg.replyTo.content}
                </Text>
              </View>
            )}

            {/* Text */}
            <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>{msg.content}</Text>

            {/* Timestamp + edited */}
            <View style={styles.msgMeta}>
              {msg.isEdited && <Text style={styles.editedText}>edited</Text>}
              <Text style={styles.timeText}>{timeLabel(msg.createdAt)}</Text>
            </View>

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
              <View style={styles.reactionsRow}>
                {msg.reactions.map((r: any) => (
                  <TouchableOpacity
                    key={r.emoji}
                    style={[styles.reactionPill, r.userReacted && styles.reactionPillActive]}
                    onPress={() => handleReaction(msg._id, r.emoji)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.emoji} ${r.count}`}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text style={styles.reactionCount}>{r.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [circle, isAdmin]
  );

  // ── Loading / auth guard ───────────────────────────────────────────────────
  if (circle === undefined || messages === undefined) {
    return (
      <AppBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </AppBackground>
    );
  }

  const latestPinned = pinnedMessages && pinnedMessages.length > 0 ? pinnedMessages[0] : null;

  return (
    <AppBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => history.goBack(router, "/(tabs)/circle")}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {circle?.name ?? "Circle Chat"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {circle?.currentMembers ?? 0} members
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(tabs)/circle-detail",
                params: { circleId },
              } as any)
            }
            style={styles.infoBtn}
            accessibilityRole="button"
            accessibilityLabel="Circle info"
          >
            <Ionicons name="information-circle-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Pinned message bar ──────────────────────────────────────────── */}
        {latestPinned && (
          <View style={styles.pinnedBar}>
            <Ionicons name="pin" size={13} color={Colors.statusWarning} />
            <Text style={styles.pinnedText} numberOfLines={1}>
              {latestPinned.content}
            </Text>
          </View>
        )}

        {/* ── Message list ────────────────────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages as any[]}
          renderItem={renderMessage}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* ── Emoji bar (animated) ─────────────────────────────────────────── */}
        <Animated.View style={[styles.emojiBar, { height: emojiBarHeight, overflow: "hidden" }]}>
          <View style={styles.emojiBarInner}>
            {QUICK_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setMessageText((t) => t + e)}
                style={styles.emojiBtn}
                accessibilityRole="button"
                accessibilityLabel={e}
              >
                <Text style={styles.emojiBtnText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Input row ────────────────────────────────────────────────────── */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            onPress={toggleEmojiBar}
            style={styles.emojiToggle}
            accessibilityRole="button"
            accessibilityLabel="Toggle emoji picker"
          >
            <Ionicons
              name={showEmojiBar ? "close" : "happy-outline"}
              size={22}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={Colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={2000}
            returnKeyType="default"
            accessibilityLabel="Message input"
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!messageText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  pinnedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.statusWarningBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.amberBorder,
  },
  pinnedText: {
    flex: 1,
    fontSize: 12,
    color: Colors.statusWarning,
    fontWeight: "500",
  },

  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Message
  msgWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 4,
  },
  msgWrapOwn: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 10,
    gap: 3,
  },
  bubbleOther: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderBottomRightRadius: 4,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
  },
  rolePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  replyPreview: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  replyPreviewText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  msgText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  msgTextOwn: {
    color: Colors.textPrimary,
  },
  msgMeta: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
    alignItems: "center",
    marginTop: 2,
  },
  editedText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  reactionPillActive: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderColor: Colors.redBorder,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },

  // Emoji bar
  emojiBar: {
    backgroundColor: Colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  emojiBarInner: {
    flexDirection: "row",
    paddingHorizontal: 12,
    alignItems: "center",
    height: 44,
    gap: 6,
  },
  emojiBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnText: { fontSize: 20 },

  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: 8,
    // On native: iOS needs extra safe-area space, Android needs tab bar clearance.
    // On web: tab bar is ~64px tall and sits at bottom: 0, so we need to clear it.
    paddingBottom: Platform.OS === "ios" ? 88 : 72,
  },
  emojiToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
