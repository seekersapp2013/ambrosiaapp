import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import { AppSwitch } from '@/components/ui/Toggle';

export const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export type DayKey = typeof DAYS[number]['key'];
export interface DaySchedule { available: boolean; start: string; end: string; }
export type OpenHours = Record<DayKey, DaySchedule>;

const HOURS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    HOURS.push(`${h.toString().padStart(2, '0')}:${m}`);
  }
}

function displayTime(t: string): string {
  if (!t) return '09:00 AM';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export const DEFAULT_HOURS: OpenHours = {
  monday:    { available: true,  start: '09:00', end: '17:00' },
  tuesday:   { available: true,  start: '09:00', end: '17:00' },
  wednesday: { available: true,  start: '09:00', end: '17:00' },
  thursday:  { available: true,  start: '09:00', end: '17:00' },
  friday:    { available: true,  start: '09:00', end: '17:00' },
  saturday:  { available: false, start: '10:00', end: '14:00' },
  sunday:    { available: false, start: '10:00', end: '14:00' },
};

function TimePicker({
  visible, value, onSelect, onClose, label,
}: {
  visible: boolean;
  value: string;
  onSelect: (t: string) => void;
  onClose: () => void;
  label: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tpStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={tpStyles.sheet}>
          <View style={tpStyles.header}>
            <Text style={tpStyles.title} allowFontScaling={false}>{label}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.iconPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={HOURS}
            keyExtractor={(t) => t}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.space6 }}
            getItemLayout={(_, i) => ({ length: 52, offset: 52 * i, index: i })}
            initialScrollIndex={Math.max(0, HOURS.indexOf(value))}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[tpStyles.option, item === value && tpStyles.optionActive]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={[tpStyles.optionText, item === value && tpStyles.optionTextActive]} allowFontScaling={false}>
                  {displayTime(item)}
                </Text>
                {item === value && <Ionicons name="checkmark" size={18} color={Colors.actionPrimary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  sheet:            { backgroundColor: Colors.bgSurface, borderTopLeftRadius: radius.radius2XL, borderTopRightRadius: radius.radius2XL, paddingHorizontal: spacing.screenPaddingH, paddingTop: spacing.space4, maxHeight: '60%' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space3 },
  title:            { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: '700' },
  option:           { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.space2, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  optionActive:     { backgroundColor: Colors.bgPrimarySubtle },
  optionText:       { ...typeScale.bodyMD, color: Colors.textSecondary, flex: 1 },
  optionTextActive: { color: Colors.actionPrimary, fontWeight: '600' },
});

function DayRow({
  dayKey, label, schedule, onToggle, onStartChange, onEndChange,
}: {
  dayKey: DayKey;
  label: string;
  schedule: DaySchedule;
  onToggle: () => void;
  onStartChange: (t: string) => void;
  onEndChange: (t: string) => void;
}) {
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd]     = useState(false);

  return (
    <View style={drStyles.row}>
      <View style={drStyles.left}>
        <AppSwitch
          value={schedule.available}
          onValueChange={onToggle}
          accessibilityLabel={`Toggle ${label} availability`}
        />
        <Text style={[drStyles.dayLabel, !schedule.available && drStyles.dayLabelOff]} allowFontScaling={false}>
          {label}
        </Text>
      </View>

      {schedule.available ? (
        <View style={drStyles.times}>
          <TouchableOpacity style={drStyles.timeBtn} onPress={() => setShowStart(true)} activeOpacity={0.8}>
            <Text style={drStyles.timeBtnText} allowFontScaling={false}>{displayTime(schedule.start)}</Text>
          </TouchableOpacity>
          <Text style={drStyles.timeSep} allowFontScaling={false}>-</Text>
          <TouchableOpacity style={drStyles.timeBtn} onPress={() => setShowEnd(true)} activeOpacity={0.8}>
            <Text style={drStyles.timeBtnText} allowFontScaling={false}>{displayTime(schedule.end)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={drStyles.unavailableText} allowFontScaling={false}>Unavailable</Text>
      )}

      <TimePicker
        visible={showStart}
        value={schedule.start}
        onSelect={onStartChange}
        onClose={() => setShowStart(false)}
        label={`${label} - Start`}
      />
      <TimePicker
        visible={showEnd}
        value={schedule.end}
        onSelect={onEndChange}
        onClose={() => setShowEnd(false)}
        label={`${label} - End`}
      />
    </View>
  );
}

const drStyles = StyleSheet.create({
  row:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  left:            { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, width: 120 },
  dayLabel:        { ...typeScale.bodyMD, color: Colors.textSecondary, fontWeight: '500' },
  dayLabelOff:     { color: Colors.textDisabled },
  times:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeBtn:         { backgroundColor: Colors.bgElevated, borderRadius: radius.radiusSM, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 10, paddingVertical: 6 },
  timeBtnText:     { ...typeScale.labelSM, color: Colors.textSecondary },
  timeSep:         { ...typeScale.caption, color: Colors.textMuted },
  unavailableText: { ...typeScale.caption, color: Colors.textDisabled, fontStyle: 'italic' },
});

interface WeeklyScheduleFieldProps {
  value: OpenHours;
  onChange: (hours: OpenHours) => void;
  error?: string;
}

export function WeeklyScheduleField({ value, onChange, error }: WeeklyScheduleFieldProps) {
  const hours = value || DEFAULT_HOURS;

  const updateDay = (dayKey: DayKey, patch: Partial<DaySchedule>) => {
    onChange({
      ...hours,
      [dayKey]: { ...hours[dayKey], ...patch },
    });
  };

  return (
    <View style={wsStyles.container}>
      <View style={wsStyles.scheduleCard}>
        {DAYS.map(({ key, label }) => (
          <DayRow
            key={key}
            dayKey={key}
            label={label}
            schedule={hours[key] || DEFAULT_HOURS[key]}
            onToggle={() => updateDay(key, { available: !(hours[key]?.available) })}
            onStartChange={(t) => updateDay(key, { start: t })}
            onEndChange={(t) => updateDay(key, { end: t })}
          />
        ))}
      </View>
      {!!error && <Text style={wsStyles.errorText} allowFontScaling={false}>{error}</Text>}
    </View>
  );
}

const wsStyles = StyleSheet.create({
  container: { marginBottom: spacing.space4 },
  scheduleCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space4,
    overflow: 'hidden',
  },
  errorText: { ...typeScale.caption, color: Colors.statusDanger, marginTop: 4 },
});
