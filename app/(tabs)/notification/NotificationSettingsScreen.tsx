/**
 * NotificationSettingsScreen
 * Per-type in-app / email toggles, quiet hours, and batching preferences.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryFilter = "all" | "engagement" | "social" | "content" | "system";

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

const CATEGORIES: { id: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "all",        label: "All",        icon: "notifications-outline" },
  { id: "engagement", label: "Engagement", icon: "heart-outline"         },
  { id: "social",     label: "Social",     icon: "people-outline"        },
  { id: "content",    label: "Content",    icon: "newspaper-outline"     },
  { id: "system",     label: "System",     icon: "settings-outline"      },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [isLoading, setIsLoading] = useState(false);

  const userSettings        = useQuery(api.notifications.getUserSettings, { includeDefaults: true });
  const notificationTypes   = useQuery(api.notifications.getNotificationTypes);
  const globalPreferences   = useQuery(api.notifications.getGlobalNotificationPreferences);

  const updateSetting         = useMutation(api.notifications.updateNotificationSetting);
  const resetSettings         = useMutation(api.notifications.resetAllNotificationSettings);
  const updateGlobalPrefs     = useMutation(api.notifications.updateGlobalNotificationPreferences);

  // Group types by category
  const categorizedTypes = React.useMemo(() => {
    if (!notificationTypes) return {} as Record<string, typeof notificationTypes>;
    return notificationTypes.reduce(
      (acc: Record<string, any[]>, type: any) => {
        const cat = type.category || "system";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(type);
        return acc;
      },
      {}
    );
  }, [notificationTypes]);

  const filteredTypes: any[] =
    activeCategory === "all"
      ? Object.values(categorizedTypes).flat()
      : categorizedTypes[activeCategory] ?? [];

  const getSettingForType = (notificationType: string) =>
    userSettings?.find((s: any) => s && s.notificationType === notificationType);

  const handleToggleChannel = async (
    notificationType: string,
    channel: "in_app" | "email",
    enabled: boolean
  ) => {
    try {
      setIsLoading(true);
      const current = getSettingForType(notificationType);
      const currentChannels = current?.channels ?? {
        in_app: true, email: true, whatsapp: false, sms: false, push: false,
      };
      await updateSetting({
        notificationType,
        enabled: current?.enabled !== false,
        channels: { ...currentChannels, [channel]: enabled },
        batchingPreference: current?.batchingPreference ?? "immediate",
      });
    } catch (err) {
      Alert.alert("Error", `Failed to update ${channel} setting`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "Reset all notification settings to defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await resetSettings();
            } catch {
              Alert.alert("Error", "Failed to reset settings");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateGlobal = async (field: string, value: any) => {
    try {
      setIsLoading(true);
      await updateGlobalPrefs({ [field]: value });
    } catch {
      Alert.alert("Error", `Failed to update ${field}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isDataLoading = userSettings === undefined || notificationTypes === undefined;

  if (isDataLoading) {
    return (
      <AppBackground style={styles.root}>
        <MobileCard style={styles.mobileCard} containerStyle={styles.mobileCardContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.actionPrimary} size="large" />
            <Text style={styles.loadingText}>Loading settings…</Text>
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  return (
    <AppBackground style={styles.root}>
      <MobileCard style={styles.mobileCard} containerStyle={styles.mobileCardContainer}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.space3 }]}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Notification Settings
          </Text>
          <TouchableOpacity
            onPress={handleReset}
            disabled={isLoading}
            style={styles.resetBtn}
            accessibilityRole="button"
            accessibilityLabel="Reset to defaults"
          >
            <Text style={[styles.resetText, isLoading && styles.resetTextDisabled]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.scrollBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Global Preferences ── */}
          {globalPreferences && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>
                Global Preferences
              </Text>
              <View style={styles.card}>
                {/* Batching */}
                <View style={styles.prefRow}>
                  <View style={styles.prefInfo}>
                    <Ionicons name="layers-outline" size={18} color={Colors.iconAccent} />
                    <View style={styles.prefText}>
                      <Text style={styles.prefLabel} allowFontScaling={true}>
                        Group Notifications
                      </Text>
                      <Text style={styles.prefDesc} allowFontScaling={true}>
                        Bundle similar notifications together
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={(globalPreferences.batchingPreferences as any)?.immediate !== undefined}
                    onValueChange={(v) => handleUpdateGlobal("batchingEnabled", v)}
                    disabled={isLoading}
                    trackColor={{ false: Colors.bgElevated, true: Colors.actionPrimary }}
                    thumbColor={Colors.textPrimary}
                  />
                </View>

                <View style={styles.divider} />

                {/* Quiet hours info row */}
                <View style={styles.prefRow}>
                  <View style={styles.prefInfo}>
                    <Ionicons name="moon-outline" size={18} color={Colors.iconAccent} />
                    <View style={styles.prefText}>
                      <Text style={styles.prefLabel} allowFontScaling={true}>
                        Quiet Hours
                      </Text>
                      <Text style={styles.prefDesc} allowFontScaling={true}>
                        {(globalPreferences.quietHours?.settings as any)?.startTime ?? "22:00"}
                        {" – "}
                        {(globalPreferences.quietHours?.settings as any)?.endTime ?? "08:00"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.iconDisabled} />
                </View>
              </View>
            </View>
          )}

          {/* ── Category filter ── */}
          <View style={styles.categoryBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    activeCategory === cat.id && styles.categoryChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                  accessibilityState={{ selected: activeCategory === cat.id }}
                >
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={activeCategory === cat.id ? Colors.textPrimary : Colors.iconSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      activeCategory === cat.id && styles.categoryChipTextActive,
                    ]}
                    allowFontScaling={false}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Column headers ── */}
          <View style={styles.columnHeaders}>
            <Text style={styles.columnHeadersLabel} allowFontScaling={false}>
              {activeCategory === "all"
                ? "All Notifications"
                : CATEGORIES.find((c) => c.id === activeCategory)?.label}
            </Text>
            <View style={styles.columnHeadersRight}>
              <Text style={styles.columnHeaderText} allowFontScaling={false}>In-App</Text>
              <Text style={styles.columnHeaderText} allowFontScaling={false}>Email</Text>
            </View>
          </View>

          {/* ── Notification type rows ── */}
          {filteredTypes.length === 0 ? (
            <View style={styles.emptyTypes}>
              <Text style={styles.emptyTypesText}>
                No notification types in this category.
              </Text>
            </View>
          ) : (
            <View style={styles.typeList}>
              {filteredTypes.map((type: any) => {
                const setting = getSettingForType(type.id);
                const inAppEnabled  = setting?.channels?.in_app  !== false;
                const emailEnabled  = setting?.channels?.email   !== false;

                return (
                  <View key={type.id} style={styles.typeRow}>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeName} numberOfLines={1} allowFontScaling={true}>
                        {type.name}
                      </Text>
                      <Text style={styles.typeDesc} numberOfLines={2} allowFontScaling={true}>
                        {type.description}
                      </Text>
                      {type.priority === "high" && (
                        <View style={styles.highPriorityBadge}>
                          <Text style={styles.highPriorityText} allowFontScaling={false}>
                            High Priority
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.typeToggles}>
                      {/* In-App */}
                      <Switch
                        value={inAppEnabled}
                        onValueChange={(v) => handleToggleChannel(type.id, "in_app", v)}
                        disabled={isLoading}
                        trackColor={{ false: Colors.bgElevated, true: Colors.actionPrimary }}
                        thumbColor={Colors.textPrimary}
                        accessibilityLabel={`${type.name} in-app notifications`}
                      />
                      {/* Email */}
                      <Switch
                        value={emailEnabled}
                        onValueChange={(v) => handleToggleChannel(type.id, "email", v)}
                        disabled={isLoading}
                        trackColor={{ false: Colors.bgElevated, true: Colors.actionPrimary }}
                        thumbColor={Colors.textPrimary}
                        accessibilityLabel={`${type.name} email notifications`}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </MobileCard>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  mobileCardContainer: { flex: 1 },
  mobileCard: { flex: 1 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.space10,
    gap: spacing.space3,
  },
  loadingText: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: spacing.space2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    flex: 1,
  },
  resetBtn: {
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
  },
  resetText: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
  },
  resetTextDisabled: {
    opacity: 0.4,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.space4,
    gap: spacing.space4,
  },

  section: {
    paddingHorizontal: spacing.space4,
    gap: spacing.space2,
  },
  sectionTitle: {
    ...typeScale.overline,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    gap: spacing.space3,
  },
  prefInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
  },
  prefText: { flex: 1, gap: 2 },
  prefLabel: {
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  prefDesc: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: spacing.space4 + 18 + spacing.space3,
  },

  // Category bar — fixed height so chips never stretch
  categoryBar: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 52,
    justifyContent: "center",
  },
  categoryScroll: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
    alignItems: "center",
  },
  categoryChip: {
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
  categoryChipActive: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  categoryChipText: {
    ...typeScale.labelSM,
    color: Colors.iconSecondary,
  },
  categoryChipTextActive: {
    color: Colors.textPrimary,
  },

  // Column headers
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
  },
  columnHeadersLabel: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    flex: 1,
  },
  columnHeadersRight: {
    flexDirection: "row",
    gap: spacing.space4,
  },
  columnHeaderText: {
    ...typeScale.caption,
    color: Colors.textMuted,
    width: 52,
    textAlign: "center",
  },

  // Type list
  typeList: {
    paddingHorizontal: spacing.space4,
    gap: spacing.space2,
    paddingBottom: spacing.space4,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    gap: spacing.space3,
  },
  typeInfo: {
    flex: 1,
    gap: 3,
  },
  typeName: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  typeDesc: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  highPriorityBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
  },
  highPriorityText: {
    ...typeScale.caption,
    color: Colors.statusDanger,
    fontWeight: "600",
  },
  typeToggles: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
  },

  emptyTypes: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space8,
    alignItems: "center",
  },
  emptyTypesText: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
