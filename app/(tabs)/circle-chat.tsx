/**
 * Circle Chat — WhatsApp-quality group chat experience
 */

import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
  Alert, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Image,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";
import { useTabBarHeight } from "@/utils/useDeviceClass";

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

// Distinct colors for sender names (cycles through for variety)
const SENDER_PALETTE = [
  "#E57373", "#F06292", "#BA68C8", "#7986CB",
  "#64B5F6", "#4DB6AC", "#81C784", "#FFD54F",
  "#FF8A65", "#A1887F",
];

function senderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return SENDER_PALETTE[Math.abs(hash) % SENDER_PALETTE.length];
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateDividerLabel(ts: number): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const full = new Date(ts);
  if (diff < 7) return full.toLocaleDateString([], { weekday: "long" });
  return full.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  CREATOR: { label: "Creator", color: Colors.purple },
  ADMIN:   { label: "Admin",   color: Colors.statusInfo },
  MODERATOR: { label: "Mod",  color: Colors.statusSuccess },
};

// ── Avatar component ──────────────────────────────────────────────────────────
const SenderAvatar = memo(({ sender }: { sender: any }) => {
  const name: string = sender?.name ?? sender?.username ?? "?";
  const initial = name[0].toUpperCase();
  const color = senderColor(sender?.id ?? name);

  if (sender?.avatar) {
    return (
      <Image
        source={{ uri: sender.avatar }}
        style={styles.avatar}
        defaultSource={require("@/assets/images/icon.png")}
      />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: color }]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
});

// ── Message bubble ────────────────────────────────────────────────────────────
interface BubbleProps {
  msg: any;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
  isFirst: boolean;
  isLast: boolean;
  onLongPress: () => void;
  onReact: (emoji: string) => void;
}

