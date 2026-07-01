/**
 * Article Viewer Screen
 * Route: /(tabs)/article-viewer?articleId=<id>
 *
 * Fixes applied:
 *   1. Access check — don't show paywall while hasAccess is still loading
 *      (undefined = loading → show spinner, not paywall).
 *   2. HTML rendering — WebView on native, iframe-in-div on web so rich
 *      formatting (headings, bold, lists, blockquotes, etc.) is preserved.
 *   3. Engagement bar — rendered outside the ScrollView, anchored at the
 *      bottom of the screen above the tab bar.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { LoadingSpinner } from "@/components/stream/LoadingSpinner";
import { EmptyState } from "@/components/stream/EmptyState";
import { ContentPaywallSheet } from "@/components/ContentPaywallSheet";
import { ArticleEngagementBar } from "@/components/ArticleEngagementBar";
import { Colors } from "@/constants/Colors";
import { useTabBarHeight } from "@/utils/useDeviceClass";

// ─── WebView import (native only) ────────────────────────────────────────────
let WebView: any = null;
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView;
  } catch {
    // falls back to plain text
  }
}

// ─── HTML shell for article body ─────────────────────────────────────────────
function buildArticleHtml(contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#0f0f1e;color:#D1D5DB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.75;padding:0 4px}
  h1{font-size:24px;font-weight:700;color:#fff;line-height:1.3;margin:16px 0 8px}
  h2{font-size:20px;font-weight:700;color:#fff;line-height:1.35;margin:14px 0 6px}
  h3{font-size:17px;font-weight:600;color:#E5E7EB;margin:12px 0 5px}
  h4{font-size:15px;font-weight:600;color:#D1D5DB;margin:10px 0 4px}
  p{margin-bottom:10px}
  b,strong{color:#fff;font-weight:700}
  i,em{color:#E5E7EB}
  u{text-decoration-color:rgba(198,34,41,0.7)}
  s{opacity:0.6}
  a{color:#C62229;text-decoration:underline}
  ul,ol{padding-left:22px;margin:6px 0 10px}
  li{margin-bottom:4px}
  blockquote{border-left:3px solid #C62229;padding:6px 12px;margin:10px 0;background:rgba(198,34,41,0.06);border-radius:0 6px 6px 0;color:#9CA3AF;font-style:italic}
  pre{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:8px;padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;margin:8px 0;color:#D1D5DB}
  code{background:rgba(255,255,255,0.07);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:13px;color:#E5E7EB}
  img{max-width:100%;border-radius:8px;margin:6px 0;display:block}
  hr{border:none;border-top:1px solid rgba(255,255,255,0.12);margin:14px 0}
  table{border-collapse:collapse;width:100%;margin:10px 0}
  td,th{border:1px solid rgba(255,255,255,0.15);padding:7px 10px;text-align:left}
  th{background:rgba(255,255,255,0.06);font-weight:600;color:#fff}
  sub{font-size:0.75em;vertical-align:sub}
  sup{font-size:0.75em;vertical-align:super}
  mark{background:rgba(245,158,11,0.30);color:#fff;border-radius:2px;padding:0 2px}
</style>
</head>
<body>
${contentHtml}
<script>
  // Post document height so RN can set WebView height
  function sendHeight(){
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({type:'height',value:document.body.scrollHeight})
    );
  }
  window.addEventListener('load', sendHeight);
  new MutationObserver(sendHeight).observe(document.body,{childList:true,subtree:true,attributes:true});
<\/script>
</body>
</html>`;
}

// ─── ArticleBodyRenderer ──────────────────────────────────────────────────────
// Renders HTML with proper styling. On web uses a div with dangerouslySetInnerHTML,
// on native uses react-native-webview with auto-height.
interface ArticleBodyRendererProps {
  contentHtml: string;
}

function ArticleBodyRenderer({ contentHtml }: ArticleBodyRendererProps) {
  const [webViewHeight, setWebViewHeight] = useState(400);

  if (Platform.OS === "web") {
    // Web: render inside a styled div. Using dangerouslySetInnerHTML on a <div>
    // (not an <iframe>) avoids MetaMask extension interference.
    return (
      <div
        // biome-ignore lint: HTML is authored content from the DB, same origin
        dangerouslySetInnerHTML={{ __html: injectWebStyles(contentHtml) }}
      />
    );
  }

  // Native: WebView with auto-height
  if (!WebView) {
    // Fallback if WebView not available
    const plain = contentHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return <Text style={styles.articleBodyPlain}>{plain}</Text>;
  }

  return (
    <WebView
      source={{ html: buildArticleHtml(contentHtml) }}
      style={{ height: webViewHeight, backgroundColor: "transparent" }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      onMessage={(e: any) => {
        try {
          const data = JSON.parse(e.nativeEvent.data);
          if (data.type === "height" && data.value > 0) {
            setWebViewHeight(data.value + 16);
          }
        } catch {}
      }}
      injectedJavaScript={`
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type:'height',value:document.body.scrollHeight})
        );true;
      `}
      originWhitelist={["*"]}
      backgroundColor="transparent"
    />
  );
}

// Injects inline <style> into the HTML for web rendering inside a div
function injectWebStyles(html: string): string {
  return `<style>
.ab{color:#D1D5DB;font-size:15px;line-height:1.75;word-break:break-word}
.ab h1{font-size:24px;font-weight:700;color:#fff;line-height:1.3;margin:16px 0 8px}
.ab h2{font-size:20px;font-weight:700;color:#fff;line-height:1.35;margin:14px 0 6px}
.ab h3{font-size:17px;font-weight:600;color:#E5E7EB;margin:12px 0 5px}
.ab h4{font-size:15px;font-weight:600;color:#D1D5DB;margin:10px 0 4px}
.ab p{margin-bottom:10px}
.ab b,.ab strong{color:#fff;font-weight:700}
.ab i,.ab em{color:#E5E7EB}
.ab u{text-decoration-color:rgba(198,34,41,0.7)}
.ab a{color:#C62229;text-decoration:underline}
.ab ul,.ab ol{padding-left:22px;margin:6px 0 10px}
.ab li{margin-bottom:4px}
.ab blockquote{border-left:3px solid #C62229;padding:6px 12px;margin:10px 0;background:rgba(198,34,41,0.06);border-radius:0 6px 6px 0;color:#9CA3AF;font-style:italic}
.ab pre{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:8px;padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;margin:8px 0;color:#D1D5DB}
.ab code{background:rgba(255,255,255,0.07);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:13px;color:#E5E7EB}
.ab img{max-width:100%;border-radius:8px;margin:6px 0;display:block}
.ab hr{border:none;border-top:1px solid rgba(255,255,255,0.12);margin:14px 0}
.ab table{border-collapse:collapse;width:100%;margin:10px 0}
.ab td,.ab th{border:1px solid rgba(255,255,255,0.15);padding:7px 10px;text-align:left}
.ab th{background:rgba(255,255,255,0.06);font-weight:600;color:#fff}
.ab sub{font-size:0.75em;vertical-align:sub}
.ab sup{font-size:0.75em;vertical-align:super}
.ab mark{background:rgba(245,158,11,0.30);color:#fff;border-radius:2px;padding:0 2px}
</style><div class="ab">${html}</div>`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ArticleViewerScreen() {
  const router = useRouter();
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const insets       = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  // Enough bottom padding so the engagement bar + tab bar + safe area all clear
  const scrollBottomPad = tabBarHeight + insets.bottom + 32;

  const [paywallOpen, setPaywallOpen]     = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const readRecorded = useRef(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const article = useQuery(
    api.articles.getArticleById,
    articleId ? { articleId: articleId as Id<"articles"> } : "skip"
  );

  // hasAccessResult:
  //   undefined = still loading (show spinner, NOT paywall)
  //   true      = has access
  //   false     = no access (show paywall for gated articles)
  const hasAccessResult = useQuery(
    api.payments.hasAccess,
    articleId
      ? { contentType: "article", contentId: articleId as Id<"articles"> }
      : "skip"
  );

  const recordRead = useMutation(api.engagement.recordArticleRead);

  // Access is resolved once hasAccessResult is no longer undefined
  const accessResolved = hasAccessResult !== undefined;
  const resolvedAccess = accessGranted || (hasAccessResult === true);
  const isGated        = article?.isGated ?? false;

  // canViewBody is only true when:
  //   - article is not gated, OR
  //   - access check has resolved AND user has access
  const canViewBody = !isGated || (accessResolved && resolvedAccess);

  // ── Record read once body becomes visible ─────────────────────────────────
  useEffect(() => {
    if (canViewBody && articleId && !readRecorded.current) {
      readRecorded.current = true;
      recordRead({ articleId: articleId as Id<"articles"> }).catch(() => {});
    }
  }, [canViewBody, articleId, recordRead]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!articleId) {
    return (
      <AppBackground>
        <EmptyState icon="alert-circle-outline" title="No article specified" />
      </AppBackground>
    );
  }

  if (article === undefined) {
    return (
      <AppBackground>
        <LoadingSpinner label="Loading article…" />
      </AppBackground>
    );
  }

  if (article === null) {
    return (
      <AppBackground>
        <View style={styles.centeredWrap}>
          <EmptyState
            icon="document-outline"
            title="Article not found"
            subtitle="This article may have been removed or is not yet published."
            ctaLabel="Go Back"
            onCta={() => router.back()}
          />
        </View>
      </AppBackground>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const authorName =
    (article as any).author?.name ??
    (article as any).author?.username ??
    "Unknown";
  const timeAgo   = formatTimeAgo(article.createdAt);
  const priceAmount = (article as any).priceAmount ?? 0;
  const priceToken  = (article as any).priceToken  ?? "USD";

  // Paywall is shown when: article is gated AND access is resolved AND no access
  const showPaywall = isGated && accessResolved && !resolvedAccess;
  // Show a spinner over the body area while the access check is still loading
  const showAccessSpinner = isGated && !accessResolved;

  return (
    <AppBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard>
          {/* ── Nav bar ────────────────────────────────────────── */}
          <View style={styles.navBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.navTitle} numberOfLines={1}>Article</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Cover image ────────────────────────────────────── */}
          {article.coverImage ? (
            <Image
              source={{ uri: article.coverImage }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="newspaper-outline" size={40} color="rgba(255,255,255,0.2)" />
            </View>
          )}

          <View style={styles.body}>
            {/* ── Gated badge ──────────────────────────────────── */}
            {isGated && (
              <View style={styles.gatedBadge}>
                <Ionicons
                  name={resolvedAccess ? "lock-open" : "lock-closed"}
                  size={11}
                  color={Colors.statusWarning}
                />
                <Text style={styles.gatedText}>
                  {resolvedAccess ? "Unlocked" : "Premium"}
                </Text>
              </View>
            )}

            {/* ── Title ────────────────────────────────────────── */}
            <Text style={styles.title}>{article.title}</Text>

            {/* ── Subtitle ─────────────────────────────────────── */}
            {article.subtitle ? (
              <Text style={styles.subtitle}>{article.subtitle}</Text>
            ) : null}

            {/* ── Author + meta ─────────────────────────────────── */}
            <View style={styles.metaRow}>
              <View style={styles.authorAvatar}>
                {(article as any).author?.avatar ? (
                  <Image
                    source={{ uri: (article as any).author.avatar }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Ionicons name="person-circle-outline" size={18} color={Colors.textMuted} />
                )}
              </View>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.timestamp}>{timeAgo}</Text>
              {article.readTimeMin ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.readTime}>{article.readTimeMin} min read</Text>
                </>
              ) : null}
            </View>

            {/* ── Tags ─────────────────────────────────────────── */}
            {article.tags && article.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {article.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* ── Access spinner ────────────────────────────────── */}
            {showAccessSpinner && (
              <View style={styles.accessSpinnerWrap}>
                <ActivityIndicator color={Colors.actionPrimary} />
                <Text style={styles.accessSpinnerText}>Checking access…</Text>
              </View>
            )}

            {/* ── Full article body ─────────────────────────────── */}
            {canViewBody && article.contentHtml ? (
              <ArticleBodyRenderer contentHtml={article.contentHtml} />
            ) : canViewBody && !article.contentHtml ? (
              <View style={styles.emptyBodyWrap}>
                <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyBodyText}>No content available.</Text>
              </View>
            ) : null}

            {/* ── Paywall ───────────────────────────────────────── */}
            {showPaywall && (
              <View style={styles.paywallWrap}>
                {article.contentHtml ? (
                  <Text style={styles.previewText} numberOfLines={4}>
                    {article.contentHtml
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 220)}…
                  </Text>
                ) : null}
                <View style={styles.paywallOverlay} pointerEvents="none" />
                <View style={styles.unlockCard}>
                  <View style={styles.unlockIconWrap}>
                    <Ionicons name="lock-closed" size={28} color={Colors.statusWarning} />
                  </View>
                  <Text style={styles.unlockTitle}>Premium Article</Text>
                  <Text style={styles.unlockSubtitle}>
                    Unlock full access for{" "}
                    <Text style={styles.unlockPrice}>
                      {priceToken} {(priceAmount as number).toFixed(2)}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.unlockBtn}
                    onPress={() => setPaywallOpen(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Unlock article for ${priceToken} ${priceAmount}`}
                  >
                    <Ionicons name="lock-open-outline" size={18} color="#fff" />
                    <Text style={styles.unlockBtnText}>Unlock Article</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Engagement bar — inside MobileCard, below body ──── */}
          <ArticleEngagementBar
            articleId={articleId as Id<"articles">}
            title={article.title}
            authorUsername={(article as any).author?.username}
            isGated={isGated}
            hasAccess={resolvedAccess}
          />
        </MobileCard>
      </ScrollView>

      {/* ── Paywall sheet ───────────────────────────────────────────── */}
      <ContentPaywallSheet
        visible={paywallOpen}
        contentType="article"
        contentId={articleId}
        price={priceAmount}
        currency={priceToken}
        title={article.title ?? ""}
        creatorName={authorName}
        onClose={() => setPaywallOpen(false)}
        onSuccess={(_paymentId) => {
          setAccessGranted(true);
          setPaywallOpen(false);
        }}
      />
    </AppBackground>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {},
  centeredWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.redBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  coverPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    padding: 20,
    gap: 12,
  },

  gatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: Colors.amberSurface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
  },
  gatedText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.statusWarning,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  authorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 22, height: 22, borderRadius: 11 },
  authorName: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  metaDot: { fontSize: 13, color: Colors.textMuted },
  timestamp: { fontSize: 12, color: Colors.textMuted },
  readTime: { fontSize: 12, color: Colors.textMuted },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: Colors.textMuted },

  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 4,
  },

  // Access check spinner
  accessSpinnerWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  accessSpinnerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Plain text fallback (when WebView not available)
  articleBodyPlain: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 26,
  },

  emptyBodyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyBodyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Paywall
  paywallWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  },
  previewText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  paywallOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: "30%",
    backgroundColor: Colors.bgBase,
    opacity: 0.92,
  },
  unlockCard: {
    marginTop: 16,
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    padding: 24,
    gap: 8,
  },
  unlockIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.amberSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  unlockTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  unlockSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  unlockPrice: {
    fontWeight: "700",
    color: Colors.statusWarning,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    height: 48,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
  },
  unlockBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
