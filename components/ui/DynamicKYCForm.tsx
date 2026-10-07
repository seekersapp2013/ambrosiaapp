import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import { AppInput, PasswordInput, TextareaInput } from '@/components/ui/Input';
import { PrimaryButton, SecondaryButton, GhostButton } from '@/components/ui/Button';
import { AppSwitch } from '@/components/ui/Toggle';
import { WizardProgressBar } from '@/components/ui/ScreenHeader';
import { SelectField } from '@/components/ui/SelectField';
import { WeeklyScheduleField, DEFAULT_HOURS, OpenHours } from '@/components/ui/WeeklyScheduleField';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { KYCConfig, KYCStepConfig, KYCFieldConfig } from '@/hooks/useKYCConfig';
import { CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS } from '@/utils/currency';

interface DynamicKYCFormProps {
  config: KYCConfig;
  initialValues?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => Promise<void> | void;
  onCancel: () => void;
  headerPreview?: React.ReactNode;
  submitButtonLabel?: string;
}

export function DynamicKYCForm({
  config,
  initialValues = {},
  onSubmit,
  onCancel,
  headerPreview,
  submitButtonLabel,
}: DynamicKYCFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    ...initialValues,
    openHours: initialValues.openHours || DEFAULT_HOURS,
    interests: initialValues.interests || [],
    primaryCurrency: initialValues.primaryCurrency || 'USD',
    sessionCurrency: initialValues.sessionCurrency || 'USD',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [activeCurrencyField, setActiveCurrencyField] = useState<string>('primaryCurrency');
  const scrollRef = useRef<ScrollView>(null);

  const steps = config.steps || [];
  const totalSteps = steps.length;
  const currentStep: KYCStepConfig | undefined = steps[currentStepIndex];

  const updateField = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (prev[fieldId]) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return prev;
    });
  }, []);

  const toggleInterest = useCallback((interest: string) => {
    setFormData((prev) => {
      const currentList: string[] = prev.interests || [];
      const exists = currentList.includes(interest);
      const nextList = exists
        ? currentList.filter((i) => i !== interest)
        : [...currentList, interest];
      return { ...prev, interests: nextList };
    });
  }, []);

  const rawUsername = typeof formData.username === 'string' ? formData.username : '';
  const usernameVal = rawUsername.trim();
  const [usernameToQuery, setUsernameToQuery] = useState<string>('');

  const usernameCheck = useQuery(
    api.profiles.checkUsernameAvailability,
    usernameToQuery.length >= 3 ? { username: usernameToQuery } : 'skip'
  );

  // Check username availability when usernameToQuery changes (triggered onBlur)
  useEffect(() => {
    if (!usernameVal) {
      setErrors((prev) => {
        if (!prev.username) return prev;
        const next = { ...prev };
        delete next.username;
        return next;
      });
      return;
    }

    if (usernameVal.length < 3) {
      setErrors((prev) => ({
        ...prev,
        username: "Username must be at least 3 characters",
      }));
      return;
    }

    if (!/^[a-z0-9_]+$/.test(usernameVal.toLowerCase())) {
      setErrors((prev) => ({
        ...prev,
        username: "Username can only contain lowercase letters, numbers, and underscores",
      }));
      return;
    }

    if (usernameToQuery && usernameCheck && usernameCheck.available === false) {
      setErrors((prev) => ({
        ...prev,
        username: `Username '@${usernameToQuery}' already exists.`,
      }));
    } else if (usernameToQuery && usernameCheck && usernameCheck.available === true) {
      setErrors((prev) => {
        if (!prev.username) return prev;
        const next = { ...prev };
        delete next.username;
        return next;
      });
    }
  }, [usernameVal, usernameToQuery, usernameCheck]);

  const validateStep = (stepConfig: KYCStepConfig): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of stepConfig.fields) {
      const val = formData[field.id];
      const strVal = typeof val === 'string' ? val.trim() : val;

      if (field.required && (strVal === undefined || strVal === null || strVal === '')) {
        newErrors[field.id] = field.validation?.message || `${field.label} is required`;
        continue;
      }

      if (field.validation && strVal !== undefined && strVal !== null && strVal !== '') {
        const rules = field.validation;
        if (rules.minLength && typeof strVal === 'string' && strVal.length < rules.minLength) {
          newErrors[field.id] = rules.message || `${field.label} must be at least ${rules.minLength} characters`;
        } else if (rules.pattern && typeof strVal === 'string' && !new RegExp(rules.pattern).test(strVal)) {
          newErrors[field.id] = rules.message || `Invalid format for ${field.label}`;
        } else if (rules.match && formData[rules.match] !== val) {
          newErrors[field.id] = rules.message || `Fields do not match`;
        } else if (rules.minNumber && (isNaN(Number(val)) || Number(val) < rules.minNumber)) {
          newErrors[field.id] = rules.message || `Must be at least ${rules.minNumber}`;
        }
      }

      if (field.id === 'username' || field.availabilityCheck) {
        if (usernameVal && usernameCheck && usernameCheck.available === false) {
          newErrors[field.id] = `Username '@${usernameVal}' already exists.`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!currentStep) return;

    if (usernameVal && usernameVal.length >= 3 && usernameVal !== usernameToQuery) {
      setUsernameToQuery(usernameVal);
    }

    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Final step submit
      setSubmitting(true);
      setSubmitError('');
      try {
        await onSubmit(formData);
      } catch (err: any) {
        setSubmitError(err?.message ?? 'An error occurred during submission.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleSkip = () => {
    if (!currentStep || !currentStep.skippable) return;

    // Omit / clear fields belonging to this skippable step
    setFormData((prev) => {
      const next = { ...prev };
      for (const field of currentStep.fields) {
        delete next[field.id];
      }
      return next;
    });

    setErrors({});

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Final step skipped — submit remaining data
      handleContinue();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      onCancel();
    }
  };

  if (!currentStep) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.actionPrimary} size="large" />
      </View>
    );
  }

  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header & Wizard Progress Bar */}
      <View style={styles.wizardHeader}>
        <Text style={styles.stepChip} allowFontScaling={false}>
          Step {currentStepIndex + 1} of {totalSteps} - {currentStep.title}
        </Text>
        <WizardProgressBar step={currentStepIndex + 1} total={totalSteps} style={styles.progressOverride} />
      </View>

      {/* Optional Top Preview Component */}
      {currentStepIndex === 0 && headerPreview}

      {/* Step Heading */}
      <Text style={styles.stepTitle} allowFontScaling={false}>{currentStep.title}</Text>
      <Text style={styles.stepSubtitle} allowFontScaling={false}>{currentStep.subtitle}</Text>

      {/* Dynamic Field Renderer */}
      <View style={styles.fieldsWrap}>
        {currentStep.fields.map((field: KYCFieldConfig) => {
          const val = formData[field.id] ?? '';
          const err = errors[field.id];

          if (field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number' || field.type === 'decimal' || field.type === 'url') {
            const isUsernameField = field.id === 'username' || !!field.availabilityCheck;
            const isChecking = isUsernameField && usernameVal.length >= 3 && usernameCheck === undefined;

            return (
              <AppInput
                key={field.id}
                label={field.label}
                placeholder={field.placeholder}
                value={String(val)}
                onChangeText={(text) => updateField(field.id, text)}
                error={err}
                trailingIcon={
                  isChecking ? (
                    <ActivityIndicator size="small" color={Colors.actionPrimary} />
                  ) : undefined
                }
                keyboardType={
                  field.type === 'email' ? 'email-address' :
                  field.type === 'phone' ? 'number-pad' :
                  field.type === 'decimal' ? 'decimal-pad' :
                  field.type === 'number' ? 'number-pad' :
                  field.type === 'url' ? 'url' : 'default'
                }
                autoCapitalize={field.type === 'email' || field.type === 'url' || isUsernameField ? 'none' : 'sentences'}
                maxLength={field.maxLength}
                onBlur={() => {
                  if (isUsernameField && usernameVal.length >= 3 && usernameVal !== usernameToQuery) {
                    setUsernameToQuery(usernameVal);
                  }
                }}
                accessibilityLabel={field.label}
              />
            );
          }

          if (field.type === 'password' || field.type === 'pin') {
            return (
              <PasswordInput
                key={field.id}
                label={field.label}
                placeholder={field.placeholder}
                value={String(val)}
                onChangeText={(text) => updateField(field.id, text)}
                error={err}
                maxLength={field.type === 'pin' ? 4 : field.maxLength}
                keyboardType={field.type === 'pin' ? 'number-pad' : 'default'}
                accessibilityLabel={field.label}
              />
            );
          }

          if (field.type === 'textarea') {
            return (
              <TextareaInput
                key={field.id}
                label={field.label}
                placeholder={field.placeholder}
                value={String(val)}
                onChangeText={(text) => updateField(field.id, text)}
                error={err}
                maxLength={field.maxLength || 500}
                accessibilityLabel={field.label}
              />
            );
          }

          if (field.type === 'toggle') {
            return (
              <View key={field.id} style={styles.toggleRow}>
                <Text style={styles.toggleLabel} allowFontScaling={false}>{field.label}</Text>
                <AppSwitch
                  value={Boolean(val)}
                  onValueChange={(v) => updateField(field.id, v)}
                  accessibilityLabel={field.label}
                />
              </View>
            );
          }

          if (field.type === 'select') {
            return (
              <SelectField
                key={field.id}
                label={field.label}
                value={String(val)}
                options={field.options || []}
                onSelect={(v) => updateField(field.id, v)}
                error={err}
                placeholder={field.placeholder}
              />
            );
          }

          if (field.type === 'currency-select') {
            const currentCurrency = (formData[field.id] as Currency) || 'USD';
            return (
              <View key={field.id} style={styles.currencyWrap}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>{field.label}</Text>
                <TouchableOpacity
                  style={styles.currencyBtn}
                  onPress={() => {
                    setActiveCurrencyField(field.id);
                    setCurrencyPickerOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cash-outline" size={18} color={Colors.iconSecondary} />
                  <Text style={styles.currencyBtnText} allowFontScaling={false}>
                    {CURRENCY_SYMBOLS[currentCurrency]} {currentCurrency} - {CURRENCY_LABELS[currentCurrency]}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.iconSecondary} />
                </TouchableOpacity>
              </View>
            );
          }

          if (field.type === 'multi-select') {
            const selectedList: string[] = formData[field.id] || [];
            const options = field.options || [];
            return (
              <View key={field.id} style={styles.multiSelectWrap}>
                <Text style={styles.fieldLabel} allowFontScaling={false}>{field.label}</Text>
                <View style={styles.optionsGrid}>
                  {options.map((opt) => {
                    const selected = selectedList.includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.topicChip, selected && styles.topicChipSelected]}
                        onPress={() => toggleInterest(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.topicChipText, selected && styles.topicChipTextSelected]} allowFontScaling={false}>
                          {opt.label}
                        </Text>
                        {selected && <Ionicons name="checkmark-circle" size={16} color={Colors.actionPrimary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {!!err && <Text style={styles.errorText} allowFontScaling={false}>{err}</Text>}
              </View>
            );
          }

          if (field.type === 'schedule') {
            return (
              <WeeklyScheduleField
                key={field.id}
                value={formData[field.id] || DEFAULT_HOURS}
                onChange={(hours) => updateField(field.id, hours)}
                error={err}
              />
            );
          }

          return null;
        })}
      </View>

      {/* Submit / General Error */}
      {!!submitError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger} />
          <Text style={styles.errorBoxText} allowFontScaling={false}>{submitError}</Text>
        </View>
      )}

      {/* Navigation Buttons Row */}
      <View style={styles.navRow}>
        <SecondaryButton
          label="Back"
          onPress={handleBack}
          style={styles.navBtn}
          icon={<Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />}
          accessibilityLabel="Go back"
        />

        {currentStep.skippable && (
          <GhostButton
            label="Skip"
            onPress={handleSkip}
            style={styles.navBtn}
            accessibilityLabel="Skip step"
          />
        )}

        <PrimaryButton
          label={isLastStep ? (submitButtonLabel || 'Complete') : 'Continue'}
          onPress={handleContinue}
          loading={submitting}
          style={styles.navBtn}
          icon={<Ionicons name={isLastStep ? 'checkmark-circle-outline' : 'arrow-forward'} size={18} color="#FFFFFF" />}
          accessibilityLabel={isLastStep ? 'Submit form' : 'Continue to next step'}
        />
      </View>

      {/* Currency Modal Picker */}
      <Modal
        visible={currencyPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCurrencyPickerOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} allowFontScaling={false}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyPickerOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.iconPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES as unknown as Currency[]}
              keyExtractor={(c) => c}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.space6 }}
              renderItem={({ item }) => {
                const active = formData[activeCurrencyField] === item;
                return (
                  <TouchableOpacity
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => {
                      updateField(activeCurrencyField, item);
                      setCurrencyPickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]} allowFontScaling={false}>
                      {CURRENCY_SYMBOLS[item]} {item}
                    </Text>
                    <Text style={styles.modalOptionSub} allowFontScaling={false}>{CURRENCY_LABELS[item]}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.actionPrimary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space10 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.space10 },
  wizardHeader: { marginBottom: spacing.space4, marginTop: spacing.space2 },
  stepChip: { ...typeScale.labelSM, color: Colors.textMuted, fontWeight: '600', marginBottom: spacing.space2 },
  progressOverride: { marginHorizontal: 0, marginBottom: spacing.space2 },
  stepTitle: { ...typeScale.headingLG, fontSize: 22, color: Colors.textPrimary, fontWeight: '700', marginBottom: spacing.space2, marginTop: spacing.space2 },
  stepSubtitle: { ...typeScale.bodyMD, color: Colors.textMuted, lineHeight: 20, marginBottom: spacing.space5 },
  fieldsWrap: { minHeight: 280 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.space3, marginBottom: spacing.space3 },
  toggleLabel: { ...typeScale.bodyMD, color: Colors.textPrimary, fontWeight: '500' },
  fieldLabel: { ...typeScale.labelSM, color: Colors.textSecondary, fontWeight: '600', marginBottom: spacing.space2 },
  currencyWrap: { marginBottom: spacing.space4 },
  currencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    height: 52,
    borderRadius: radius.radiusMD,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: spacing.space4,
  },
  currencyBtnText: { ...typeScale.bodyMD, color: Colors.textPrimary, flex: 1 },
  multiSelectWrap: { marginBottom: spacing.space4 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2, marginTop: spacing.space1 },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  topicChipSelected: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderColor: Colors.actionPrimary,
  },
  topicChipText: { ...typeScale.bodySM, color: Colors.textSecondary },
  topicChipTextSelected: { color: Colors.actionPrimary, fontWeight: '600' },
  errorText: { ...typeScale.caption, color: Colors.statusDanger, marginTop: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.statusDanger,
    padding: spacing.space3,
    marginBottom: spacing.space4,
  },
  errorBoxText: { ...typeScale.bodySM, color: Colors.statusDanger, flex: 1 },
  navRow: { flexDirection: 'row', gap: spacing.space2, marginTop: spacing.space6, paddingTop: spacing.space2 },
  navBtn: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: radius.radius2XL,
    borderTopRightRadius: radius.radius2XL,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.space4,
    maxHeight: '60%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space3 },
  modalTitle: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: '700' },
  modalOption: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space2,
  },
  modalOptionActive: { backgroundColor: Colors.bgPrimarySubtle },
  modalOptionText: { ...typeScale.bodyMD, color: Colors.textSecondary, minWidth: 52 },
  modalOptionTextActive: { color: Colors.actionPrimary, fontWeight: '600' },
  modalOptionSub: { ...typeScale.caption, color: Colors.textMuted, flex: 1 },
});
