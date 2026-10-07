import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { DynamicKYCForm } from '@/components/ui/DynamicKYCForm';
import { useKYCConfig } from '@/hooks/useKYCConfig';
import { Ionicons } from '@expo/vector-icons';

export default function ProviderSignupScreen() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);

  const myProfile = useQuery(api.profiles.getMyProfile);
  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription);
  const myTierData = useQuery(
    api.tierCalculation.getProviderTierInfo,
    myProfile?.userId ? { userId: myProfile.userId } : 'skip'
  );
  const myQuals = useQuery(api.qualifications.getMyQualifications);
  const avatarUrl = useQuery(
    api.files.getFileUrl,
    myProfile?.avatar ? { storageId: myProfile.avatar } : 'skip'
  );

  const { config, loading: loadingConfig } = useKYCConfig('provider');
  const createSubscriber = useMutation(api.bookingSubscribers.createSubscriber);
  const updateSubscriber = useMutation(api.bookingSubscribers.updateSubscriber);

  const isEditing = !!mySubscription;
  const displayName = myProfile?.name ?? myProfile?.username ?? 'You';

  const handleFormSubmit = async (formData: Record<string, any>) => {
    const p1 = parseFloat(formData.oneOnOnePrice) || 100;
    const p2 = formData.groupSessionPrice ? parseFloat(formData.groupSessionPrice) : Math.round(p1 * 0.7);

    const args = {
      jobTitle: String(formData.jobTitle || '').trim(),
      specialization: String(formData.specialization || '').trim(),
      oneOnOnePrice: p1,
      groupSessionPrice: p2,
      sessionPrice: p1,
      sessionCurrency: formData.sessionCurrency || 'USD',
      aboutUser: String(formData.aboutUser || '').trim(),
      offerDescription: String(formData.offerDescription || '').trim(),
      xLink: formData.xLink ? String(formData.xLink).trim() : undefined,
      linkedInLink: formData.linkedInLink ? String(formData.linkedInLink).trim() : undefined,
      openHours: formData.openHours,
      // Dynamic tier & credential fields:
      yearsOfExperience: formData.yearsOfExperience !== undefined && formData.yearsOfExperience !== ''
        ? parseInt(String(formData.yearsOfExperience), 10)
        : undefined,
      licenseNumber: formData.licenseNumber ? String(formData.licenseNumber).trim() : undefined,
      registrationCouncil: formData.registrationCouncil ? String(formData.registrationCouncil).trim() : undefined,
      highestQualification: formData.highestQualification || undefined,
      qualificationTitle: formData.qualificationTitle ? String(formData.qualificationTitle).trim() : undefined,
      institution: formData.institution ? String(formData.institution).trim() : undefined,
      yearObtained: formData.graduationYear !== undefined && formData.graduationYear !== ''
        ? parseInt(String(formData.graduationYear), 10)
        : undefined,
      geographicRecognition: formData.geographicRecognition || undefined,
      kycExtras: formData,
    };

    if (isEditing) {
      await updateSubscriber(args);
      setIsPendingReview(mySubscription?.approvalStatus === "PENDING" || !mySubscription?.isActive);
    } else {
      const res = await createSubscriber(args);
      setIsPendingReview(!!res?.requiresApproval);
    }

    setShowSuccess(true);
  };

  if (myProfile === undefined || mySubscription === undefined || loadingConfig || !config) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.actionPrimary} size="large" />
      </View>
    );
  }

  if (showSuccess) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Provider Profile" onBack={() => router.back()} />
        <View style={styles.successContent}>
          <View style={styles.successBadge}>
            <Ionicons
              name={isPendingReview ? "time-outline" : "checkmark-circle"}
              size={64}
              color={isPendingReview ? Colors.statusWarning : Colors.statusSuccess}
            />
          </View>
          <Text style={styles.successTitle} allowFontScaling={false}>
            {isEditing
              ? 'Profile Updated!'
              : isPendingReview
              ? 'Application Submitted!'
              : "You're now a Provider!"}
          </Text>
          <Text style={styles.successSubtitle} allowFontScaling={false}>
            {isEditing
              ? 'Your booking profile changes have been saved successfully.'
              : isPendingReview
              ? 'Your provider application has been submitted and is currently under review by an administrator.'
              : 'Your booking subscription is active. Clients can now discover your services and book 1-on-1 sessions with you.'}
          </Text>

          <View style={styles.checklistCard}>
            <Text style={styles.checklistTitle} allowFontScaling={false}>What's Next?</Text>
            <View style={styles.checkItem}>
              <Ionicons name="calendar-outline" size={18} color={Colors.actionPrimary} />
              <Text style={styles.checkText} allowFontScaling={false}>Configure instant vs manual booking confirmation</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="time-outline" size={18} color={Colors.actionPrimary} />
              <Text style={styles.checkText} allowFontScaling={false}>Add buffer times between sessions</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="card-outline" size={18} color={Colors.actionPrimary} />
              <Text style={styles.checkText} allowFontScaling={false}>Connect your bank account to receive payouts</Text>
            </View>
          </View>

          <View style={styles.btnStack}>
            <PrimaryButton
              label="Go to Booking Dashboard"
              onPress={() => router.push('/(tabs)/booking')}
              icon={<Ionicons name="calendar" size={18} color="#FFFFFF" />}
            />
            <SecondaryButton
              label="Provider Settings"
              onPress={() => router.push('/(tabs)/booking/settings')}
              icon={<Ionicons name="settings-outline" size={18} color={Colors.textPrimary} />}
              style={{ marginTop: spacing.space3 }}
            />
          </View>
        </View>
      </View>
    );
  }

  const isPending = !!mySubscription && (mySubscription.approvalStatus === 'PENDING' || !mySubscription.isActive);

  // Pre-fill initial values if editing an existing subscription
  const initialValues = isEditing
    ? {
        jobTitle: mySubscription.jobTitle,
        specialization: mySubscription.specialization,
        sessionCurrency: (mySubscription as any).sessionCurrency || 'USD',
        oneOnOnePrice: String(mySubscription.oneOnOnePrice ?? mySubscription.sessionPrice ?? ''),
        groupSessionPrice: String(mySubscription.groupSessionPrice ?? ''),
        aboutUser: mySubscription.aboutUser,
        offerDescription: mySubscription.offerDescription,
        xLink: mySubscription.xLink || '',
        linkedInLink: mySubscription.linkedInLink || '',
        openHours: mySubscription.openHours,
        // Pre-fill tiering and credential fields
        yearsOfExperience: myTierData?.yearsOfExperience !== undefined ? String(myTierData.yearsOfExperience) : '',
        licenseNumber: myTierData?.licenseNumber || '',
        registrationCouncil: myTierData?.registrationCouncil || '',
        geographicRecognition: myTierData?.geographicRecognition || '',
        highestQualification: myQuals?.[0]?.category || '',
        qualificationTitle: myQuals?.[0]?.name || '',
        institution: myQuals?.[0]?.institution || '',
        graduationYear: myQuals?.[0]?.yearObtained ? String(myQuals[0].yearObtained) : '',
        ...(mySubscription?.kycExtras || {}),
      }
    : {};

  const headerPreview = (
    <View style={styles.profilePreview}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial} allowFontScaling={false}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.profileText}>
        <Text style={styles.profileName} allowFontScaling={false}>{displayName}</Text>
        <View style={[styles.statusPill, isPending ? styles.statusPillNew : isEditing ? styles.statusPillActive : styles.statusPillNew]}>
          <Ionicons
            name={isPending ? 'time' : isEditing ? 'star' : 'add-circle-outline'}
            size={12}
            color={isPending ? Colors.statusWarning : isEditing ? Colors.actionPrimary : Colors.statusInfo}
          />
          <Text
            style={[styles.statusPillText, isPending ? { color: Colors.statusWarning } : isEditing ? styles.statusPillTextActive : styles.statusPillTextNew]}
            allowFontScaling={false}
          >
            {isPending ? 'Approval Pending (Under Review)' : isEditing ? 'Updating Profile' : 'Becoming a Provider'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isPending ? 'Provider Application' : isEditing ? 'Edit Provider Profile' : 'Become a Provider'}
        onBack={() => router.back()}
      />
      <DynamicKYCForm
        config={config}
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        onCancel={() => router.back()}
        headerPreview={headerPreview}
        submitButtonLabel={isPending ? 'Update Application Details' : isEditing ? 'Save Changes' : 'Complete Profile'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgBase },
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: spacing.space4,
    marginTop: spacing.space2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.borderFilled, flexShrink: 0 },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: { ...typeScale.headingMD, color: Colors.actionPrimary, fontWeight: '700' },
  profileText: { flex: 1, gap: 4 },
  profileName: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.radiusFull,
    borderWidth: 1,
  },
  statusPillActive: { backgroundColor: Colors.bgPrimarySubtle, borderColor: Colors.borderFilled },
  statusPillNew: { backgroundColor: Colors.statusInfoBg, borderColor: Colors.borderSubtle },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  statusPillTextActive: { color: Colors.actionPrimary },
  statusPillTextNew: { color: Colors.statusInfo },
  successContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.space8,
  },
  successBadge: { marginBottom: spacing.space4 },
  successTitle: { ...typeScale.headingXL, color: Colors.textPrimary, fontWeight: '700', textAlign: 'center', marginBottom: spacing.space2 },
  successSubtitle: { ...typeScale.bodyMD, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.space6 },
  checklistCard: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space8,
    gap: spacing.space3,
  },
  checklistTitle: { ...typeScale.labelSM, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  checkText: { ...typeScale.bodySM, color: Colors.textPrimary, flex: 1 },
  btnStack: { width: '100%' },
});
