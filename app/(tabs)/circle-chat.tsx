/**
 * Circle Chat — WhatsApp-inspired group chat experience
 * Features: image upload, multi-user colored names, read receipts, time stamps
 */

import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
  Alert, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Image,
  StatusBar, ScrollView, Pressable, Dimensions, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";
import { useTabBarHeight } from "@/utils/useDeviceClass";

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// WhatsApp-style sender name colors for group chats
const SENDER_PALETTE = [
  "#25D366", "#34B7F1", "#FF6B6B", "#A855F7",
  "#F59E0B", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#6366F1",
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
  CREATOR: { label: "Creator", color: "#A855F7" },
  ADMIN:   { label: "Admin",   color: "#3B82F6" },
  MODERATOR: { label: "Mod",  color: "#22C55E" },
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
  onImagePress: (uri: string) => void;
  isDark: boolean;
}

const MessageBubble = memo(({
  msg, isOwn, showAvatar, showName, isFirst, isLast, onLongPress, onReact, onImagePress, isDark,
}: BubbleProps) => {
  const C = useColors();
  const nameColor = senderColor(msg.sender?.id ?? "");
  const role = msg.sender?.role ? ROLE_BADGE[msg.sender.role] : null;
  const isImage = msg.messageType === "image" && msg.imageUrl;

  // WhatsApp-style bubble: pointed tail on first message in group
  const bubbleRadius = {
    borderTopLeftRadius:     isOwn ? 8 : (isFirst ? 0 : 8),
    borderTopRightRadius:    isOwn ? (isFirst ? 0 : 8) : 8,
    borderBottomLeftRadius:  isOwn ? 8 : (isLast ? 0 : 8),
    borderBottomRightRadius: isOwn ? (isLast ? 0 : 8) : 8,
  };

  // Own messages: branded red tint (dark) or deep red (light)
  // Others: elevated surface
  const ownBubbleBg = isDark ? 'rgba(198,34,41,0.18)' : '#C62229';
  const otherBubbleBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const ownTextColor = isDark ? '#FFFFFF' : '#FFFFFF';
  const otherTextColor = isDark ? '#E5E5E5' : '#111827';
  const ownMetaColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
  const otherMetaColor = isDark ? 'rgba(255,255,255,0.4)' : '#6B7280';

  return (
    <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
      {/* Avatar column — group chat shows avatars for other users */}
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
              <Ionicons name="pin" size={10} color="#F59E0B" style={{ marginLeft: 2 }} />
            )}
          </View>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <View style={[styles.replyPreview, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
            <View style={[styles.replyStripe, { backgroundColor: isOwn ? "rgba(255,255,255,0.6)" : nameColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyFrom, { color: isOwn ? "rgba(255,255,255,0.85)" : nameColor }]}>
                {msg.replyTo.senderName}
              </Text>
              <Text style={[styles.replyContent, { color: otherMetaColor }]} numberOfLines={1}>{msg.replyTo.content}</Text>
            </View>
          </View>
        )}

        {/* Bubble */}
        <TouchableOpacity
          onLongPress={onLongPress}
          activeOpacity={0.85}
          style={[
            styles.bubble,
            { backgroundColor: isOwn ? ownBubbleBg : otherBubbleBg },
            bubbleRadius,
            isImage && styles.bubbleImage,
          ]}
        >
          {/* Image message */}
          {isImage && (
            <TouchableOpacity onPress={() => onImagePress(msg.imageUrl)} activeOpacity={0.9}>
              <Image
                source={{ uri: msg.imageUrl }}
                style={styles.msgImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Text message */}
          {msg.messageType === "text" && (
            <Text style={[styles.msgText, { color: isOwn ? ownTextColor : otherTextColor }]}>
              {msg.content}
            </Text>
          )}

          {/* Meta row: edited + time + read ticks */}
          <View style={[styles.metaRow, isImage && styles.metaRowImage]}>
            {msg.isEdited && (
              <Text style={[styles.editedLabel, { color: isOwn ? ownMetaColor : otherMetaColor }]}>edited </Text>
            )}
            <Text style={[styles.timeLabel, { color: isOwn ? ownMetaColor : otherMetaColor }]}>
              {timeLabel(msg.createdAt)}
            </Text>
            {isOwn && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color={isDark ? "#34B7F1" : "rgba(255,255,255,0.8)"}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Reactions row */}
        {msg.reactions?.length > 0 && (
          <View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
            {msg.reactions.map((r: any) => (
              <TouchableOpacity
                key={r.emoji}
                style={[styles.reactionChip, { backgroundColor: isDark ? '#1A1A2E' : '#F3F4F6', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }, r.userReacted && { borderColor: C.primary, backgroundColor: isDark ? 'rgba(198,34,41,0.12)' : 'rgba(198,34,41,0.08)' }]}
                onPress={() => onReact(r.emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {r.count > 1 && <Text style={[styles.reactionCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{r.count}</Text>}
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
  const C = useColors();
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const emojiAnim = useRef(new Animated.Value(0)).current;

  const circle = useQuery(api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip");
  const messages = useQuery(api.circleMessages.getMessages,
    circleId ? { circleId: circleId as Id<"circles">, limit: 80 } : "skip");
  const pinnedMessages = useQuery(api.circleMessages.getPinnedMessages,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip");
  const membersResult = useQuery(api.circleMembers.getCircleMembers,
    circleId && showMenu ? { circleId: circleId as Id<"circles">, limit: 100 } : "skip");

  const sendMessage    = useMutation(api.circleMessages.sendMessage);
  const deleteMsg      = useMutation(api.circleMessages.deleteMessage);
  const togglePin      = useMutation(api.circleMessages.togglePinMessage);
  const addReaction    = useMutation(api.circleMessages.addReaction);
  const leaveCircle    = useMutation(api.circleMembers.leaveCircle);
  const generateUpload = useMutation(api.files.generateUploadUrl);

  const isAdmin = ["CREATOR","ADMIN","MODERATOR"].includes(circle?.membership?.role ?? "");
  const inputPaddingBottom = tabBarHeight + insets.bottom + 8;

  // ── Emoji bar toggle ──────────────────────────────────────────────────────
  const toggleEmojiBar = () => {
    const toVal = showEmojiBar ? 0 : 52;
    setShowEmojiBar(!showEmojiBar);
    Animated.spring(emojiAnim, { toValue: toVal, useNativeDriver: false, friction: 10 }).start();
  };

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setIsUploading(true);
      const asset = result.assets[0];

      // Get upload URL from Convex
      const uploadUrl = await generateUpload();

      // Upload the image
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });

      const { storageId } = await uploadResult.json();

      // Send as image message
      await sendMessage({
        circleId: circleId as Id<"circles">,
        messageType: "image",
        content: storageId,
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      Alert.alert("Upload Failed", err?.message ?? "Could not upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Camera capture ────────────────────────────────────────────────────────
  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setIsUploading(true);
      const asset = result.assets[0];

      const uploadUrl = await generateUpload();
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });

      const { storageId } = await uploadResult.json();

      await sendMessage({
        circleId: circleId as Id<"circles">,
        messageType: "image",
        content: storageId,
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      Alert.alert("Camera Error", err?.message ?? "Could not capture image.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Send text ─────────────────────────────────────────────────────────────
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

  // ── Leave circle ──────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    Alert.alert(
      "Leave Circle",
      `Are you sure you want to leave "${circle?.name ?? "this circle"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveCircle({ circleId: circleId as Id<"circles"> });
              setShowMenu(false);
              history.goBack(router, "/(tabs)/circle");
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Could not leave circle.");
            }
          },
        },
      ]
    );
  }, [circle, circleId, leaveCircle, router, history]);

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

    const showAvatar = !isOwn && !sameSenderNext;
    const showName   = !isOwn && !sameSenderPrev;
    const isFirst    = !sameSenderPrev;
    const isLast     = !sameSenderNext;
    const gap        = sameSenderPrev ? 2 : 10;

    return (
      <View style={{ marginTop: gap }}>
        {newDay && (
          <View style={styles.dateDivider}>
            <View style={[styles.divPill, { backgroundColor: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.divLabel, { color: C.isDark ? '#9CA3AF' : '#6B7280' }]}>
                {dateDividerLabel(msg.createdAt)}
              </Text>
            </View>
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
          onImagePress={(uri) => setFullscreenImage(uri)}
          isDark={C.isDark}
        />
      </View>
    );
  }, [messages, circle, handleLongPress, handleReact, C.isDark]);

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (circle === undefined || messages === undefined) {
    return (
      <AppBackground>
        <MobileCard containerStyle={styles.cardContainer} style={styles.card}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  const latestPinned = pinnedMessages?.[0] ?? null;

  // WhatsApp-style chat background color
  const chatBg = C.isDark ? '#0B141A' : '#ECE5DD';

  return (
    <AppBackground>
      <StatusBar barStyle="light-content" />
      <MobileCard containerStyle={styles.cardContainer} style={styles.card}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={tabBarHeight + insets.bottom}
      >

        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: C.bgTabBar, borderBottomColor: C.borderTabBar }]}>
          <TouchableOpacity
            onPress={() => history.goBack(router, "/(tabs)/circle")}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
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
                    <Ionicons
                      name={(circle as any)?.isReferralCircle ? "git-network-outline" : "people"}
                      size={18}
                      color={(circle as any)?.isReferralCircle ? "#F59E0B" : C.primary}
                    />
                  </View>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{circle?.name ?? "Circle"}</Text>
              <Text style={styles.headerSub}>{circle?.currentMembers ?? 0} members</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Pinned banner ──────────────────────────────────────────── */}
        {latestPinned && (
          <View style={[styles.pinnedBar, { backgroundColor: C.isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.1)' }]}>
            <Ionicons name="pin" size={13} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={[styles.pinnedText, { color: C.isDark ? '#F59E0B' : '#92400E' }]} numberOfLines={1}>
              {latestPinned.content}
            </Text>
          </View>
        )}

        {/* ── Message list with WhatsApp-style background ─────────── */}
        <View style={[styles.chatArea, { backgroundColor: chatBg }]}>
          {/* Subtle doodle-like pattern overlay */}
          <View style={[StyleSheet.absoluteFill, { opacity: C.isDark ? 0.03 : 0.04 }]}>
            <View style={styles.patternOverlay} />
          </View>

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
                <View style={[styles.emptyCircle, { backgroundColor: C.isDark ? 'rgba(198,34,41,0.12)' : 'rgba(198,34,41,0.08)' }]}>
                  <Ionicons name="chatbubbles-outline" size={44} color={C.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.isDark ? '#D1D5DB' : '#374151' }]}>No messages yet</Text>
                <Text style={[styles.emptySub, { color: C.isDark ? '#6B7280' : '#6B7280' }]}>Be the first to say something!</Text>
              </View>
            }
          />
        </View>

        {/* ── Quick emoji bar ────────────────────────────────────────── */}
        <Animated.View style={[styles.emojiBar, { height: emojiAnim, overflow: "hidden", backgroundColor: C.bgTabBar }]}>
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
        <View style={[styles.inputRow, { paddingBottom: inputPaddingBottom, backgroundColor: C.bgTabBar }]}>
          {/* Emoji toggle */}
          <TouchableOpacity onPress={toggleEmojiBar} style={styles.inputIconBtn}>
            <Ionicons
              name={showEmojiBar ? "close-circle-outline" : "happy-outline"}
              size={24}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* Text input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor="#6B7280"
              value={messageText}
              onChangeText={setMessageText}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Enter") handleSend();
              }}
              blurOnSubmit={false}
              multiline
              maxLength={2000}
              accessibilityLabel="Message input"
            />

            {/* Attachment & camera inside input area */}
            <TouchableOpacity
              onPress={handleImagePick}
              style={styles.inputAttachBtn}
              disabled={isUploading}
            >
              <Ionicons name="attach" size={22} color="#9CA3AF" style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCameraCapture}
              style={styles.inputCameraBtn}
              disabled={isUploading}
            >
              <Ionicons name="camera" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, (!messageText.trim() || isSending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending || isUploading}
            activeOpacity={0.8}
          >
            {isSending || isUploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Circle Menu Sheet ─────────────────────────────────────── */}
      {showMenu && (
        <>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowMenu(false)}
          >
            <View style={styles.menuBackdrop} />
          </Pressable>

          <View style={[styles.menuSheet, { backgroundColor: C.isDark ? '#1A1A2E' : '#FFFFFF', borderColor: C.borderDefault }]}>
            <View style={[styles.menuHandle, { backgroundColor: C.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

            {/* Circle info header */}
            <View style={styles.menuCircleHeader}>
              <View style={[styles.menuCircleAvatar, { borderColor: C.isDark ? 'rgba(198,34,41,0.3)' : 'rgba(198,34,41,0.2)' }]}>
                {circle?.coverImage
                  ? <Image source={{ uri: circle.coverImage }} style={styles.menuCircleAvatarImg} />
                  : <Ionicons name="people-circle-outline" size={32} color={C.primary} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuCircleName, { color: C.textPrimary }]}>{circle?.name}</Text>
                <Text style={[styles.menuCircleSub, { color: C.textMuted }]}>
                  {circle?.currentMembers ?? 0} members · {circle?.type === "PRIVATE" ? "Private" : "Public"}
                </Text>
              </View>
            </View>

            <View style={[styles.menuDivider, { backgroundColor: C.borderSubtle }]} />

            {/* Circle Details action */}
            <TouchableOpacity
              style={styles.menuAction}
              onPress={() => {
                setShowMenu(false);
                router.push({ pathname: "/(tabs)/circle-detail", params: { circleId } } as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuActionIcon, { backgroundColor: C.bgPrimarySubtle }]}>
                <Ionicons name="information-circle-outline" size={20} color={C.primary} />
              </View>
              <Text style={[styles.menuActionText, { color: C.textPrimary }]}>Circle Details</Text>
              <Ionicons name="chevron-forward" size={16} color={C.iconSecondary} />
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: C.borderSubtle }]} />

            {/* Members section */}
            <View style={styles.menuSectionHeader}>
              <Ionicons name="people-outline" size={15} color={C.textMuted} />
              <Text style={[styles.menuSectionTitle, { color: C.textMuted }]}>
                Participants · {membersResult?.total ?? circle?.currentMembers ?? 0}
              </Text>
            </View>

            <ScrollView
              style={styles.membersList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {membersResult === undefined ? (
                <View style={styles.membersLoading}>
                  <ActivityIndicator size="small" color={C.primary} />
                </View>
              ) : (
                membersResult.members.map((m: any) => {
                  const name = m.profile?.name ?? m.profile?.username ?? "Unknown";
                  const initial = name[0]?.toUpperCase() ?? "?";
                  const roleInfo = ROLE_BADGE[m.role];
                  return (
                    <View key={m._id} style={[styles.memberRow, { borderBottomColor: C.borderSubtle }]}>
                      <View style={[styles.memberAvatar, { backgroundColor: C.isDark ? '#1A1A2E' : '#F3F4F6' }]}>
                        {m.profile?.avatar
                          ? <Image source={{ uri: m.profile.avatar }} style={styles.memberAvatarImg} />
                          : <Text style={[styles.memberAvatarInitial, { color: C.textPrimary }]}>{initial}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: C.textPrimary }]} numberOfLines={1}>{name}</Text>
                        {m.profile?.username && (
                          <Text style={[styles.memberUsername, { color: C.textMuted }]}>@{m.profile.username}</Text>
                        )}
                      </View>
                      {roleInfo && (
                        <View style={[styles.memberRoleBadge, { backgroundColor: `${roleInfo.color}22`, borderColor: `${roleInfo.color}44` }]}>
                          <Text style={[styles.memberRoleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.menuDivider, { backgroundColor: C.borderSubtle }]} />

            {/* Leave circle */}
            {circle?.membership?.role !== "CREATOR" ? (
              <TouchableOpacity
                style={styles.menuAction}
                onPress={handleLeave}
                activeOpacity={0.7}
              >
                <View style={[styles.menuActionIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                  <Ionicons name="exit-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.menuActionText, { color: '#EF4444' }]}>Leave Circle</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.menuAction}>
                <View style={[styles.menuActionIcon, { backgroundColor: C.bgElevated }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={C.textMuted} />
                </View>
                <Text style={[styles.menuActionText, { color: C.textMuted }]}>You own this circle</Text>
              </View>
            )}

            <View style={{ height: tabBarHeight + insets.bottom + 16 }} />
          </View>
        </>
      )}

      </MobileCard>

      {/* ── Fullscreen Image Viewer ── */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setFullscreenImage(null)} activeOpacity={0.8}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.imageModalFull}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </AppBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // MobileCard layout
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  card: {
    flex: 1,
    overflow: "hidden",
  },

  // Header — dark blue bar
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  headerMain: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
  },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    overflow: "hidden",
  },
  headerAvatarFallback: {
    backgroundColor: 'rgba(198,34,41,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(198,34,41,0.3)',
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  // Pinned banner
  pinnedBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(245,158,11,0.2)',
  },
  pinnedText: { flex: 1, fontSize: 12, fontWeight: "500" },

  // Chat area — WhatsApp background
  chatArea: {
    flex: 1,
    position: "relative",
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Subtle pattern effect via border trick
    borderWidth: 0,
  },

  // List
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Date divider — WhatsApp-style centered pill
  dateDivider: {
    alignItems: "center",
    marginVertical: 14,
  },
  divPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  divLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Empty
  empty: { flex: 1, paddingVertical: 80, alignItems: "center", gap: 12 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 13 },

  // Message row
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  msgRowOwn: { flexDirection: "row-reverse" },

  // Avatar column
  avatarCol: { width: 32, alignItems: "center", justifyContent: "flex-end", marginRight: 4, marginBottom: 2 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 12, fontWeight: "800", color: "#fff" },

  // Message body
  msgBody: { flex: 1, alignItems: "flex-start", maxWidth: "80%" },
  msgBodyOwn: { alignItems: "flex-end" },

  // Name + role row
  nameRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginBottom: 2, marginLeft: 4,
  },
  senderName: { fontSize: 12, fontWeight: "700" },
  roleBadge: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4, borderWidth: 1,
  },
  roleLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },

  // Reply preview
  replyPreview: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 3,
    maxWidth: "100%",
  },
  replyStripe: { width: 3, borderRadius: 0 },
  replyFrom: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingTop: 4 },
  replyContent: { fontSize: 11, paddingHorizontal: 8, paddingBottom: 4 },

  // Bubble — WhatsApp style
  bubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 80,
  },
  bubbleImage: {
    padding: 3,
    paddingBottom: 4,
  },

  // Image message
  msgImage: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.45 * 0.75,
    borderRadius: 6,
    marginBottom: 2,
    maxWidth: 220,
    maxHeight: 165,
  },

  // Message text
  msgText: { fontSize: 14, lineHeight: 20 },

  // Meta (time + ticks) — WhatsApp-style bottom-right inside bubble
  metaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    marginTop: 2, gap: 2,
  },
  metaRowImage: {
    position: "absolute",
    bottom: 8,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editedLabel: { fontSize: 10, fontStyle: "italic" },
  timeLabel: { fontSize: 10 },

  // Reactions
  reactionsRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 4, marginTop: 3, marginLeft: 4,
  },
  reactionsRowOwn: { justifyContent: "flex-end", marginLeft: 0, marginRight: 4 },
  reactionChip: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 10, fontWeight: "700" },

  // Emoji bar
  emojiBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  emojiBarInner: {
    flexDirection: "row", height: 52,
    alignItems: "center", paddingHorizontal: 8, gap: 2,
  },
  emojiBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: 44 },
  emojiBtnText: { fontSize: 22 },

  // Input row — WhatsApp-style
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 8, paddingTop: 8,
  },
  inputIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingRight: 4,
  },
  input: {
    flex: 1, maxHeight: 100,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, color: '#FFFFFF', lineHeight: 20,
  },
  inputAttachBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  inputCameraBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", marginRight: 2,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#C62229',
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnOff: { opacity: 0.4 },

  // ── Circle menu sheet ─────────────────────────────────────────────────────
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  menuHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuCircleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  menuCircleAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  menuCircleAvatarImg: { width: "100%", height: "100%" },
  menuCircleName: { fontSize: 16, fontWeight: "700" },
  menuCircleSub: { fontSize: 12, marginTop: 2 },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  menuAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuActionIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  menuActionText: { flex: 1, fontSize: 15, fontWeight: "600" },

  menuSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  menuSectionTitle: {
    fontSize: 12, fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  membersList: { maxHeight: 220 },
  membersLoading: { paddingVertical: 20, alignItems: "center" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImg: { width: "100%", height: "100%" },
  memberAvatarInitial: { fontSize: 15, fontWeight: "800" },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberUsername: { fontSize: 11, marginTop: 1 },
  memberRoleBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  memberRoleText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  // ── Fullscreen image modal ──
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  imageModalFull: {
    width: "92%",
    height: "75%",
  },
});
