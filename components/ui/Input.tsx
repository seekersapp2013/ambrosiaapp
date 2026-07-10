/**
 * Ambrosia Design System — Input Components
 * Phase 5: All input variants with full state matrix (Phase 20)
 * Accessibility: Phase 21
 */

import React, { useState, useEffect, useRef, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { duration } from '@/tokens/motion';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type InputState = 'default' | 'focused' | 'filled' | 'error' | 'disabled' | 'readonly';

interface BaseInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  state?: InputState;
  containerStyle?: StyleProp<ViewStyle>;
  trailingIcon?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  /** Force dark-mode colors (for inputs rendered on dark surfaces like BottomSheet) */
  forceDark?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — derive border/bg from state (now takes color set as parameter)
// ─────────────────────────────────────────────────────────────────────────────
function getBorderColor(state: InputState, C: ReturnType<typeof useColors>): string {
  switch (state) {
    case 'focused':  return C.borderFocus;
    case 'filled':   return C.borderFilled;
    case 'error':    return C.borderError;
    case 'disabled':
    case 'readonly': return C.borderSubtle;
    default:         return C.borderDefault;
  }
}

function getBgColor(state: InputState, C: ReturnType<typeof useColors>): string {
  switch (state) {
    case 'focused':  return C.bgPrimarySubtle;
    case 'error':    return C.bgErrorSubtle;
    case 'disabled':
    case 'readonly': return C.bgElevated;
    default:         return C.bgInput ?? C.bgSurface;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AppInput — Standard text input with label, error, and all states
// Phase 5: 56px height, 12px radius, 1.5px border
// ─────────────────────────────────────────────────────────────────────────────
export const AppInput = forwardRef<TextInput, BaseInputProps>(function AppInput(
  {
    label,
    error,
    hint,
    state: stateProp,
    containerStyle,
    trailingIcon,
    leadingIcon,
    editable = true,
    value,
    onFocus,
    onBlur,
    accessibilityLabel,
    accessibilityHint,
    forceDark,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const C = useColors();

  // When forceDark is true, use dark-mode colors regardless of active theme
  const inputBg = forceDark ? '#171730' : undefined;
  const inputBorder = forceDark ? 'rgba(255,255,255,0.12)' : undefined;
  const inputText = forceDark ? '#FFFFFF' : C.textPrimary;
  const inputLabel = forceDark ? '#9CA3AF' : C.textSecondary;
  const inputPlaceholder = forceDark ? '#6B7280' : C.textDisabled;

  // Derive state: explicit prop wins, otherwise infer
  const state: InputState =
    stateProp ??
    (!editable ? 'disabled' :
     error ? 'error' :
     focused ? 'focused' :
     value ? 'filled' :
     'default');

  const borderColor = inputBorder ?? getBorderColor(state, C);
  const bgColor = inputBg ?? getBgColor(state, C);

  const handleFocus = (e: any) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label ? (
        <Text style={[styles.inputLabel, { color: inputLabel }]} allowFontScaling={true}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          { borderColor, backgroundColor: bgColor },
        ]}
      >
        {leadingIcon ? (
          <View style={styles.leadingIconWrap}>{leadingIcon}</View>
        ) : null}

        <TextInput
          ref={ref}
          style={[
            styles.inputField,
            { color: inputText },
            leadingIcon ? styles.inputFieldWithLeading : null,
            trailingIcon ? styles.inputFieldWithTrailing : null,
          ]}
          value={value}
          editable={editable && state !== 'readonly'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={inputPlaceholder}
          selectionColor={C.actionPrimary}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: state === 'disabled' }}
          {...rest}
        />

        {/* Auto trailing icon based on state */}
        {state === 'filled' && !trailingIcon ? (
          <View style={styles.trailingIconWrap}>
            <Ionicons name="checkmark-circle" size={20} color={C.statusSuccess} />
          </View>
        ) : state === 'error' && !trailingIcon ? (
          <View style={styles.trailingIconWrap}>
            <Ionicons name="close-circle" size={20} color={C.statusDanger} />
          </View>
        ) : state === 'readonly' && !trailingIcon ? (
          <View style={styles.trailingIconWrap}>
            <Ionicons name="lock-closed" size={16} color={C.iconSecondary} />
          </View>
        ) : trailingIcon ? (
          <View style={styles.trailingIconWrap}>{trailingIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: C.statusDanger }]} allowFontScaling={true}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: C.textMuted }]} allowFontScaling={true}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PasswordInput — Standard input with eye toggle
// ─────────────────────────────────────────────────────────────────────────────
export const PasswordInput = forwardRef<TextInput, BaseInputProps>(function PasswordInput(
  props,
  ref,
) {
  const [visible, setVisible] = useState(false);
  const C = useColors();

  return (
    <AppInput
      ref={ref}
      secureTextEntry={!visible}
      trailingIcon={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={C.iconSecondary}
          />
        </Pressable>
      }
      {...props}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SearchInput — Pill-shaped search bar
// Phase 5: 48px height, radiusFull, no border, surfaceElevated bg
// ─────────────────────────────────────────────────────────────────────────────
interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: StyleProp<ViewStyle>;
}

export function SearchInput({ containerStyle, ...rest }: SearchInputProps) {
  const C = useColors();

  return (
    <View style={[styles.searchContainer, { backgroundColor: C.bgElevated }, containerStyle]}>
      <Ionicons name="search-outline" size={18} color={C.iconSecondary} />
      <TextInput
        style={[styles.searchField, { color: C.textPrimary }]}
        placeholderTextColor={C.textDisabled}
        selectionColor={C.actionPrimary}
        accessibilityRole="search"
        {...rest}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TextareaInput — Multi-line input
// Phase 5: minHeight 120px, 12px radius, character count
// ─────────────────────────────────────────────────────────────────────────────
interface TextareaProps extends Omit<TextInputProps, 'style' | 'multiline'> {
  label?: string;
  error?: string;
  maxLength?: number;
  containerStyle?: StyleProp<ViewStyle>;
  /** Force dark-mode colors (for textareas rendered on dark surfaces) */
  forceDark?: boolean;
}

export function TextareaInput({
  label,
  error,
  maxLength,
  containerStyle,
  value,
  accessibilityLabel,
  accessibilityHint,
  forceDark,
  ...rest
}: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const C = useColors();
  const charCount = value?.length ?? 0;

  const tBg = forceDark ? '#171730' : C.bgSurface;
  const tBorder = forceDark ? 'rgba(255,255,255,0.12)' : (focused ? C.borderFocus : error ? C.borderError : C.borderDefault);
  const tText = forceDark ? '#FFFFFF' : C.textPrimary;
  const tLabel = forceDark ? '#9CA3AF' : C.textSecondary;
  const tPlaceholder = forceDark ? '#6B7280' : C.textDisabled;
  const tCount = forceDark ? '#6B7280' : C.textDisabled;

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label ? (
        <Text style={[styles.inputLabel, { color: tLabel }]} allowFontScaling={true}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.textareaRow,
          {
            borderColor: forceDark ? tBorder : (focused ? C.borderFocus : error ? C.borderError : C.borderDefault),
            backgroundColor: tBg,
          },
        ]}
      >
        <TextInput
          style={[styles.textareaField, { color: tText }]}
          multiline
          textAlignVertical="top"
          value={value}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={tPlaceholder}
          selectionColor={C.actionPrimary}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          {...rest}
        />
        {maxLength ? (
          <Text style={[styles.charCount, { color: tCount }]} allowFontScaling={false}>
            {charCount}/{maxLength}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: C.statusDanger }]} allowFontScaling={true}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OTPInput — 6 individual boxes
// Phase 5: 48×56px each, 12px radius, spring animation on fill
// ─────────────────────────────────────────────────────────────────────────────
interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  error?: boolean;
  success?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  error = false,
  success = false,
  containerStyle,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const C = useColors();
  const scales = useRef(
    Array.from({ length }, () => new Animated.Value(1)),
  ).current;

  // Track which indices have been masked after their brief reveal
  const [maskedIndices, setMaskedIndices] = useState<Set<number>>(new Set());
  const maskTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    const prevLen = value.length;
    const newLen = digits.length;

    if (newLen > prevLen && newLen <= length) {
      const idx = newLen - 1;

      // Animate
      Animated.sequence([
        Animated.spring(scales[idx], {
          toValue: 1.08,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }),
        Animated.spring(scales[idx], {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }),
      ]).start();

      // Unmask briefly, then re-mask after 600ms
      setMaskedIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      clearTimeout(maskTimers.current[idx]);
      maskTimers.current[idx] = setTimeout(() => {
        setMaskedIndices((prev) => new Set(prev).add(idx));
      }, 600);
    }

    // When a digit is deleted, remove its mask
    if (newLen < prevLen) {
      const idx = newLen; // the position that was just cleared
      clearTimeout(maskTimers.current[idx]);
      setMaskedIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }

    onChange(digits);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(maskTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Reset masks when value is cleared externally (e.g. modal reopen)
  useEffect(() => {
    if (value.length === 0) {
      Object.values(maskTimers.current).forEach(clearTimeout);
      maskTimers.current = {};
      setMaskedIndices(new Set());
    }
  }, [value]);

  const getBoxState = (idx: number): InputState => {
    if (error) return 'error';
    if (idx < value.length) return 'filled';
    if (idx === value.length) return 'focused';
    return 'default';
  };

  return (
    <View style={[styles.otpContainer, containerStyle]}>
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        style={styles.otpHiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden
        accessibilityLabel="OTP verification code input"
        accessibilityHint={`Enter ${length} digit verification code`}
      />

      {/* Visual boxes */}
      {Array.from({ length }).map((_, idx) => {
        const boxState = getBoxState(idx);
        const borderColor = success
          ? C.statusSuccess
          : getBorderColor(boxState, C);
        const bgColor = success
          ? C.statusSuccessBg
          : getBgColor(boxState, C);
        const isMasked = maskedIndices.has(idx) && idx < value.length;
        return (
          <Animated.View
            key={idx}
            style={[{ transform: [{ scale: scales[idx] }] }]}
          >
            <Pressable
              onPress={() => inputRef.current?.focus()}
              style={[styles.otpBox, { borderColor, backgroundColor: bgColor }]}
              accessibilityElementsHidden
            >
              <Text style={[
                styles.otpDigit,
                { color: C.textPrimary },
                error && { color: C.statusDanger },
                success && { color: C.statusSuccess },
                isMasked && styles.otpBullet,
              ]}>
                {isMasked ? '●' : (value[idx] ?? '')}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Standard input
  inputContainer: {
    marginBottom: spacing.space6,
  },
  inputLabel: {
    ...typeScale.bodySM,
    fontWeight: '600',
    marginBottom: spacing.space2,
  },
  inputRow: {
    height: 56,
    borderRadius: radius.radiusMD,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    overflow: 'hidden',
  },
  inputField: {
    flex: 1,
    ...typeScale.bodyMD,
    height: '100%',
  },
  inputFieldWithLeading: {
    paddingLeft: spacing.space2,
  },
  inputFieldWithTrailing: {
    paddingRight: spacing.space2,
  },
  leadingIconWrap: {
    marginRight: spacing.space2,
  },
  trailingIconWrap: {
    marginLeft: spacing.space2,
  },
  errorText: {
    ...typeScale.caption,
    marginTop: 4,
  },
  hintText: {
    ...typeScale.caption,
    marginTop: 4,
  },

  // Search
  searchContainer: {
    height: 48,
    borderRadius: radius.radiusFull,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    gap: spacing.space2,
  },
  searchField: {
    flex: 1,
    ...typeScale.bodyMD,
  },

  // Textarea
  textareaRow: {
    borderRadius: radius.radiusMD,
    borderWidth: 1.5,
    paddingHorizontal: spacing.space4,
    paddingVertical: 14,
    minHeight: 120,
  },
  textareaField: {
    ...typeScale.bodyMD,
    minHeight: 80,
  },
  charCount: {
    ...typeScale.caption,
    textAlign: 'right',
    marginTop: 4,
  },

  // OTP
  otpContainer: {
    flexDirection: 'row',
    gap: spacing.space2,
    justifyContent: 'center',
  },
  otpHiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBox: {
    width: 64,
    height: 72,
    borderRadius: radius.radiusMD,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBullet: {
    fontSize: 22,
    lineHeight: 28,
  },
});
