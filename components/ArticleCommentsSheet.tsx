/**
 * ArticleCommentsSheet
 * Slide-up bottom sheet with comment list + input for articles.
 * Structurally identical to ReelCommentsSheet — only the Convex
 * query/mutation targets differ (engagement.getArticleComments /
 * engagement.commentArticle).
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
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { MobileCard, useCardInsets } from "@/components/MobileCard";

// ─── Comment item ─────────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: any }) {
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
      <View style={styles.commentAvatar}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.commentAvatarImg}
            accessible={false}
          />
        ) : (
          <Ionicons name="person" size={18} color={Colors.iconSecondary} />
        )}
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor} allowFontScaling={false}>
            {comment.author?.username ?? comment.author?.name ?? "Unknown"}
          </Text>
          <Text style={styles.commentTime} allowFontScaling={false}>
            {timeAgo(comment.createdAt)}
          </Text>
        </View>
        <Text style={styles.commentText}>
          {comment.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ArticleCommentsSheetProps {
  articleId: Id<"articles"> | null;
  visible: boolean;
  onClose: () => void;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
export function ArticleCommentsSheet({
  articleId,
  visible,
  onClose,
}: ArticleCommentsSheetProps) {
  const insets    = useSafeAreaInsets();
  const cardInsets = useCardInsets();
  const inputRef  = useRef<TextInput>(null);
  const [text, setText]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const comments      = useQuery(
    api.engagement.getArticleComments,
    articleId ? { articleId } : "skip"
  );
  const commentArticle = useMutation(api.engagement.commentArticle);

  // Slide in/out animation — mirrors ReelCommentsSheet
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, slideAnim]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !articleId || submitting) return;
    setSubmitting(true);
    try {
      await commentArticle({ articleId, content: text.trim() });
      setText("");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }, [text, articleId, submitting, commentArticle]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  if (!visible && !articleId) return null;

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

      {/* Sheet */}
      <Animated.View
        style={[styles.sheetOuter, { left: cardInsets.left, right: cardInsets.right, transform: [{ translateY }] }]}
      >
        <MobileCard style={styles.card} containerStyle={styles.cardContainer}>
          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} allowFontScaling={false}>
              Comments
              {comments !== undefined && (
                <Text style={styles.sheetCount}> ({comments.length})</Text>
              )}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Close comments"
            >
              <Ionicons name="close" size={22} color={Colors.iconPrimary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.sheetBody}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {/* Comment list */}
            {comments === undefined ? (
              <View style={styles.centered}>
                <ActivityIndicator color={Colors.actionPrimary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons
                  name="chatbubble-outline"
                  size={40}
                  color={Colors.iconDisabled}
                />
                <Text style={styles.emptyText} allowFontScaling={false}>
                  No comments yet
                </Text>
                <Text style={styles.emptySubtext} allowFontScaling={false}>
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
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Input bar */}
            <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Add a comment…"
                placeholderTextColor={Colors.textDisabled}
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
                  (!text.trim() || submitting) && styles.sendBtnDisabled,
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

  sheetOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },

  cardContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  card: {
    flex: 1,
    padding: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  sheetTitle: {
    flex: 1,
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  sheetCount: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetBody: { flex: 1 },

  list: { flex: 1 },
  listContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space6,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: spacing.space3,
  },

  commentRow: {
    flexDirection: "row",
    gap: spacing.space3,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
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
  commentAuthor: { ...typeScale.labelSM, color: Colors.textPrimary },
  commentTime:   { ...typeScale.caption, color: Colors.textDisabled },
  commentText: {
    ...typeScale.bodyMD,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
  },
  emptyText:    { ...typeScale.headingSM, color: Colors.textMuted },
  emptySubtext: { ...typeScale.bodyMD,    color: Colors.textDisabled },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.bgElevated,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.bgBase,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 22,
    paddingHorizontal: spacing.space4,
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.actionPrimaryDisabled,
  },
});
