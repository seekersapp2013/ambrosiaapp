import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import { KYCFieldOption } from '@/hooks/useKYCConfig';

interface SelectFieldProps {
  label: string;
  value: string;
  options: KYCFieldOption[];
  onSelect: (value: string) => void;
  error?: string;
  placeholder?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
}

export function SelectField({
  label,
  value,
  options,
  onSelect,
  error,
  placeholder = 'Select an option',
  leadingIcon,
}: SelectFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label} allowFontScaling={false}>{label}</Text>}
      <TouchableOpacity
        style={[styles.pickerBtn, !!error && styles.pickerBtnError]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {leadingIcon && (
          <Ionicons name={leadingIcon} size={18} color={Colors.iconSecondary} style={styles.iconPrefix} />
        )}
        <Text style={[styles.pickerBtnText, !selectedOption && styles.placeholderText]} allowFontScaling={false}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.iconSecondary} />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title} allowFontScaling={false}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.iconPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.space6 }}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onSelect(item.value);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]} allowFontScaling={false}>
                      {item.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.actionPrimary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.space4 },
  label: { ...typeScale.labelSM, color: Colors.textSecondary, fontWeight: '600', marginBottom: spacing.space2 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.radiusMD,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: spacing.space4,
  },
  pickerBtnError: { borderColor: Colors.statusDanger },
  iconPrefix: { marginRight: spacing.space2 },
  pickerBtnText: { ...typeScale.bodyMD, color: Colors.textPrimary, flex: 1 },
  placeholderText: { color: Colors.textMuted },
  errorText: { ...typeScale.caption, color: Colors.statusDanger, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: radius.radius2XL,
    borderTopRightRadius: radius.radius2XL,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.space4,
    maxHeight: '60%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space3 },
  title: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: '700' },
  option: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: spacing.space2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  optionActive: { backgroundColor: Colors.bgPrimarySubtle },
  optionText: { ...typeScale.bodyMD, color: Colors.textSecondary, flex: 1 },
  optionTextActive: { color: Colors.actionPrimary, fontWeight: '600' },
});
