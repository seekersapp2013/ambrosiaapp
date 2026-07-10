/**
 * ModerationSettingsPanel — React Native
 * Phase 5 + Light/Dark mode overhaul
 * Switch rows for each content type approval requirement.
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
  C: ReturnType<typeof useColors>;
}

function SettingRow({ label, description, value, onChange, C }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, { color: C.textPrimary }]}>{label}</Text>
        <Text style={[styles.settingDescription, { color: C.textMuted }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.isDark ? C.bgElevated : C.bgInput, true: C.actionPrimary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

export function ModerationSettingsPanel() {
  const C = useColors();
  const settings = useQuery(api.moderationSettings.getModerationSettings);
  const updateSettings = useMutation(api.moderationSettings.updateModerationSettings);

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateSettings({ [field]: value });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update settings');
    }
  };

  if (settings === undefined) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={C.actionPrimary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Moderation Settings</Text>

      <View style={[styles.card, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
        <SettingRow
          label="Articles Require Approval"
          description="New articles must be approved before being published"
          value={settings.articlesRequireApproval}
          onChange={val => handleToggle('articlesRequireApproval', val)}
          C={C}
        />
        <View style={[styles.divider, { backgroundColor: C.borderSubtle }]} />
        <SettingRow
          label="Reels Require Approval"
          description="New reels must be approved before being published"
          value={settings.reelsRequireApproval}
          onChange={val => handleToggle('reelsRequireApproval', val)}
          C={C}
        />
        <View style={[styles.divider, { backgroundColor: C.borderSubtle }]} />
        <SettingRow
          label="Circles Require Approval"
          description="New circles must be approved before being created"
          value={settings.circlesRequireApproval}
          onChange={val => handleToggle('circlesRequireApproval', val)}
          C={C}
        />
        <View style={[styles.divider, { backgroundColor: C.borderSubtle }]} />
        <SettingRow
          label="Expert Requests Require Approval"
          description="New expert requests must be approved before being posted"
          value={settings.expertRequestsRequireApproval}
          onChange={val => handleToggle('expertRequestsRequireApproval', val)}
          C={C}
        />
        <View style={[styles.divider, { backgroundColor: C.borderSubtle }]} />
        <SettingRow
          label="Booking Subscribers Require Approval"
          description="Users must be approved before becoming booking providers"
          value={settings.bookingSubscribersRequireApproval}
          onChange={val => handleToggle('bookingSubscribersRequireApproval', val)}
          C={C}
        />
      </View>

      {/* Info note */}
      <View style={[styles.infoRow, { backgroundColor: C.statusInfoBg, borderColor: C.isDark ? C.blueBorder : 'rgba(37,99,235,0.2)' }]}>
        <Ionicons name="information-circle-outline" size={16} color={C.statusInfo} />
        <Text style={[styles.infoText, { color: C.textMuted }]}>
          Changes take effect immediately. Content created while approval is disabled will not
          require approval.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.screenPaddingH, paddingBottom: spacing.scrollBottomPadding },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typeScale.headingLG, marginBottom: spacing.space4 },

  card: {
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
    gap: spacing.space3,
  },
  settingText: { flex: 1 },
  settingLabel: { ...typeScale.headingSM, fontSize: 14, marginBottom: 4 },
  settingDescription: { ...typeScale.bodySM },
  divider: { height: 1, marginHorizontal: spacing.space4 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
    marginTop: spacing.space4,
    padding: spacing.space3,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
  },
  infoText: { ...typeScale.bodySM, flex: 1 },
});
