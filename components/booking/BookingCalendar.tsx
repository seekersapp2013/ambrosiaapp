/**
 * BookingCalendar
 * Pure-RN month grid + time slot picker. No third-party calendar library.
 * Calls getProviderAvailability for the displayed month range.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CalendarSelection {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  duration: number;   // minutes
}

interface BookingCalendarProps {
  providerId: string;
  oneOnOnePrice: number;
  currency: string;
  onSelect: (selection: CalendarSelection) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DURATIONS = [30, 60, 90, 120];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

function todayYMD(): string {
  return toYMD(new Date());
}

function formatTimeDisplay(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BookingCalendar({
  providerId,
  oneOnOnePrice,
  currency,
  onSelect,
}: BookingCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration]     = useState(60);

  // Date range for the displayed month
  const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay   = daysInMonth(viewYear, viewMonth);
  const endDate   = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${lastDay}`;

  const availability = useQuery(api.bookings.getProviderAvailability, {
    providerId: providerId as any,
    startDate,
    endDate,
  });

  const availabilityMap = useMemo(() => {
    const m: Record<string, typeof availability extends { availability: any[] } ? typeof availability["availability"][number] : never> = {};
    if (availability && "availability" in availability) {
      for (const day of (availability as any).availability) {
        m[day.date] = day;
      }
    }
    return m;
  }, [availability]);

  // Navigate months
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
    setSelectedTime(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
    setSelectedTime(null);
  }

  // Build calendar grid
  const totalDays  = daysInMonth(viewYear, viewMonth);
  const firstDay   = firstDayOfMonth(viewYear, viewMonth);
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (calCells.length % 7 !== 0) calCells.push(null);

  const todayStr = todayYMD();

  function getDayState(day: number | null): "empty" | "past" | "unavailable" | "available" | "selected" {
    if (day === null) return "empty";
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateStr < todayStr) return "past";
    if (dateStr === selectedDate) return "selected";
    const dayData = availabilityMap[dateStr];
    if (!dayData) return availability === undefined ? "unavailable" : "unavailable";
    return (dayData as any).available ? "available" : "unavailable";
  }

  function handleDayPress(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateStr < todayStr) return;
    const dayData = availabilityMap[dateStr];
    if (!dayData || !(dayData as any).available) return;
    setSelectedDate(dateStr);
    setSelectedTime(null);
  }

  // Time slots for selected date
  const timeSlots: { time: string; available: boolean }[] = useMemo(() => {
    if (!selectedDate) return [];
    const dayData = availabilityMap[selectedDate] as any;
    if (!dayData?.timeSlots) return [];
    return dayData.timeSlots;
  }, [selectedDate, availabilityMap]);

  // Computed total price
  const totalPrice = ((duration / 60) * oneOnOnePrice).toFixed(2);

  // Confirm selection
  function handleConfirm() {
    if (!selectedDate || !selectedTime) return;
    onSelect({ date: selectedDate, time: selectedTime, duration });
  }

  const canConfirm = !!selectedDate && !!selectedTime;

  return (
    <View style={styles.container}>
      {/* ── Month navigator ─────────────────────────────────────── */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={prevMonth}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel} allowFontScaling={false}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity
          onPress={nextMonth}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.iconPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Loading state ────────────────────────────────────────── */}
      {availability === undefined && (
        <View style={styles.calLoadingWrap}>
          <ActivityIndicator color={Colors.actionPrimary} />
        </View>
      )}

      {/* ── Calendar grid ────────────────────────────────────────── */}
      {availability !== undefined && (
        <>
          {/* Day headers */}
          <View style={styles.weekRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.weekLabel} allowFontScaling={false}>{d}</Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.grid}>
            {calCells.map((day, idx) => {
              const state = getDayState(day);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    state === "available"   && styles.dayCellAvailable,
                    state === "selected"    && styles.dayCellSelected,
                    state === "past"        && styles.dayCellPast,
                    state === "unavailable" && styles.dayCellUnavailable,
                  ]}
                  onPress={() => day !== null && handleDayPress(day)}
                  disabled={state === "past" || state === "unavailable" || state === "empty"}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={day ? `${MONTH_NAMES[viewMonth]} ${day}` : undefined}
                  accessibilityState={day ? { selected: state === "selected", disabled: state === "past" || state === "unavailable" } : undefined}
                >
                  {day !== null && (
                    <Text
                      style={[
                        styles.dayText,
                        state === "selected"    && styles.dayTextSelected,
                        state === "past"        && styles.dayTextPast,
                        state === "unavailable" && styles.dayTextUnavailable,
                        state === "available"   && styles.dayTextAvailable,
                      ]}
                      allowFontScaling={false}
                    >
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Legend ──────────────────────────────────────────── */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.statusSuccessBg, borderColor: Colors.statusSuccess }]} />
              <Text style={styles.legendText} allowFontScaling={false}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.actionPrimary }]} />
              <Text style={styles.legendText} allowFontScaling={false}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.bgElevated, borderColor: Colors.borderSubtle }]} />
              <Text style={styles.legendText} allowFontScaling={false}>Unavailable</Text>
            </View>
          </View>
        </>
      )}

      {/* ── Time slots ───────────────────────────────────────────── */}
      {selectedDate && (
        <View style={styles.slotsSection}>
          <Text style={styles.sectionLabel} allowFontScaling={false}>
            Select a time — {selectedDate}
          </Text>
          {timeSlots.length === 0 ? (
            <View style={styles.noSlotsWrap}>
              <Ionicons name="time-outline" size={24} color={Colors.iconSecondary} />
              <Text style={styles.noSlotsText} allowFontScaling={false}>
                No available slots on this day
              </Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.slotBtn,
                    !slot.available && styles.slotBtnBooked,
                    selectedTime === slot.time && styles.slotBtnSelected,
                  ]}
                  onPress={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatTimeDisplay(slot.time)}${slot.available ? "" : " — booked"}`}
                  accessibilityState={{ selected: selectedTime === slot.time, disabled: !slot.available }}
                >
                  <Text
                    style={[
                      styles.slotText,
                      !slot.available && styles.slotTextBooked,
                      selectedTime === slot.time && styles.slotTextSelected,
                    ]}
                    allowFontScaling={false}
                  >
                    {formatTimeDisplay(slot.time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Duration picker ──────────────────────────────────────── */}
      {selectedDate && selectedTime && (
        <View style={styles.durationSection}>
          <Text style={styles.sectionLabel} allowFontScaling={false}>Session duration</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, duration === d && styles.durationChipActive]}
                onPress={() => setDuration(d)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === d }}
                accessibilityLabel={`${d} minutes`}
              >
                <Text
                  style={[styles.durationText, duration === d && styles.durationTextActive]}
                  allowFontScaling={false}
                >
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price preview */}
          <View style={styles.pricePreview}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel} allowFontScaling={false}>
                {duration} min × {currency} {oneOnOnePrice}/hr
              </Text>
              <Text style={styles.priceTotal} allowFontScaling={false}>
                {currency} {totalPrice}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Confirm button ───────────────────────────────────────── */}
      {canConfirm && (
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Continue to booking confirmation"
        >
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          <Text style={styles.confirmBtnText} allowFontScaling={false}>
            Continue — {currency} {totalPrice}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space4,
  },

  // Month navigator
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.space4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  monthLabel: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  calLoadingWrap: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },

  // Week labels
  weekRow: {
    flexDirection: "row",
    marginBottom: spacing.space2,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    ...typeScale.caption,
    color: Colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginBottom: 2,
  },
  dayCellAvailable: {
    backgroundColor: Colors.statusSuccessBg,
  },
  dayCellSelected: {
    backgroundColor: Colors.actionPrimary,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayCellUnavailable: {},
  dayText: {
    ...typeScale.labelSM,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextPast: {
    color: Colors.textDisabled,
  },
  dayTextUnavailable: {
    color: Colors.textDisabled,
  },
  dayTextAvailable: {
    color: Colors.statusSuccess,
    fontWeight: "600",
  },

  // Legend
  legend: {
    flexDirection: "row",
    gap: spacing.space4,
    justifyContent: "center",
    marginTop: spacing.space3,
    marginBottom: spacing.space4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "transparent",
  },
  legendText: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // Time slots
  slotsSection: {
    marginBottom: spacing.space4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingTop: spacing.space4,
  },
  sectionLabel: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.space3,
  },
  noSlotsWrap: {
    alignItems: "center",
    paddingVertical: spacing.space5,
    gap: spacing.space2,
  },
  noSlotsText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space2,
  },
  slotBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.radiusMD,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  slotBtnBooked: {
    opacity: 0.35,
  },
  slotBtnSelected: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.borderFilled,
  },
  slotText: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
  },
  slotTextBooked: {
    color: Colors.textDisabled,
  },
  slotTextSelected: {
    color: Colors.actionPrimary,
    fontWeight: "600",
  },

  // Duration
  durationSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingTop: spacing.space4,
    marginBottom: spacing.space4,
  },
  durationRow: {
    flexDirection: "row",
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: radius.radiusMD,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  durationChipActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.borderFilled,
  },
  durationText: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
  },
  durationTextActive: {
    color: Colors.actionPrimary,
    fontWeight: "600",
  },

  // Price preview
  pricePreview: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
    padding: spacing.space3,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  priceTotal: {
    ...typeScale.headingSM,
    color: Colors.actionPrimary,
    fontWeight: "700",
  },

  // Confirm button
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingVertical: 16,
    marginTop: spacing.space2,
  },
  confirmBtnText: {
    ...typeScale.labelLG,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
