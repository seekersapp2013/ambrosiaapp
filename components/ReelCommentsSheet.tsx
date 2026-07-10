/**
 * ReelCommentsSheet
 * Slide-up bottom sheet with comment list + input.
 * Renders as a Modal so it sits above the reel video without clipping issues.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Animated,
  Pressable,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { MobileCard, useCardInsets } from "@/components/MobileCard";

// ─── Comment item ─────────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: any }) {
  const C = useColors();
  const avatarUrl = useQuery(
    api.files.getFileUrl,
    comment.author?.avatar ? { storageId: comment.author.avatar } : "skip"
  );

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  };

  return (
    <View style={styles.commentRow}>
      <View style={[styles.commentAvatar, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.commentAvatarImg}
            accessible={false}
          />
        ) : (
          <Ionicons name="person" size={18} color={C.iconSecondary} />
        )}
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentAuthor, { color: C.textPrimary }]} allowFontScaling={false}>
            {comment.author?.username ?? comment.author?.name ?? "Unknown"}
          </Text>
          <Text style={[styles.commentTime, { color: C.textDisabled }]} allowFontScaling={false}>
            {timeAgo(comment.createdAt)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: C.textSecondary }]} allowFontScaling>
          {comment.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ReelCommentsSheetProps {
  reelId: Id<"reels"> | null;
  visible: boolean;
  onClose: () => void;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
export function ReelCommentsSheet({
  reelId,
  visible,
  onClose,
}: ReelCommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const cardInsets = useCardInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const C = useColors();

  // Header and input bar always use dark-mode appearance for contrast
  const headerBg = '#0F0F1E';
  const headerText = '#FFFFFF';
  const headerIcon = '#D1D5DB';
  const headerBorder = 'rgba(255,255,255,0.08)';
  const inputBarBg = '#0F0F1E';
  const inputBg = '#08080F';
  const inputBorder = 'rgba(255,255,255,0.12)';
  const inputTextColor = '#FFFFFF';

  const comments = useQuery(
    api.engagement.getReelComments,
    reelId ? { reelId } : "skip"
  );
  const commentReel = useMutation(api.engagement.commentReel);

  // Slide in/out animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, slideAnim]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !reelId || submitting) return;
    setSubmitting(true);
    try {
      await commentReel({ reelId, content: text.trim() });
      setText("");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }, [text, reelId, submitting, commentReel]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  if (!visible && !reelId) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet — MobileCard wraps everything including the header */}
      <Animated.View
        style={[styles.sheetOuter, { left: cardInsets.left, right: cardInsets.right, transform: [{ translateY }] }]}
      >
        <MobileCard
          style={styles.card}
          containerStyle={styles.cardContainer}
        >
          {/* Handle bar + Header — merged so dark bg starts at top */}
          <View style={[styles.sheetHeader, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <View style={styles.headerRow}>
              <Text style={[styles.sheetTitle, { color: headerText }]} allowFontScaling={false}>
                Comments
                {comments !== undefined && (
                  <Text style={{ color: '#9CA3AF' }}> ({comments.length})</Text>
                )}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close comments"
              >
                <Ionicons name="close" size={22} color={headerIcon} />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            style={styles.sheetBody}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {/* Comment list */}
            {comments === undefined ? (
              <View style={styles.centered}>
                <ActivityIndicator color={C.actionPrimary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons
                  name="chatbubble-outline"
                  size={40}
                  color={C.textDisabled}
                />
                <Text style={[styles.emptyText, { color: C.textMuted }]} allowFontScaling={false}>
                  No comments yet
                </Text>
                <Text style={[styles.emptySubtext, { color: C.textDisabled }]} allowFontScaling={false}>
                  Be the first to comment
                </Text>
              </View>
            ) : (
              <FlatList
                data={comments as any[]}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <CommentItem comment={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: C.borderSubtle }]} />}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Input bar */}
            <View
              style={[
                styles.inputBar,
                { paddingBottom: insets.bottom + 8, backgroundColor: inputBarBg, borderTopColor: headerBorder },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: inputTextColor }]}
                placeholder="Add a comment…"
                placeholderTextColor="#6B7280"
                value={text}
                onChangeText={setText}
                maxLength={500}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                editable={!submitting}
                accessibilityLabel="Comment input"
                autoFocus={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: C.actionPrimary },
                  (!text.trim() || submitting) && { backgroundColor: C.actionPrimaryDisabled },
                ]}
                onPress={handleSubmit}
                disabled={!text.trim() || submitting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Post comment"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </MobileCard>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // Animated wrapper — anchored to bottom of screen
  sheetOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },

  // MobileCard container fills the sheetOuter, no extra padding
  cardContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // MobileCard panel — square bottom corners so it sits flush at screen edge
  card: {
    flex: 1,
    padding: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  sheetHeader: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetTitle: {
    flex: 1,
    ...typeScale.headingMD,
    textAlign: "center",
  },
  sheetCount: {
    ...typeScale.bodyMD,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetBody: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // List
  list: { flex: 1 },
  listContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space6,
  },
  separator: {
    height: 1,
    marginVertical: spacing.space3,
  },

  // Comment row
  commentRow: {
    flexDirection: "row",
    gap: spacing.space3,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  commentAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentBody: { flex: 1 },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginBottom: 3,
  },
  commentAuthor: { ...typeScale.labelSM },
  commentTime: { ...typeScale.caption },
  commentText: {
    ...typeScale.bodyMD,
    lineHeight: 20,
  },

  // Empty / loading
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
  },
  emptyText: { ...typeScale.headingSM },
  emptySubtext: { ...typeScale.bodyMD },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: spacing.space4,
    ...typeScale.bodyMD,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
