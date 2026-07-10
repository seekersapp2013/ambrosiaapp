/**
 * NotificationAnalyticsDashboard
 * Admin-only analytics for the notification system.
 * Four tabs: Overview, Engagement, Performance, System Health.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
type TimeRange = "day" | "week" | "month";
type ActiveTab = "overview" | "engagement" | "performance" | "health";

interface NotificationAnalyticsDashboardProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
function formatPct(n: number): string { return `${n.toFixed(1)}%`; }
function formatDuration(ms: number): string {
  if (ms < 1_000)  return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "day",   label: "24h"     },
  { id: "week",  label: "7 days"  },
  { id: "month", label: "30 days" },
];

const TABS: { id: ActiveTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "overview",     label: "Overview",    icon: "bar-chart-outline"   },
  { id: "engagement",   label: "Engagement",  icon: "people-outline"      },
  { id: "performance",  label: "Performance", icon: "speedometer-outline" },
  { id: "health",       label: "Health",      icon: "pulse-outline"       },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({
  label, value, icon, iconBg, iconColor,
}: {
  label: string; value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
}) {
  return (
    <View style={metricStyles.card}>
      <View style={[metricStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={metricStyles.value} allowFontScaling={false}>{value}</Text>
      <Text style={metricStyles.label} allowFontScaling={true}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    alignItems: "center",
    gap: spacing.space2,
    minWidth: 80,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  value: { ...typeScale.headingMD, color: Colors.textPrimary },
  label: { ...typeScale.caption, color: Colors.textMuted, textAlign: "center" },
});

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  delivery, funnel,
}: {
  delivery: any; funnel: any;
}) {
  const funnelSteps = [
    { label: "Created",   value: funnel.funnel.created,   rate: 100 },
    { label: "Delivered", value: funnel.funnel.delivered, rate: funnel.conversionRates.deliveryRate },
    { label: "Viewed",    value: funnel.funnel.viewed,    rate: funnel.conversionRates.viewRate    },
    { label: "Clicked",   value: funnel.funnel.clicked,   rate: funnel.conversionRates.clickRate   },
  ];

  const channelIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    in_app:   "phone-portrait-outline",
    email:    "mail-outline",
    whatsapp: "logo-whatsapp",
    sms:      "chatbubble-outline",
  };

  return (
    <View style={tabStyles.container}>
      {/* Key metrics */}
      <View style={tabStyles.metricsRow}>
        <MetricCard label="Total" value={formatNumber(delivery.totalNotifications)}
          icon="notifications-outline" iconBg={Colors.statusInfoBg} iconColor={Colors.statusInfo} />
        <MetricCard label="Delivery" value={formatPct(delivery.performanceMetrics.deliverySuccessRate)}
          icon="checkmark-circle-outline" iconBg={Colors.statusSuccessBg} iconColor={Colors.statusSuccess} />
        <MetricCard label="CTR" value={formatPct(delivery.engagementMetrics.clickThroughRate)}
          icon="cursor-outline" iconBg={Colors.purpleSurface} iconColor={Colors.palette.purple} />
        <MetricCard label="Avg Time" value={formatDuration(delivery.performanceMetrics.averageDeliveryTime)}
          icon="time-outline" iconBg={Colors.amberSurface} iconColor={Colors.statusWarning} />
      </View>

      {/* Funnel */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>Notification Funnel</Text>
        {funnelSteps.map((step) => (
          <View key={step.label} style={tabStyles.funnelRow}>
            <Text style={tabStyles.funnelLabel} allowFontScaling={false}>{step.label}</Text>
            <View style={tabStyles.funnelBarBg}>
              <View style={[tabStyles.funnelBarFill, { width: `${Math.min(step.rate, 100)}%` }]}>
                <Text style={tabStyles.funnelBarText} allowFontScaling={false}>
                  {formatPct(step.rate)}
                </Text>
              </View>
            </View>
            <Text style={tabStyles.funnelCount} allowFontScaling={false}>
              {formatNumber(step.value)}
            </Text>
          </View>
        ))}
      </View>

      {/* Channel performance */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>Channel Performance</Text>
        {Object.entries(delivery.deliveryMetrics).map(([channel, metrics]: [string, any]) => (
          <View key={channel} style={tabStyles.channelRow}>
            <View style={tabStyles.channelHeader}>
              <Ionicons
                name={channelIconMap[channel] ?? "radio-outline"}
                size={16}
                color={Colors.iconSecondary}
              />
              <Text style={tabStyles.channelName} allowFontScaling={false}>
                {channel.replace("_", "-")}
              </Text>
            </View>
            <View style={tabStyles.channelStats}>
              <Text style={tabStyles.channelStat} allowFontScaling={false}>
                Sent: {formatNumber(metrics.sent)}
              </Text>
              <Text style={tabStyles.channelStat} allowFontScaling={false}>
                Delivered: {formatNumber(metrics.delivered)}
              </Text>
              {metrics.viewed !== undefined && (
                <Text style={tabStyles.channelStat} allowFontScaling={false}>
                  Viewed: {formatNumber(metrics.viewed)}
                </Text>
              )}
              {metrics.opened !== undefined && (
                <Text style={tabStyles.channelStat} allowFontScaling={false}>
                  Opened: {formatNumber(metrics.opened)}
                </Text>
              )}
              {metrics.failed !== undefined && metrics.failed > 0 && (
                <Text style={[tabStyles.channelStat, { color: Colors.statusDanger }]} allowFontScaling={false}>
                  Failed: {formatNumber(metrics.failed)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Engagement Tab ───────────────────────────────────────────────────────────
function EngagementTab({ engagement }: { engagement: any }) {
  const catIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    engagement: "heart-outline",
    social:     "people-outline",
    content:    "newspaper-outline",
    system:     "settings-outline",
  };

  return (
    <View style={tabStyles.container}>
      {/* Summary */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>Engagement Summary</Text>
        <View style={tabStyles.summaryRow}>
          <View style={tabStyles.summaryItem}>
            <Text style={tabStyles.summaryValue} allowFontScaling={false}>
              {formatNumber(engagement.summary.totalReceived)}
            </Text>
            <Text style={tabStyles.summaryLabel} allowFontScaling={true}>Received</Text>
          </View>
          <View style={tabStyles.summaryDivider} />
          <View style={tabStyles.summaryItem}>
            <Text style={tabStyles.summaryValue} allowFontScaling={false}>
              {formatNumber(engagement.summary.totalViewed)}
            </Text>
            <Text style={tabStyles.summaryLabel} allowFontScaling={true}>Viewed</Text>
          </View>
          <View style={tabStyles.summaryDivider} />
          <View style={tabStyles.summaryItem}>
            <Text style={tabStyles.summaryValue} allowFontScaling={false}>
              {formatPct(engagement.summary.engagementRate)}
            </Text>
            <Text style={tabStyles.summaryLabel} allowFontScaling={true}>Engagement</Text>
          </View>
        </View>
      </View>

      {/* Category engagement */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>By Category</Text>
        {Object.entries(engagement.categoryEngagement).map(([cat, data]: [string, any]) => (
          <View key={cat} style={tabStyles.catRow}>
            <View style={tabStyles.catIconWrap}>
              <Ionicons name={catIconMap[cat] ?? "grid-outline"} size={16} color={Colors.actionPrimary} />
            </View>
            <View style={tabStyles.catInfo}>
              <Text style={tabStyles.catName} allowFontScaling={false}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
              <Text style={tabStyles.catStats} allowFontScaling={false}>
                {data.received} received · {data.viewed} viewed · {data.clicked} clicked
              </Text>
            </View>
            <Text style={tabStyles.catRate} allowFontScaling={false}>
              {formatPct(data.engagementRate)}
            </Text>
          </View>
        ))}
      </View>

      {/* Recommendations */}
      {engagement.recommendations.length > 0 && (
        <View style={tabStyles.alertCard}>
          <Text style={tabStyles.alertTitle} allowFontScaling={false}>Recommendations</Text>
          {engagement.recommendations.map((rec: string, i: number) => (
            <View key={i} style={tabStyles.alertRow}>
              <Ionicons name="bulb-outline" size={14} color={Colors.statusWarning} />
              <Text style={tabStyles.alertText} allowFontScaling={true}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────
function PerformanceTab({ perf }: { perf: any }) {
  const statusColor =
    perf.systemStatus.status === "healthy"  ? Colors.statusSuccess :
    perf.systemStatus.status === "warning"  ? Colors.statusWarning :
    Colors.statusDanger;

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.metricsRow}>
        <MetricCard label="Notifs/hr" value={formatNumber(Math.round(perf.throughput.notificationsPerHour))}
          icon="trending-up-outline" iconBg={Colors.statusInfoBg} iconColor={Colors.statusInfo} />
        <MetricCard label="Avg Delivery" value={formatDuration(perf.latency.avgDeliveryLatencyMs)}
          icon="time-outline" iconBg={Colors.amberSurface} iconColor={Colors.statusWarning} />
        <MetricCard label="Success" value={formatPct(perf.reliability.successRate)}
          icon="shield-checkmark-outline" iconBg={Colors.statusSuccessBg} iconColor={Colors.statusSuccess} />
      </View>

      {/* System status */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>System Status</Text>
        <View style={tabStyles.statusRow}>
          <View style={[tabStyles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[tabStyles.statusText, { color: statusColor }]} allowFontScaling={false}>
            {perf.systemStatus.status.toUpperCase()}
          </Text>
          <Text style={tabStyles.statusUptime} allowFontScaling={false}>
            · {perf.systemStatus.uptime}% uptime
          </Text>
        </View>
      </View>

      {/* Batching efficiency */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>Batching Efficiency</Text>
        <View style={tabStyles.summaryRow}>
          <View style={tabStyles.summaryItem}>
            <Text style={tabStyles.summaryValue} allowFontScaling={false}>
              {perf.batchingEfficiency.totalBatches}
            </Text>
            <Text style={tabStyles.summaryLabel} allowFontScaling={true}>Batches</Text>
          </View>
          <View style={tabStyles.summaryDivider} />
          <View style={tabStyles.summaryItem}>
            <Text style={tabStyles.summaryValue} allowFontScaling={false}>
              {perf.batchingEfficiency.avgBatchSize.toFixed(1)}
            </Text>
            <Text style={tabStyles.summaryLabel} allowFontScaling={true}>Avg Size</Text>
          </View>
          <View style={tabStyles.summaryDivider} />
          <View style={tabStyles.summaryItem}>
            <Text style={tabStyles.summaryValue} allowFontScaling={false}>
              {formatPct(perf.batchingEfficiency.batchingRate)}
            </Text>
            <Text style={tabStyles.summaryLabel} allowFontScaling={true}>Batch Rate</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Health Tab ───────────────────────────────────────────────────────────────
function HealthTab({ health }: { health: any }) {
  const statusColor =
    health.overallHealth.status === "healthy" ? Colors.statusSuccess :
    health.overallHealth.status === "warning" ? Colors.statusWarning :
    Colors.statusDanger;

  const statusBg =
    health.overallHealth.status === "healthy" ? Colors.statusSuccessBg :
    health.overallHealth.status === "warning" ? Colors.statusWarningBg :
    Colors.statusDangerBg;

  return (
    <View style={tabStyles.container}>
      {/* Overall health */}
      <View style={tabStyles.card}>
        <View style={tabStyles.healthHeader}>
          <Text style={tabStyles.cardTitle} allowFontScaling={false}>System Health</Text>
          <View style={[tabStyles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[tabStyles.statusBadgeText, { color: statusColor }]} allowFontScaling={false}>
              {health.overallHealth.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={tabStyles.metricsRow}>
          <MetricCard label="Notifs (1h)" value={String(health.overallHealth.totalNotifications)}
            icon="notifications-outline" iconBg={Colors.statusInfoBg} iconColor={Colors.statusInfo} />
          <MetricCard label="Delivery" value={formatPct(health.overallHealth.deliveryRate)}
            icon="checkmark-circle-outline" iconBg={Colors.statusSuccessBg} iconColor={Colors.statusSuccess} />
          <MetricCard label="Failure" value={formatPct(health.overallHealth.failureRate)}
            icon="close-circle-outline" iconBg={Colors.statusDangerBg} iconColor={Colors.statusDanger} />
          <MetricCard label="Avg Process" value={formatDuration(health.overallHealth.avgProcessingTimeMs)}
            icon="time-outline" iconBg={Colors.amberSurface} iconColor={Colors.statusWarning} />
        </View>
      </View>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <View style={[tabStyles.alertCard, tabStyles.alertCardDanger]}>
          <Text style={[tabStyles.alertTitle, { color: Colors.statusDanger }]} allowFontScaling={false}>
            Active Alerts
          </Text>
          {health.alerts.map((alert: any, i: number) => (
            <View key={i} style={tabStyles.alertRow}>
              <Ionicons
                name={alert.type === "critical" ? "warning-outline" : "alert-circle-outline"}
                size={14}
                color={Colors.statusDanger}
              />
              <Text style={[tabStyles.alertText, { color: Colors.statusDanger }]} allowFontScaling={true}>
                {alert.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Channel health */}
      <View style={tabStyles.card}>
        <Text style={tabStyles.cardTitle} allowFontScaling={false}>Channel Health</Text>
        {Object.entries(health.channelHealth).map(([channel, ch]: [string, any]) => {
          const successRate = ch.sent > 0 ? ((ch.delivered / ch.sent) * 100).toFixed(1) + "%" : "100%";
          return (
            <View key={channel} style={tabStyles.channelRow}>
              <Text style={tabStyles.channelName} allowFontScaling={false}>
                {channel.replace("_", "-")}
              </Text>
              <View style={tabStyles.channelStats}>
                <Text style={tabStyles.channelStat} allowFontScaling={false}>Sent: {ch.sent}</Text>
                <Text style={tabStyles.channelStat} allowFontScaling={false}>Delivered: {ch.delivered}</Text>
                <Text
                  style={[tabStyles.channelStat, ch.failed > 0 && { color: Colors.statusDanger }]}
                  allowFontScaling={false}
                >
                  Failed: {ch.failed}
                </Text>
                <Text style={tabStyles.channelStat} allowFontScaling={false}>
                  Success: {successRate}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function NotificationAnalyticsDashboard({
  onBack,
}: NotificationAnalyticsDashboardProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  const deliveryAnalytics  = useQuery(api.notificationAnalytics.getDeliveryAnalytics,  { timeRange });
  const funnelAnalytics    = useQuery(api.notificationAnalytics.getFunnelAnalytics,    { timeRange });
  const engagementDashboard = useQuery(api.notificationAnalytics.getUserEngagementDashboard, { timeRange });
  const systemHealth       = useQuery(api.notificationAnalytics.getSystemHealthMetrics);
  const performanceMetrics = useQuery(api.notificationAnalytics.getPerformanceMonitoring, { timeRange });

  const isLoading =
    deliveryAnalytics === undefined ||
    funnelAnalytics   === undefined ||
    engagementDashboard === undefined;

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.space3, borderBottomColor: C.borderSubtle }]}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]} allowFontScaling={false}>
            Notification Analytics
          </Text>
          {/* Time range */}
          <View style={styles.timeRangeRow}>
            {TIME_RANGES.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setTimeRange(r.id)}
                style={[styles.timeBtn, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderSubtle }, timeRange === r.id && { backgroundColor: C.actionPrimary, borderColor: C.actionPrimary }]}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                accessibilityState={{ selected: timeRange === r.id }}
              >
                <Text
                  style={[styles.timeBtnText, { color: C.textMuted }, timeRange === r.id && styles.timeBtnTextActive]}
                  allowFontScaling={false}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tab bar ── */}
        <View style={[styles.tabBar, { borderBottomColor: C.borderSubtle }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabItem, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderSubtle }, activeTab === tab.id && { backgroundColor: C.bgPrimarySubtle, borderColor: C.borderFilled }]}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: activeTab === tab.id }}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={activeTab === tab.id ? C.actionPrimary : C.iconSecondary}
                />
                <Text
                  style={[styles.tabLabel, { color: C.iconSecondary }, activeTab === tab.id && { color: C.actionPrimary }]}
                  allowFontScaling={false}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Content ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={C.actionPrimary} size="large" />
            <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading analytics…</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.scrollBottomPadding }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {activeTab === "overview" && (
              <OverviewTab delivery={deliveryAnalytics} funnel={funnelAnalytics} />
            )}
            {activeTab === "engagement" && (
              <EngagementTab engagement={engagementDashboard} />
            )}
            {activeTab === "performance" && performanceMetrics && (
              <PerformanceTab perf={performanceMetrics} />
            )}
            {activeTab === "health" && systemHealth && (
              <HealthTab health={systemHealth} />
            )}
            {activeTab === "performance" && !performanceMetrics && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={C.actionPrimary} />
              </View>
            )}
            {activeTab === "health" && !systemHealth && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={C.actionPrimary} />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { flex: 1 },

  header: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: spacing.space2,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
  },
  timeRangeRow: {
    flexDirection: "row",
    gap: spacing.space2,
  },
  timeBtn: {
    paddingHorizontal: spacing.space3,
    paddingVertical: 6,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  timeBtnActive: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  timeBtnText: { ...typeScale.labelSM, color: Colors.textMuted },
  timeBtnTextActive: { color: Colors.textPrimary },

  // Tab bar — fixed height so tabs never stretch
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    height: 52,
    justifyContent: "center",
  },
  tabScroll: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
    alignItems: "center",
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.space3,
    paddingVertical: 7,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 34,
  },
  tabItemActive: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderColor: Colors.borderFilled,
  },
  tabLabel: { ...typeScale.labelSM, color: Colors.iconSecondary },
  tabLabelActive: { color: Colors.actionPrimary },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.space10,
    gap: spacing.space3,
  },
  loadingText: { ...typeScale.bodyMD, color: Colors.textMuted },
  content: { flex: 1 },
});

const tabStyles = StyleSheet.create({
  container: {
    padding: spacing.space4,
    gap: spacing.space4,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.space2,
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  cardTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
  },

  // Funnel
  funnelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  funnelLabel: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    width: 64,
  },
  funnelBarBg: {
    flex: 1,
    height: 22,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusXS,
    overflow: "hidden",
  },
  funnelBarFill: {
    height: "100%",
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusXS,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 6,
    minWidth: 40,
  },
  funnelBarText: {
    ...typeScale.caption,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  funnelCount: {
    ...typeScale.bodySM,
    color: Colors.textSecondary,
    width: 44,
    textAlign: "right",
  },

  // Channel
  channelRow: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusSM,
    padding: spacing.space3,
    gap: spacing.space2,
  },
  channelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  channelName: {
    ...typeScale.headingSM,
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: "capitalize",
  },
  channelStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space2,
  },
  channelStat: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  summaryValue: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderSubtle,
  },

  // Category
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    paddingVertical: spacing.space2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  catIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgPrimarySubtle,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  catInfo: { flex: 1, gap: 2 },
  catName: { ...typeScale.headingSM, fontSize: 13, color: Colors.textPrimary, textTransform: "capitalize" },
  catStats: { ...typeScale.caption, color: Colors.textMuted },
  catRate: { ...typeScale.headingSM, fontSize: 13, color: Colors.actionPrimary },

  // Alerts
  alertCard: {
    backgroundColor: Colors.statusWarningBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    padding: spacing.space4,
    gap: spacing.space2,
  },
  alertCardDanger: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.errorBorder,
  },
  alertTitle: {
    ...typeScale.headingSM,
    color: Colors.statusWarning,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
  },
  alertText: {
    ...typeScale.bodySM,
    color: Colors.statusWarning,
    flex: 1,
  },

  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  statusText: {
    ...typeScale.headingSM,
    fontSize: 13,
  },
  statusUptime: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },

  // Health header
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space3,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...typeScale.labelSM,
    fontWeight: "700",
  },
});
