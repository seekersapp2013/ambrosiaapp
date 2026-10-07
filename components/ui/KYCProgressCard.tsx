import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import { useRouter } from 'expo-router';

interface KYCProgressCardProps {
  profileData?: {
    name?: string | null;
    avatar?: string | null;
    phoneNumber?: string | null;
    interests?: string[] | null;
    pinHash?: string | null;
    primaryCurrency?: string | null;
  } | null;
  isProvider?: boolean;
  onCompleteKYC?: () => void;
}

export function KYCProgressCard({ profileData, isProvider, onCompleteKYC }: KYCProgressCardProps) {
  const router = useRouter();

  if (!isProvider) return null;

  // Calculate KYC completion percentage based on core fields
  const totalFields = isProvider ? 8 : 5;
  let filledFields = 0;

  if (profileData?.name) filledFields += 1;
  if (profileData?.avatar) filledFields += 1;
  if (profileData?.phoneNumber) filledFields += 1;
  if (profileData?.interests && profileData.interests.length > 0) filledFields += 1;
  if (profileData?.pinHash) filledFields += 1;
  if (isProvider) {
    // Provider specific completion points
    filledFields += 3; // Provider subscription existing counts as completed professional info & schedule
  }

  const completionPct = Math.min(Math.round((filledFields / totalFields) * 100), 100);

  // Tier determination
  let tierName = 'Tier 1 - Basic';
  let tierColor = Colors.statusInfo;
  if (completionPct >= 100 && isProvider) {
    tierName = 'Sapphire Provider';
    tierColor = Colors.actionPrimary;
  } else if (completionPct >= 80) {
    tierName = 'Tier 2 - Verified';
    tierColor = Colors.statusSuccess;
  } else if (completionPct >= 50) {
    tierName = 'Tier 1 - Intermediate';
    tierColor = Colors.statusWarning;
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="shield-checkmark-outline" size={20} color={tierColor} />
          <Text style={styles.title} allowFontScaling={false}>KYC Progress & Tier Status</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: tierColor + '20', borderColor: tierColor }]}>
          <Text style={[styles.tierText, { color: tierColor }]} allowFontScaling={false}>{tierName}</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel} allowFontScaling={false}>Completion Status</Text>
          <Text style={styles.progressPct} allowFontScaling={false}>{completionPct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: tierColor }]} />
        </View>
      </View>

      {/* Benefits Explanation Banner */}
      <View style={styles.noticeBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} style={{ marginTop: 2 }} />
        <Text style={styles.noticeText} allowFontScaling={false}>
          Completing your KYC details increases your Tier status, unlocks higher withdrawal limits, and enhances your profile visibility.
        </Text>
      </View>

      {completionPct < 100 && (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => {
            if (onCompleteKYC) {
              onCompleteKYC();
            } else if (!isProvider) {
              router.push('/(tabs)/booking/provider-signup' as any);
            } else {
              router.push('/(tabs)/booking/provider-signup' as any);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaBtnText} allowFontScaling={false}>Complete Remaining KYC</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.actionPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginHorizontal: spacing.screenPaddingH,
    marginBottom: spacing.space5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    marginBottom: spacing.space3,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
  },
  title: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.radiusFull,
    borderWidth: 1,
  },
  tierText: {
    ...typeScale.caption,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: spacing.space3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  progressPct: {
    ...typeScale.labelSM,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusFull,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.radiusFull,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusSM,
    padding: spacing.space3,
    marginBottom: spacing.space3,
  },
  noticeText: {
    ...typeScale.caption,
    color: Colors.statusInfo,
    flex: 1,
    lineHeight: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space2,
  },
  ctaBtnText: {
    ...typeScale.bodySM,
    color: Colors.actionPrimary,
    fontWeight: '600',
  },
});