const MessageBubble = memo(({
  msg, isOwn, showAvatar, showName, isFirst, isLast, onLongPress, onReact,
}: BubbleProps) => {
  const nameColor = senderColor(msg.sender?.id ?? "");
  const role = msg.sender?.role ? ROLE_BADGE[msg.sender.role] : null;

  // Bubble shape: only round the corner adjacent to avatar on first/last in group
  const bubbleRadius = {
    borderTopLeftRadius:    isOwn ? 18 : isFirst ? 4  : 18,
    borderTopRightRadius:   isOwn ? (isFirst ? 4 : 18) : 18,
    borderBottomLeftRadius: isOwn ? 18 : isLast  ? 4  : 18,
    borderBottomRightRadius:isOwn ? (isLast ? 4 : 18) : 18,
  };

  return (
    <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
      {/* Avatar column — always 36px wide for alignment */}
      {!isOwn && (
        <View style={styles.avatarCol}>
          {showAvatar ? <SenderAvatar sender={msg.sender} /> : null}
        </View>
      )}

      <View style={[styles.msgBody, isOwn && styles.msgBodyOwn]}>
        {/* Sender name + role badge (first message in group) */}
        {!isOwn && showName && (
          <View style={styles.nameRow}>
            <Text style={[styles.senderName, { color: nameColor }]}>
              {msg.sender?.name ?? msg.sender?.username ?? "Unknown"}
            </Text>
            {role && (
              <View style={[styles.roleBadge, { backgroundColor: `${role.color}22`, borderColor: `${role.color}55` }]}>
                <Text style={[styles.roleLabel, { color: role.color }]}>{role.label}</Text>
              </View>
            )}
            {msg.isPinned && (
              <Ionicons name="pin" size={10} color={Colors.statusWarning} style={{ marginLeft: 2 }} />
            )}
          </View>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <View style={[styles.replyPreview, isOwn && styles.replyPreviewOwn]}>
            <View style={[styles.replyStripe, { backgroundColor: isOwn ? "rgba(255,255,255,0.6)" : nameColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyFrom, { color: isOwn ? "rgba(255,255,255,0.85)" : nameColor }]}>
                {msg.replyTo.senderName}
              </Text>
              <Text style={styles.replyContent} numberOfLines={1}>{msg.replyTo.content}</Text>
            </View>
          </View>
        )}

        {/* Bubble */}
        <TouchableOpacity
          onLongPress={onLongPress}
          activeOpacity={0.85}
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            bubbleRadius,
          ]}
        >
          <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>{msg.content}</Text>

          {/* Meta row: edited + time + read ticks */}
          <View style={styles.metaRow}>
            {msg.isEdited && <Text style={[styles.editedLabel, isOwn && styles.metaOwn]}>edited </Text>}
            <Text style={[styles.timeLabel, isOwn && styles.metaOwn]}>{timeLabel(msg.createdAt)}</Text>
            {isOwn && (
              <Ionicons
                name="checkmark-done"
                size={13}
                color="rgba(255,255,255,0.55)"
                style={{ marginLeft: 2 }}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Reactions row — floats below bubble */}
        {msg.reactions?.length > 0 && (
          <View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
            {msg.reactions.map((r: any) => (
              <TouchableOpacity
                key={r.emoji}
                style={[styles.reactionChip, r.userReacted && styles.reactionChipActive]}
                onPress={() => onReact(r.emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CircleChatScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const emojiAnim = useRef(new Animated.Value(0)).current;

  const circle = useQuery(api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip");
  const messages = useQuery(api.circleMessages.getMessages,
    circleId ? { circleId: circleId as Id<"circles">, limit: 80 } : "skip");
  const pinnedMessages = useQuery(api.circleMessages.getPinnedMessages,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip");

  const sendMessage  = useMutation(api.circleMessages.sendMessage);
  const deleteMsg    = useMutation(api.circleMessages.deleteMessage);
  const togglePin    = useMutation(api.circleMessages.togglePinMessage);
  const addReaction  = useMutation(api.circleMessages.addReaction);

  const isAdmin = ["CREATOR","ADMIN","MODERATOR"].includes(circle?.membership?.role ?? "");
  const inputPaddingBottom = tabBarHeight + insets.bottom + 8;

  // ── Emoji bar toggle ──────────────────────────────────────────────────────
  const toggleEmojiBar = () => {
    const toVal = showEmojiBar ? 0 : 52;
    setShowEmojiBar(!showEmojiBar);
    Animated.spring(emojiAnim, { toValue: toVal, useNativeDriver: false, friction: 10 }).start();
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !circleId) return;
    setIsSending(true);
    setMessageText("");
    try {
      await sendMessage({ circleId: circleId as Id<"circles">, messageType: "text", content: text });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to send.");
      setMessageText(text);
    } finally { setIsSending(false); }
  };

  // ── Long-press menu ───────────────────────────────────────────────────────
  const handleLongPress = useCallback((msg: any, isOwn: boolean) => {
    const opts: any[] = [];
    if (isAdmin) opts.push({
      text: msg.isPinned ? "Unpin message" : "📌 Pin message",
      onPress: async () => { try { await togglePin({ messageId: msg._id as Id<"circleMessages"> }); } catch {} },
    });
    if (isOwn || isAdmin) opts.push({
      text: "🗑 Delete",
      style: "destructive",
      onPress: () => Alert.alert("Delete message?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteMsg({ messageId: msg._id as Id<"circleMessages"> }); } catch {}
        }},
      ]),
    });
    if (!opts.length) return;
    opts.push({ text: "Cancel", style: "cancel", onPress: () => {} });
    Alert.alert("Message options", undefined as any, opts);
  }, [isAdmin, togglePin, deleteMsg]);

  // ── Reaction ──────────────────────────────────────────────────────────────
  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    try { await addReaction({ messageId: msgId as Id<"circleMessages">, emoji }); } catch {}
  }, [addReaction]);

  // ── renderItem ────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item: msg, index }: { item: any; index: number }) => {
    const list = messages as any[] ?? [];
    const prev = index > 0 ? list[index - 1] : null;
    const next = index < list.length - 1 ? list[index + 1] : null;
    const isOwn = msg.sender?.id === (circle?.membership as any)?.userId;

    const newDay = !prev ||
      new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
    const sameSenderPrev = !newDay && prev?.sender?.id === msg.sender?.id;
    const sameSenderNext = next?.sender?.id === msg.sender?.id &&
      new Date(msg.createdAt).toDateString() === new Date(next.createdAt).toDateString();

    const showAvatar = !isOwn && !sameSenderNext;   // show avatar on LAST in group (like WhatsApp)
    const showName   = !isOwn && !sameSenderPrev;   // show name on FIRST in group
    const isFirst    = !sameSenderPrev;
    const isLast     = !sameSenderNext;
    const gap        = sameSenderPrev ? 2 : 8;      // tighter spacing within a group

    return (
      <View style={{ marginTop: gap }}>
        {newDay && (
          <View style={styles.dateDivider}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>{dateDividerLabel(msg.createdAt)}</Text>
            <View style={styles.divLine} />
          </View>
        )}
        <MessageBubble
          msg={msg}
          isOwn={isOwn}
          showAvatar={showAvatar}
          showName={showName}
          isFirst={isFirst}
          isLast={isLast}
          onLongPress={() => handleLongPress(msg, isOwn)}
          onReact={(emoji) => handleReact(msg._id, emoji)}
        />
      </View>
    );
  }, [messages, circle, handleLongPress, handleReact]);

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (circle === undefined || messages === undefined) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </AppBackground>
    );
  }

  const latestPinned = pinnedMessages?.[0] ?? null;

  return (
    <AppBackground>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={tabBarHeight + insets.bottom}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => history.goBack(router, "/(tabs)/circle")}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerMain}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: "/(tabs)/circle-detail", params: { circleId } } as any)}
          >
            <View style={styles.headerAvatarWrap}>
              {circle?.coverImage
                ? <Image source={{ uri: circle.coverImage }} style={styles.headerAvatar} />
                : <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                    <Ionicons name="people" size={20} color={Colors.primary} />
                  </View>
              }
              {/* Online indicator dot */}
              <View style={styles.onlineDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{circle?.name ?? "Circle"}</Text>
              <Text style={styles.headerSub}>{circle?.currentMembers ?? 0} members</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push({ pathname: "/(tabs)/circle-detail", params: { circleId } } as any)}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Pinned banner ──────────────────────────────────────────── */}
        {latestPinned && (
          <View style={styles.pinnedBar}>
            <View style={styles.pinnedStripe} />
            <Ionicons name="pin" size={13} color={Colors.statusWarning} style={{ marginRight: 6 }} />
            <Text style={styles.pinnedText} numberOfLines={1}>{latestPinned.content}</Text>
          </View>
        )}

        {/* ── Message list ───────────────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages as any[]}
          renderItem={renderItem}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyCircle}>
                <Ionicons name="chatbubbles-outline" size={44} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Be the first to say something!</Text>
            </View>
          }
        />

        {/* ── Quick emoji bar ────────────────────────────────────────── */}
        <Animated.View style={[styles.emojiBar, { height: emojiAnim, overflow: "hidden" }]}>
          <View style={styles.emojiBarInner}>
            {QUICK_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setMessageText((t) => t + e)}
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiBtnText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Input row ──────────────────────────────────────────────── */}
        <View style={[styles.inputRow, { paddingBottom: inputPaddingBottom }]}>
          <TouchableOpacity onPress={toggleEmojiBar} style={styles.inputIconBtn}>
            <Ionicons
              name={showEmojiBar ? "close-circle-outline" : "happy-outline"}
              size={25}
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
            accessibilityLabel="Message input"
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!messageText.trim() || isSending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={19} color="#fff" style={{ marginLeft: 2 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 6,
  },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  headerMain: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
  },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
  },
  headerAvatarFallback: {
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 1.5, borderColor: Colors.redBorder,
    alignItems: "center", justifyContent: "center",
  },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.statusSuccess,
    borderWidth: 2, borderColor: Colors.bgSurface,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  headerSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  // Pinned banner
  pinnedBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.statusWarningBg,
    borderBottomWidth: 1, borderBottomColor: Colors.amberBorder,
  },
  pinnedStripe: {
    width: 3, height: "100%", borderRadius: 2,
    backgroundColor: Colors.statusWarning, marginRight: 8,
  },
  pinnedText: { flex: 1, fontSize: 12, color: Colors.statusWarning, fontWeight: "500" },

  // List
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },

  // Date divider
  dateDivider: {
    flexDirection: "row", alignItems: "center",
    marginVertical: 16, paddingHorizontal: 8, gap: 8,
  },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderDefault },
  divLabel: {
    fontSize: 11, fontWeight: "600", color: Colors.textMuted,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },

  // Empty
  empty: { flex: 1, paddingVertical: 80, alignItems: "center", gap: 12 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 1, borderColor: Colors.redBorder,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: Colors.textSecondary },
  emptySub: { fontSize: 13, color: Colors.textMuted },

  // Message row
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 2,
  },
  msgRowOwn: { flexDirection: "row-reverse" },

  // Avatar column — 36px always so own/other messages don't jump
  avatarCol: { width: 36, alignItems: "center", justifyContent: "flex-end", marginRight: 6, marginBottom: 2 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Message body (name + bubble + reactions)
  msgBody: { flex: 1, alignItems: "flex-start", maxWidth: "78%" },
  msgBodyOwn: { alignItems: "flex-end" },

  // Name + role row
  nameRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginBottom: 3, marginLeft: 4,
  },
  senderName: { fontSize: 12, fontWeight: "700" },
  roleBadge: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 5, borderWidth: 1,
  },
  roleLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },

  // Reply preview
  replyPreview: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 3,
    maxWidth: "100%",
  },
  replyPreviewOwn: { backgroundColor: "rgba(255,255,255,0.1)" },
  replyStripe: { width: 3, borderRadius: 0 },
  replyFrom: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingTop: 5 },
  replyContent: { fontSize: 11, color: Colors.textMuted, paddingHorizontal: 8, paddingBottom: 5 },

  // Bubble
  bubble: {
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleOther: { backgroundColor: Colors.bgSurface },
  bubbleOwn: { backgroundColor: Colors.bgPrimaryMid },

  // Message text
  msgText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  msgTextOwn: { color: Colors.textPrimary },

  // Meta (time + ticks)
  metaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    marginTop: 3, gap: 2,
  },
  editedLabel: { fontSize: 10, color: Colors.textMuted, fontStyle: "italic" },
  timeLabel: { fontSize: 10, color: Colors.textMuted },
  metaOwn: { color: "rgba(255,255,255,0.5)" },

  // Reactions
  reactionsRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 4, marginTop: 4, marginLeft: 4,
  },
  reactionsRowOwn: { justifyContent: "flex-end", marginLeft: 0, marginRight: 4 },
  reactionChip: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  reactionChipActive: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderColor: Colors.redBorder,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: Colors.textMuted, fontWeight: "700" },

  // Emoji bar
  emojiBar: {
    backgroundColor: Colors.bgElevated,
    borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
  },
  emojiBarInner: {
    flexDirection: "row", height: 52,
    alignItems: "center", paddingHorizontal: 8, gap: 2,
  },
  emojiBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: 44 },
  emojiBtnText: { fontSize: 22 },

  // Input row
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 10, paddingTop: 8,
    backgroundColor: Colors.bgSurface,
    borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
  },
  inputIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  input: {
    flex: 1, maxHeight: 120,
    borderRadius: 22,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, color: Colors.textPrimary, lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
  },
  sendBtnOff: { opacity: 0.4, shadowOpacity: 0 },
});
