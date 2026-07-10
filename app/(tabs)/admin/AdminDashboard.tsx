/**
 * AdminDashboard — React Native
 * Card-based navigation matching the Booking screen design pattern.
 * Uses ScreenHeader, stat cards, action tiles, and section cards.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useIsModerator, useIsAdmin } from '@/app/hooks/usePermissions';
import { AppBackground } from '@/components/AppBackground';
import { AppLoader } from '@/components/AppLoader';
import { MobileCard } from '@/components/MobileCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useColors } from '@/hooks/useColors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

import { ModerationQueue } from './ModerationQueue';
import { ModerationHistory } from './ModerationHistory';
import { ModerationSettingsPanel } from './ModerationSettingsPanel';
import { RoleManagement } from './RoleManagement';
import { UserRoleAssignment } from './UserRoleAssignment';
import { AdManagementPanel } from './AdManagementPanel';
import { NotificationAnalyticsDashboard } from './NotificationAnalyticsDashboard';

type ScreenType = 'home' | 'queue' | 'roles' | 'settings' | 'users' | 'history' | 'ads' | 'notifications';

// ─── Action Tile (matches booking pattern) ────────────────────────────────────
function ActionTile({ icon, label, onPress, iconBg, iconColor, C }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void;
  iconBg: string; iconColor: string; C: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress}
      activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.actionTileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.actionTileLabel, { color: C.textSecondary }]} numberOfLines={1} allowFontScaling={false}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const C = useColors();
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');

  const isModerator = useIsModerator();
  const isAdmin = useIsAdmin();
  const myRoles = useQuery(api.moderation.getMyRoles);
  const queueData = useQuery(api.moderationActions.getModerationQueue, {});
  const platformStats = useQuery(api.adminStats.getPlatformStats, {});

  if (isModerator === undefined) return <AppLoader />;

  // Access denied
  if (!isModerator) {
    return (
      <AppBackground>
        <ScreenHeader title="Admin Dashboard" onBack={() => router.push('/(tabs)/profile')} />
        <View style={styles.centeredInner}>
          <View style={[styles.deniedCard, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
            <View style={[styles.deniedIconWrap, { backgroundColor: C.isDark ? 'rgba(198,34,41,0.08)' : 'rgba(198,34,41,0.06)' }]}>
              <Ionicons name="lock-closed-outline" size={44} color={C.iconSecondary} />
            </View>
            <Text style={[styles.deniedTitle, { color: C.textPrimary }]}>Access Denied</Text>
            <Text style={[styles.deniedSubtitle, { color: C.textMuted }]}>
              You don't have permission to access the admin dashboard.
            </Text>
            <TouchableOpacity style={[styles.deniedBackBtn, { backgroundColor: C.actionPrimary }]} onPress={() => router.back()}>
              <Text style={styles.deniedBackBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppBackground>
    );
  }

  const roleNames = myRoles && myRoles.length > 0 ? myRoles.map((r: any) => r.name).join(', ') : null;
  const pendingCount = queueData?.length ?? 0;

  // ── Sub-screen rendering ──────────────────────────────────────────────────
  if (activeScreen !== 'home') {
    const titles: Record<string, string> = { queue: 'Moderation Queue', roles: 'Role Management', settings: 'Settings', users: 'User Assignment', history: 'History', ads: 'Ad Management', notifications: 'Notifications' };
    return (
      <AppBackground>
        <ScreenHeader title={titles[activeScreen] ?? 'Admin'} onBack={() => setActiveScreen('home')} />
        <MobileCard style={styles.subCardOverride} containerStyle={styles.subCardContainer}>
          {activeScreen === 'queue'         && <ModerationQueue />}
          {activeScreen === 'history'       && <ModerationHistory />}
          {activeScreen === 'settings'      && isAdmin && <ModerationSettingsPanel />}
          {activeScreen === 'roles'         && isAdmin && <RoleManagement />}
          {activeScreen === 'users'         && isAdmin && <UserRoleAssignment />}
          {activeScreen === 'ads'           && isAdmin && <AdManagementPanel />}
          {activeScreen === 'notifications' && isAdmin && <NotificationAnalyticsDashboard onBack={() => setActiveScreen('home')} />}
        </MobileCard>
      </AppBackground>
    );
  }

  // ── Home screen ───────────────────────────────────────────────────────────
  return (
    <AppBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MobileCard>
          {/* ── Header bar ── */}
          <ScreenHeader
            title="Admin Dashboard"
            onBack={() => router.push('/(tabs)/profile')}
            trailing={
              roleNames ? (
                <View style={[styles.roleBadge, { backgroundColor: C.isDark ? 'rgba(198,34,41,0.15)' : 'rgba(198,34,41,0.12)', borderColor: C.isDark ? 'rgba(198,34,41,0.35)' : 'rgba(198,34,41,0.25)' }]}>
                  <Ionicons name="shield-checkmark" size={10} color={C.primary} />
                  <Text style={[styles.roleBadgeText, { color: C.isDark ? '#D1D5DB' : '#FFFFFF' }]} numberOfLines={1}>{roleNames}</Text>
                </View>
              ) : undefined
            }
          />

          {/* ── Queue banner (like Provider Dashboard banner) ── */}
          <TouchableOpacity
            style={[styles.queueBanner, { backgroundColor: C.statusWarningBg, borderColor: C.amberBorder }]}
            onPress={() => setActiveScreen('queue')}
            activeOpacity={0.88}
          >
            <View style={[styles.queueBannerAccent, { backgroundColor: C.statusWarning }]} />
            <View style={[styles.queueBannerIconWrap, { backgroundColor: C.amberSurface }]}>
              <Ionicons name="mail-unread" size={22} color={C.statusWarning} />
            </View>
            <View style={styles.queueBannerText}>
              <View style={styles.queueBannerTitleRow}>
                <Text style={[styles.queueBannerTitle, { color: C.textPrimary }]} allowFontScaling={false}>
                  Moderation Queue
                </Text>
                {pendingCount > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: C.statusWarning }]}>
                    <Text style={styles.countBadgeText} allowFontScaling={false}>{pendingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.queueBannerSub, { color: C.textMuted }]} allowFontScaling={false}>
                Review pending content · Approve or reject
              </Text>
            </View>
            <View style={[styles.queueBannerChevron, { backgroundColor: C.amberSurface }]}>
              <Ionicons name="chevron-forward" size={16} color={C.statusWarning} />
            </View>
          </TouchableOpacity>

          {/* ── Bird's Eye View Analytics ── */}
          <View style={styles.analyticsBlock}>
            <Text style={[styles.analyticsTitle, { color: C.textPrimary }]} allowFontScaling={false}>Platform Overview</Text>
            <Text style={[styles.analyticsSub, { color: C.textMuted }]} allowFontScaling={false}>
              Bird's eye view of your platform
            </Text>
          </View>

          <View style={styles.analyticsGrid}>
            <View style={[styles.analyticsCard, { backgroundColor: C.statusInfoBg, borderColor: C.isDark ? C.blueBorder : 'rgba(37,99,235,0.15)' }]}>
              <Ionicons name="people" size={20} color={C.statusInfo} />
              <Text style={[styles.analyticsCount, { color: C.statusInfo }]} allowFontScaling={false}>
                {platformStats?.totalUsers ?? '—'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: C.textMuted }]} allowFontScaling={false}>Total Users</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: C.statusSuccessBg, borderColor: C.isDark ? C.greenBorder : 'rgba(22,163,74,0.15)' }]}>
              <Ionicons name="pulse" size={20} color={C.statusSuccess} />
              <Text style={[styles.analyticsCount, { color: C.statusSuccess }]} allowFontScaling={false}>
                {platformStats?.activeUsers ?? '—'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: C.textMuted }]} allowFontScaling={false}>Active (7d)</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: C.purpleSurface, borderColor: C.isDark ? C.purpleBorder : 'rgba(139,92,246,0.15)' }]}>
              <Ionicons name="create" size={20} color={C.palette.purple} />
              <Text style={[styles.analyticsCount, { color: C.palette.purple }]} allowFontScaling={false}>
                {platformStats?.totalCreators ?? '—'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: C.textMuted }]} allowFontScaling={false}>Creators</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: C.statusWarningBg, borderColor: C.isDark ? C.amberBorder : 'rgba(217,119,6,0.15)' }]}>
              <Ionicons name="briefcase" size={20} color={C.statusWarning} />
              <Text style={[styles.analyticsCount, { color: C.statusWarning }]} allowFontScaling={false}>
                {platformStats?.totalProviders ?? '—'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: C.textMuted }]} allowFontScaling={false}>Providers</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: C.bgPrimaryMid, borderColor: C.isDark ? C.redBorder : 'rgba(198,34,41,0.15)' }]}>
              <Ionicons name="people-circle" size={20} color={C.actionPrimary} />
              <Text style={[styles.analyticsCount, { color: C.actionPrimary }]} allowFontScaling={false}>
                {platformStats?.totalCircles ?? '—'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: C.textMuted }]} allowFontScaling={false}>Circles</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: C.isDark ? 'rgba(156,163,175,0.08)' : 'rgba(107,114,128,0.06)', borderColor: C.borderSubtle }]}>
              <Ionicons name="person-circle" size={20} color={C.textMuted} />
              <Text style={[styles.analyticsCount, { color: C.textSecondary }]} allowFontScaling={false}>
                {platformStats?.totalProfiles ?? '—'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: C.textMuted }]} allowFontScaling={false}>Profiles</Text>
            </View>
          </View>

          {/* ── Hero header ── */}
          <View style={styles.heroBlock}>
            <Text style={[styles.heroTitle, { color: C.textPrimary }]} allowFontScaling={false}>Admin Tools</Text>
            <Text style={[styles.heroSub, { color: C.textMuted }]} allowFontScaling={false}>
              Manage content, users, and platform settings
            </Text>
          </View>

          {/* ── Stats strip ── */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: C.statusWarningBg }]}>
              <Ionicons name="mail-outline" size={16} color={C.statusWarning} />
              <Text style={[styles.statCount, { color: C.statusWarning }]} allowFontScaling={false}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]} allowFontScaling={false}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.statusSuccessBg }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={C.statusSuccess} />
              <Text style={[styles.statCount, { color: C.statusSuccess }]} allowFontScaling={false}>{myRoles?.length ?? 0}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]} allowFontScaling={false}>Roles</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.statusInfoBg }]}>
              <Ionicons name="people-outline" size={16} color={C.statusInfo} />
              <Text style={[styles.statCount, { color: C.statusInfo }]} allowFontScaling={false}>{isAdmin ? '∞' : '—'}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]} allowFontScaling={false}>Access</Text>
            </View>
          </View>
        </MobileCard>

        {/* ═══ SECTION: Moderation ═══ */}
        <MobileCard style={styles.sectionCard}>
          <View style={[styles.sectionLabelRow, { borderBottomColor: C.borderSubtle }]}>
            <View style={[styles.sectionDot, { backgroundColor: C.actionPrimary }]} />
            <Text style={[styles.sectionChipLabel, { color: C.textMuted }]} allowFontScaling={false}>MODERATION</Text>
          </View>
          <View style={styles.actionTilesGrid}>
            <ActionTile icon="mail-outline" label="Queue" onPress={() => setActiveScreen('queue')}
              iconBg={C.statusWarningBg} iconColor={C.statusWarning} C={C} />
            <ActionTile icon="time-outline" label="History" onPress={() => setActiveScreen('history')}
              iconBg={C.isDark ? 'rgba(156,163,175,0.12)' : 'rgba(107,114,128,0.08)'} iconColor={C.textMuted} C={C} />
            {isAdmin && (
              <ActionTile icon="settings-outline" label="Settings" onPress={() => setActiveScreen('settings')}
                iconBg={C.statusInfoBg} iconColor={C.statusInfo} C={C} />
            )}
            {isAdmin && (
              <ActionTile icon="megaphone-outline" label="Ads" onPress={() => setActiveScreen('ads')}
                iconBg={C.statusSuccessBg} iconColor={C.statusSuccess} C={C} />
            )}
          </View>
        </MobileCard>

        {/* ═══ SECTION: User Management (admin only) ═══ */}
        {isAdmin && (
          <MobileCard style={styles.sectionCard}>
            <View style={[styles.sectionLabelRow, { borderBottomColor: C.borderSubtle }]}>
              <View style={[styles.sectionDot, { backgroundColor: C.palette.purple }]} />
              <Text style={[styles.sectionChipLabel, { color: C.textMuted }]} allowFontScaling={false}>USER MANAGEMENT</Text>
            </View>
            <View style={styles.actionTilesGrid}>
              <ActionTile icon="shield-outline" label="Roles" onPress={() => setActiveScreen('roles')}
                iconBg={C.purpleSurface} iconColor={C.palette.purple} C={C} />
              <ActionTile icon="people-outline" label="Users" onPress={() => setActiveScreen('users')}
                iconBg={C.statusInfoBg} iconColor={C.statusInfo} C={C} />
              <ActionTile icon="notifications-outline" label="Notifs" onPress={() => setActiveScreen('notifications')}
                iconBg={C.bgPrimaryMid} iconColor={C.actionPrimary} C={C} />
            </View>
          </MobileCard>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  // Sub-screen card
  subCardContainer: { flex: 1, paddingVertical: 0, paddingTop: 0 },
  subCardOverride: { flex: 1, overflow: 'hidden' },

  // ── Queue banner (matches Provider Dashboard banner) ──
  queueBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.space4, marginTop: spacing.space3,
    borderRadius: radius.radiusMD, borderWidth: 1, overflow: 'hidden',
    paddingRight: spacing.space3, paddingVertical: spacing.space3,
  },
  queueBannerAccent: { width: 4, height: '100%', borderRadius: 2, marginRight: spacing.space3 },
  queueBannerIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.space3 },
  queueBannerText: { flex: 1 },
  queueBannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  queueBannerTitle: { ...typeScale.headingSM, fontSize: 14, fontWeight: '700' },
  queueBannerSub: { ...typeScale.caption, marginTop: 2 },
  queueBannerChevron: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  // ── Hero ──
  heroBlock: { paddingHorizontal: spacing.space4, paddingTop: spacing.space4, paddingBottom: spacing.space2 },
  heroTitle: { ...typeScale.headingLG, fontWeight: '700' },
  heroSub: { ...typeScale.bodySM, marginTop: 4 },

  // ── Bird's eye analytics ──
  analyticsBlock: { paddingHorizontal: spacing.space4, paddingTop: spacing.space4, paddingBottom: spacing.space2 },
  analyticsTitle: { ...typeScale.headingMD, fontWeight: '700' },
  analyticsSub: { ...typeScale.caption, marginTop: 2 },
  analyticsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space2,
    gap: spacing.space2,
  },
  analyticsCard: {
    width: '31%', alignItems: 'center', gap: 4,
    borderRadius: radius.radiusMD, borderWidth: 1,
    paddingVertical: spacing.space3, paddingHorizontal: spacing.space2,
  },
  analyticsCount: { ...typeScale.headingLG, fontWeight: '800', fontSize: 22 },
  analyticsLabel: { ...typeScale.caption, textAlign: 'center', fontSize: 10 },

  // ── Stats strip ──
  statsRow: {
    flexDirection: 'row', gap: spacing.space2,
    paddingHorizontal: spacing.space4, paddingVertical: spacing.space3,
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: radius.radiusMD, paddingVertical: spacing.space3,
  },
  statCount: { ...typeScale.headingMD, fontWeight: '800' },
  statLabel: { ...typeScale.caption },

  // ── Section cards ──
  sectionCard: { marginTop: 0 },
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space2,
    paddingHorizontal: spacing.space4, paddingVertical: spacing.space3,
    borderBottomWidth: 1,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionChipLabel: { ...typeScale.caption, fontWeight: '700', letterSpacing: 0.8 },

  // ── Action tiles grid (matches booking pattern) ──
  actionTilesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space3,
    gap: spacing.space2,
  },
  actionTile: {
    width: '22%', alignItems: 'center', gap: 6, paddingVertical: spacing.space2,
  },
  actionTileIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  actionTileLabel: { ...typeScale.caption, fontWeight: '600', textAlign: 'center' },

  // ── Role badge ──
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.radiusFull, borderWidth: 1, maxWidth: 100,
  },
  roleBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // ── Access denied ──
  centeredInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.screenPaddingH },
  deniedCard: { borderRadius: radius.radiusLG, borderWidth: 1, padding: spacing.space8, alignItems: 'center', width: '100%', maxWidth: 360 },
  deniedIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  deniedTitle: { ...typeScale.headingLG, marginTop: spacing.space4, textAlign: 'center' },
  deniedSubtitle: { ...typeScale.bodyMD, marginTop: spacing.space2, textAlign: 'center' },
  deniedBackBtn: { marginTop: spacing.space6, borderRadius: radius.radiusFull, paddingHorizontal: spacing.space6, paddingVertical: spacing.space3 },
  deniedBackBtnText: { ...typeScale.labelMD, color: '#FFFFFF', fontWeight: '700' },
});
