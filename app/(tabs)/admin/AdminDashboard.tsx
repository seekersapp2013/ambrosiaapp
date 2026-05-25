/**
 * AdminDashboard — React Native
 * Phase 2: Navigation shell with tab bar, role badge, access guard.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useIsModerator, useIsAdmin } from '@/app/hooks/usePermissions';
import { AppBackground } from '@/components/AppBackground';
import { AppLoader } from '@/components/AppLoader';
import { MobileCard } from '@/components/MobileCard';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

import { ModerationQueue } from './ModerationQueue';
import { ModerationHistory } from './ModerationHistory';
import { ModerationSettingsPanel } from './ModerationSettingsPanel';
import { RoleManagement } from './RoleManagement';
import { UserRoleAssignment } from './UserRoleAssignment';
import { AdManagementPanel } from './AdManagementPanel';

type TabType = 'queue' | 'roles' | 'settings' | 'users' | 'history' | 'ads';

interface TabConfig {
  id: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  adminOnly: boolean;
}

const TABS: TabConfig[] = [
  { id: 'queue',    label: 'Queue',    icon: 'mail-outline',       adminOnly: false },
  { id: 'roles',    label: 'Roles',    icon: 'shield-outline',     adminOnly: true  },
  { id: 'settings', label: 'Settings', icon: 'settings-outline',   adminOnly: true  },
  { id: 'users',    label: 'Users',    icon: 'people-outline',     adminOnly: true  },
  { id: 'ads',      label: 'Ads',      icon: 'megaphone-outline',  adminOnly: true  },
  { id: 'history',  label: 'History',  icon: 'time-outline',       adminOnly: false },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('queue');

  const isModerator = useIsModerator();
  const isAdmin = useIsAdmin();
  const myRoles = useQuery(api.moderation.getMyRoles);

  // Still loading
  if (isModerator === undefined) {
    return <AppLoader />;
  }

  // Access denied
  if (!isModerator) {
    return (
      <AppBackground style={styles.centeredContainer}>
        <SafeAreaView style={styles.centeredInner}>
          <View style={styles.deniedCard}>
            <Ionicons name="lock-closed-outline" size={56} color={Colors.iconSecondary} />
            <Text style={styles.deniedTitle}>Access Denied</Text>
            <Text style={styles.deniedSubtitle}>
              You don't have permission to access the admin dashboard.
            </Text>
            <TouchableOpacity
              style={styles.deniedBackBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || isAdmin);

  // Ensure activeTab is still visible after admin check resolves
  const resolvedTab =
    visibleTabs.find(t => t.id === activeTab) ? activeTab : 'queue';

  const roleNames =
    myRoles && myRoles.length > 0
      ? myRoles.map((r: any) => r.name).join(', ')
      : null;

  return (
    <AppBackground style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <MobileCard style={styles.cardOverride} containerStyle={styles.cardContainer}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={20} color={Colors.iconPrimary} />
              <Text style={styles.backBtnLabel}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              {roleNames ? (
                <Text style={styles.headerRole}>{roleNames}</Text>
              ) : null}
            </View>
            <View style={styles.headerRight} />
          </View>

          {/* ── Tab Bar ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
            alwaysBounceHorizontal={false}
          >
            {visibleTabs.map(tab => {
              const active = resolvedTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? Colors.textPrimary : Colors.textMuted}
                  />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Content ── */}
          <View style={styles.content}>
            {resolvedTab === 'queue'    && <ModerationQueue />}
            {resolvedTab === 'history'  && <ModerationHistory />}
            {resolvedTab === 'settings' && isAdmin && <ModerationSettingsPanel />}
            {resolvedTab === 'roles'    && isAdmin && <RoleManagement />}
            {resolvedTab === 'users'    && isAdmin && <UserRoleAssignment />}
            {resolvedTab === 'ads'      && isAdmin && <AdManagementPanel />}
          </View>
        </MobileCard>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
  },
  centeredInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPaddingH,
  },
  deniedCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  deniedTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    marginTop: spacing.space4,
    textAlign: 'center',
  },
  deniedSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    marginTop: spacing.space2,
    textAlign: 'center',
  },
  deniedBackBtn: {
    marginTop: spacing.space6,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space6,
    paddingVertical: spacing.space3,
  },
  backBtnText: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
  },
  backBtnLabel: {
    ...typeScale.labelSM,
    color: Colors.iconPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerRole: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 70,
  },
  cardContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  cardOverride: {
    flex: 1,
    overflow: 'hidden',
  },

  // Tab bar
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    flexGrow: 0,
    flexShrink: 0,
    height: 48,
  },
  tabBarContent: {
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
    alignItems: 'center',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.space3,
    paddingVertical: 6,
    borderRadius: radius.radiusMD,
    backgroundColor: Colors.bgElevated,
    height: 32,
  },
  tabBtnActive: {
    backgroundColor: Colors.actionPrimary,
  },
  tabLabel: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
  },

  // Content area
  content: {
    flex: 1,
  },
});
