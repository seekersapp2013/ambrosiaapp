/**
 * ModerationSettingsPanel — React Native
 * Phase 5: Switch rows for each content type approval requirement.
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
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

function SettingRow({ label, description, value, onChange }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.bgElevated, true: Colors.actionPrimary }}
        thumbColor={Colors.textPrimary}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

export function ModerationSettingsPanel() {
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
        <ActivityIndicator color={Colors.actionPrimary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Moderation Settings</Text>

      <View style={styles.card}>
        <SettingRow
          label="Articles Require Approval"
          description="New articles must be approved before being published"
          value={settings.articlesRequireApproval}
          onChange={val => handleToggle('articlesRequireApproval', val)}
        />
        <View style={styles.divider} />
        <SettingRow
          label="Reels Require Approval"
          description="New reels must be approved before being published"
          value={settings.reelsRequireApproval}
          onChange={val => handleToggle('reelsRequireApproval', val)}
        />
        <View style={styles.divider} />
        <SettingRow
          label="Circles Require Approval"
          description="New circles must be approved before being created"
          value={settings.circlesRequireApproval}
          onChange={val => handleToggle('circlesRequireApproval', val)}
        />
        <View style={styles.divider} />
        <SettingRow
          label="Expert Requests Require Approval"
          description="New expert requests must be approved before being posted"
          value={settings.expertRequestsRequireApproval}
          onChange={val => handleToggle('expertRequestsRequireApproval', val)}
        />
        <View style={styles.divider} />
        <SettingRow
          label="Booking Subscribers Require Approval"
          description="Users must be approved before becoming booking providers"
          value={settings.bookingSubscribersRequireApproval}
          onChange={val => handleToggle('bookingSubscribersRequireApproval', val)}
        />
      </View>

      {/* Info note */}
      <View style={styles.infoRow}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
        <Text style={styles.infoText}>
          Changes take effect immediately. Content created while approval is disabled will not
          require approval.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPaddingH,
    paddingBottom: spacing.scrollBottomPadding,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    marginBottom: spacing.space4,
  },
  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
    gap: spacing.space3,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: spacing.space4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
    marginTop: spacing.space4,
    padding: spacing.space3,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  infoText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    flex: 1,
  },
});
