/**
 * LiveStreamChat
 * Slide-up real-time chat panel anchored inside the live stream screen.
 * Subscribes to streamComments via Convex real-time query.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveStreamChatProps {
  bookingId: string;
  visible: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

// ─── Comment row ──────────────────────────────────────────────────────────────
function CommentRow({ comment }: { comment: any }) {
  const initials = (comment.author?.name ?? comment.author?.username ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText} allowFontScaling={false}>
          {initials}
        </Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentName} numberOfLines={1} allowFontScaling={false}>
            {comment.author?.name ?? comment.author?.username ?? "User"}
          </Text>
          <Text style={styles.commentTime} allowFontScaling={false}>
            {timeAgo(comment.createdAt)}
          </Text>
        </View>
        <Text style={styles.commentContent} allowFontScaling={false}>
          {comment.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LiveStreamChat({ bookingId, visible, onClose }: LiveStreamChatProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const slideAnim = useRef(new Animated.Value(320)).current;

  // Convex real-time subscription
  const comments = useQuery(
    api.streamComments.getStreamComments,
    { streamId: bookingId as any }
  );
  const addComment = useMutation(api.streamComments.addStreamComment);

  // Slide in/out animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 320,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [visible, slideAnim]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (comments && comments.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments?.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addComment({
        streamId: bookingId as any,
        content: trimmed,
      });
      setText("");
    } catch {
      // silently ignore — user can retry
    } finally {
      setSending(false);
    }
  }

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="box-none"
    >
      {/* Header */}
      <View style={styles.panelHeader}>
        <View style={styles.panelHandleBar} />
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle} allowFontScaling={false}>Live Chat</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close chat"
          >
            <Ionicons name="close" size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {comments === undefined ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.actionPrimary} size="small" />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubble-outline" size={28} color={Colors.iconDisabled} />
          <Text style={styles.emptyText} allowFontScaling={false}>
            No messages yet. Say hello!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <CommentRow comment={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Say something…"
            placeholderTextColor={Colors.textDisabled}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!sending}
            maxLength={500}
            selectionColor={Colors.actionPrimary}
            accessibilityLabel="Chat message input"
            allowFontScaling={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: "rgba(15,15,30,0.96)",
    borderTopLeftRadius: radius.radius2XL,
    borderTopRightRadius: radius.radius2XL,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },

  // Header
  panelHeader: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space2,
    paddingBottom: spacing.space2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  panelHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginBottom: spacing.space2,
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  // Loading / empty
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
  },
  emptyText: {
    ...typeScale.bodySM,
    color: Colors.textDisabled,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
  },

  // Comment row
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    paddingVertical: 4,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.actionPrimary,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  commentName: {
    ...typeScale.labelSM,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 9,
    color: Colors.textDisabled,
  },
  commentContent: {
    ...typeScale.bodySM,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 17,
  },

  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space4,
    ...typeScale.bodySM,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.actionPrimaryDisabled,
  },
});
