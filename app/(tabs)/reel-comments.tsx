/**
 * Reel Comments Screen
 * Route: /(tabs)/reel-comments?reelId=<id>
 *
 * Layout: AppBackground → full-width header → MobileCard (list + input)
 */

import React, { useState, useRef, useCallback } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

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
        <Text style={styles.commentText} allowFontScaling={true}>
          {comment.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
function CommentsContent() {
  const { reelId } = useLocalSearchParams<{ reelId: string }>();
  const router = useRouter();
  const history = useNavigationHistory();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const comments = useQuery(
    api.engagement.getReelComments,
    reelId ? { reelId: reelId as Id<"reels"> } : "skip"
  );
  const commentReel = useMutation(api.engagement.commentReel);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !reelId || submitting) return;
    setSubmitting(true);
    try {
      await commentReel({ reelId: reelId as Id<"reels">, content: text.trim() });
      setText("");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }, [text, reelId, submitting, commentReel]);

  return (
    <AppBackground style={styles.root}>
      {/* ── Header — full width, outside card ──────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => history.goBack(router)}
          style={styles.backBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Comments
          {comments !== undefined && (
            <Text style={styles.headerCount}> ({comments.length})</Text>
          )}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* ── Card: list + input ─────────────────────────────────────────── */}
      <MobileCard style={styles.card} containerStyle={styles.cardContainer}>
        <KeyboardAvoidingView
          style={styles.cardInner}
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
              <Ionicons name="chatbubble-outline" size={48} color={Colors.iconDisabled} />
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
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || submitting) && styles.sendBtnDisabled]}
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
    </AppBackground>
  );
}

export default function ReelCommentsScreen() {
  return (
    <>
      <AuthLoading><AppLoader /></AuthLoading>
      <Unauthenticated><Redirect href="/" /></Unauthenticated>
      <Authenticated><CommentsContent /></Authenticated>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header — outside card, full width
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.bgBase,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  headerCount: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
  },
  headerRight: { width: 36 },

  // Card
  cardContainer: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 16,
  },
  card: {
    flex: 1,
    padding: 0,
  },
  cardInner: {
    flex: 1,
  },

  // List
  list: { flex: 1 },
  listContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
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
  commentTime: { ...typeScale.caption, color: Colors.textDisabled },
  commentText: {
    ...typeScale.bodyMD,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Empty / loading
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
  },
  emptyText: { ...typeScale.headingSM, color: Colors.textMuted },
  emptySubtext: { ...typeScale.bodyMD, color: Colors.textDisabled },

  // Input bar
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
