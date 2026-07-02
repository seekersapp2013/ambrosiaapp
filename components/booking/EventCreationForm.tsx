/**
 * EventCreationForm
 * Provider-only form to create a new booking event.
 * Rendered inside a BottomSheet or pushed screen.
 *
 * Fields:
 *   title, description, date (custom calendar), time (custom picker),
 *   duration, max participants, price, currency, tags, public/private,
 *   audio-only toggle → audio settings (maxSpeakers, allowHandRaise, recordAudio)
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppInput, TextareaInput } from "@/components/ui/Input";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { AppSwitch } from "@/components/ui/Toggle";
import { CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS } from "@/utils/currency";

// ─── Constants ────────────────────────────────────────────────────────────────
const DURATIONS  = [30, 60, 90, 120, 180];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ["00","30"]) {
    TIME_OPTIONS.push(`${h.toString().padStart(2,"0")}:${m}`);
  }
}

function displayTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${ampm}`;
}

function toYMD(d: Date): string { return d.toISOString().split("T")[0]; }
function todayYMD(): string { return toYMD(new Date()); }
function daysInMonth(y: number, m: number): number { return new Date(y, m+1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number): number { return new Date(y, m, 1).getDay(); }

// ─── Mini inline calendar (date-only picker) ──────────────────────────────────
function MiniCalendar({ value, onChange, minDate }: {
  value: string; onChange: (d: string) => void; minDate: string;
}) {
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());

  const totalDays = daysInMonth(yr, mo);
  const firstDay  = firstDayOfMonth(yr, mo);
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:totalDays},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() { if (mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1); }
  function next() { if (mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1); }

  return (
    <View style={calStyles.wrap}>
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={prev} style={calStyles.navBtn} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={16} color={Colors.iconPrimary}/>
        </TouchableOpacity>
        <Text style={calStyles.navLabel} allowFontScaling={false}>{MONTH_NAMES[mo]} {yr}</Text>
        <TouchableOpacity onPress={next} style={calStyles.navBtn} accessibilityRole="button" accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={16} color={Colors.iconPrimary}/>
        </TouchableOpacity>
      </View>
      <View style={calStyles.weekRow}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
          <Text key={d} style={calStyles.weekLabel} allowFontScaling={false}>{d}</Text>
        ))}
      </View>
      <View style={calStyles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={calStyles.cell}/>;
          const dateStr = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isPast  = dateStr < minDate;
          const isSel   = dateStr === value;
          return (
            <TouchableOpacity key={idx} style={[calStyles.cell, isSel && calStyles.cellSel, isPast && calStyles.cellPast]}
              onPress={() => !isPast && onChange(dateStr)} disabled={isPast} activeOpacity={0.8}
              accessibilityRole="button" accessibilityLabel={`${MONTH_NAMES[mo]} ${day}`}
              accessibilityState={{ selected: isSel, disabled: isPast }}>
              <Text style={[calStyles.cellText, isSel && calStyles.cellTextSel, isPast && calStyles.cellTextPast]} allowFontScaling={false}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.space3 },
  nav: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom: spacing.space3 },
  navBtn: { width:32, height:32, borderRadius:16, backgroundColor:Colors.bgElevated, borderWidth:1, borderColor:Colors.borderSubtle, alignItems:"center", justifyContent:"center" },
  navLabel: { ...typeScale.labelSM, color:Colors.textPrimary, fontWeight:"700" },
  weekRow: { flexDirection:"row", marginBottom:4 },
  weekLabel: { flex:1, textAlign:"center", ...typeScale.caption, color:Colors.textMuted, fontWeight:"600" },
  grid: { flexDirection:"row", flexWrap:"wrap" },
  cell: { width:`${100/7}%`, aspectRatio:1, alignItems:"center", justifyContent:"center", borderRadius:20 },
  cellSel: { backgroundColor:Colors.actionPrimary },
  cellPast: { opacity:0.3 },
  cellText: { ...typeScale.labelSM, color:Colors.textPrimary },
  cellTextSel: { color:"#FFFFFF", fontWeight:"700" },
  cellTextPast: { color:Colors.textDisabled },
});

// ─── Dropdown picker modal ─────────────────────────────────────────────────────
function DropdownPicker<T extends string>({ visible, options, value, onSelect, onClose, label, renderLabel }: {
  visible: boolean; options: T[]; value: T;
  onSelect: (v: T) => void; onClose: () => void;
  label: string; renderLabel?: (v: T) => string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dpStyles.overlay}>
        <TouchableOpacity style={{flex:1}} onPress={onClose} accessibilityLabel="Close picker"/>
        <View style={dpStyles.sheet}>
          <View style={dpStyles.header}>
            <Text style={dpStyles.title} allowFontScaling={false}>{label}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="close" size={22} color={Colors.iconPrimary}/>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={i=>i}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom:spacing.space6}}
            renderItem={({item}) => {
              const active = item === value;
              return (
                <TouchableOpacity style={[dpStyles.option, active && dpStyles.optionActive]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.8} accessibilityRole="button" accessibilityState={{selected:active}}>
                  <Text style={[dpStyles.optionText, active && dpStyles.optionTextActive]} allowFontScaling={false}>
                    {renderLabel ? renderLabel(item) : item}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={Colors.actionPrimary}/>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const dpStyles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:Colors.bgOverlay, justifyContent:"flex-end" },
  sheet: { backgroundColor:Colors.bgSurface, borderTopLeftRadius:radius.radius2XL, borderTopRightRadius:radius.radius2XL, paddingHorizontal:spacing.screenPaddingH, paddingTop:spacing.space4, maxHeight:"55%" },
  header: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:spacing.space3 },
  title: { ...typeScale.headingSM, color:Colors.textPrimary, fontWeight:"700" },
  option: { height:52, flexDirection:"row", alignItems:"center", borderBottomWidth:1, borderBottomColor:Colors.borderSubtle },
  optionActive: { backgroundColor:Colors.bgPrimarySubtle },
  optionText: { ...typeScale.bodyMD, color:Colors.textSecondary, flex:1 },
  optionTextActive: { color:Colors.actionPrimary, fontWeight:"600" },
});

// ─── Main Form ────────────────────────────────────────────────────────────────
interface EventCreationFormProps {
  existingEvent?: any;   // pass for edit mode
  onSuccess: () => void;
  onCancel:  () => void;
}

interface FormErrors {
  title?: string; description?: string; date?: string;
  time?: string; maxParticipants?: string; price?: string;
  audioSpeakers?: string;
}

export function EventCreationForm({ existingEvent, onSuccess, onCancel }: EventCreationFormProps) {
  const isEditing = !!existingEvent;
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);

  // Wallet — default currency for new events
  const walletQuery = useQuery((api as any)["wallets/getWalletBalance"].getWalletBalance, {});

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title,          setTitle]          = useState(existingEvent?.title          ?? "");
  const [description,    setDescription]    = useState(existingEvent?.description    ?? "");
  const [date,           setDate]           = useState(existingEvent?.sessionDate    ?? "");
  const [time,           setTime]           = useState(existingEvent?.sessionTime    ?? "09:00");
  const [duration,       setDuration]       = useState<number>(existingEvent?.duration ?? 60);
  const [maxParticipants,setMaxParticipants]= useState(String(existingEvent?.maxParticipants ?? "10"));
  const [price,          setPrice]          = useState(String(existingEvent?.pricePerPerson ?? "0"));
  const [currency,       setCurrency]       = useState<string>(existingEvent?.priceCurrency ?? "USD");
  const [tagsInput,      setTagsInput]      = useState((existingEvent?.tags ?? []).join(", "));

  // Sync wallet primary currency into currency once loaded (only for new events)
  const walletSynced = useRef(false);
  React.useEffect(() => {
    if (!isEditing && !walletSynced.current && walletQuery?.primaryCurrency) {
      setCurrency(walletQuery.primaryCurrency);
      walletSynced.current = true;
    }
  }, [walletQuery, isEditing]);
  const [isPublic,       setIsPublic]       = useState(existingEvent?.isPublic ?? true);
  const [isAudioOnly,    setIsAudioOnly]    = useState(existingEvent?.eventType === "AUDIO_ONLY");
  const [maxSpeakers,    setMaxSpeakers]    = useState(String(existingEvent?.audioSettings?.maxSpeakers ?? "5"));
  const [allowHandRaise, setAllowHandRaise] = useState(existingEvent?.audioSettings?.allowHandRaise ?? true);
  const [recordAudio,    setRecordAudio]    = useState(existingEvent?.audioSettings?.recordAudio    ?? false);

  const [showTimePicker, setShowTimePicker]     = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [submitting,setSubmitting]= useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const today = todayYMD();

  // ── Validate ───────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: FormErrors = {};
    if (!title.trim())       e.title       = "Title is required";
    if (!description.trim()) e.description = "Description is required";
    if (!date)               e.date        = "Select a date";
    if (date < today)        e.date        = "Date must be in the future";
    if (!time)               e.time        = "Select a time";
    const mp = parseInt(maxParticipants, 10);
    if (isNaN(mp) || mp < 2) e.maxParticipants = "Minimum 2 participants";
    const pr = parseFloat(price);
    if (isNaN(pr) || pr < 0) e.price = "Enter a valid price (0 for free)";
    if (isAudioOnly) {
      const ms = parseInt(maxSpeakers, 10);
      if (isNaN(ms) || ms < 2) e.audioSpeakers = "Minimum 2 speakers";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitErr("");

    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const mp   = parseInt(maxParticipants, 10);
    const pr   = parseFloat(price);

    try {
      if (isEditing) {
        await updateEvent({
          eventId:        existingEvent._id,
          title:          title.trim(),
          description:    description.trim(),
          sessionDate:    date,
          sessionTime:    time,
          duration,
          maxParticipants: mp,
          pricePerPerson: pr,
          tags,
          isPublic,
        });
      } else {
        await createEvent({
          title:           title.trim(),
          description:     description.trim(),
          sessionDate:     date,
          sessionTime:     time,
          duration,
          maxParticipants: mp,
          pricePerPerson:  pr,
          priceCurrency:   currency,
          tags,
          isPublic,
          eventType:       isAudioOnly ? "AUDIO_ONLY" : "LIVE_STREAM",
          audioSettings:   isAudioOnly ? {
            maxSpeakers:          parseInt(maxSpeakers,10),
            allowHandRaise,
            autoPromoteSpeakers:  false,
            recordAudio,
          } : undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setSubmitErr(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={efStyles.scroll} contentContainerStyle={efStyles.content}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Basic info ─────────────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Event Details</Text>
      <AppInput label="Title" placeholder="e.g. Anxiety Management Workshop"
        value={title} onChangeText={setTitle} error={errors.title} returnKeyType="next"
        accessibilityLabel="Event title"/>
      <TextareaInput label="Description" placeholder="Tell attendees what this session covers…"
        value={description} onChangeText={setDescription} error={errors.description}
        maxLength={600} accessibilityLabel="Event description"/>

      {/* ── Date ──────────────────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Date</Text>
      {errors.date && <Text style={efStyles.fieldError}>{errors.date}</Text>}
      <View style={efStyles.calCard}>
        <MiniCalendar value={date} onChange={setDate} minDate={today}/>
        {date && (
          <View style={efStyles.selectedDate}>
            <Ionicons name="calendar-outline" size={14} color={Colors.actionPrimary}/>
            <Text style={efStyles.selectedDateText} allowFontScaling={false}>{date}</Text>
          </View>
        )}
      </View>

      {/* ── Time ──────────────────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Time</Text>
      <TouchableOpacity style={[efStyles.pickerBtn, errors.time && efStyles.pickerBtnError]}
        onPress={() => setShowTimePicker(true)} activeOpacity={0.8}
        accessibilityRole="button" accessibilityLabel={`Session time: ${displayTime(time)}`}>
        <Ionicons name="time-outline" size={18} color={Colors.iconSecondary}/>
        <Text style={efStyles.pickerBtnText} allowFontScaling={false}>{displayTime(time)}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.iconSecondary}/>
      </TouchableOpacity>
      {errors.time && <Text style={efStyles.fieldError}>{errors.time}</Text>}

      {/* ── Duration ──────────────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Duration</Text>
      <View style={efStyles.chipRow}>
        {DURATIONS.map(d => (
          <TouchableOpacity key={d} style={[efStyles.chip, duration===d && efStyles.chipActive]}
            onPress={() => setDuration(d)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityState={{selected:duration===d}}>
            <Text style={[efStyles.chipText, duration===d && efStyles.chipTextActive]} allowFontScaling={false}>
              {d} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Capacity & Pricing ────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Capacity & Pricing</Text>
      <View style={efStyles.twoCol}>
        <View style={efStyles.colField}>
          <AppInput label="Max Participants" placeholder="10"
            value={maxParticipants} onChangeText={setMaxParticipants}
            error={errors.maxParticipants} keyboardType="number-pad"
            accessibilityLabel="Maximum number of participants"/>
        </View>
        <View style={efStyles.colField}>
          <AppInput label="Price Per Person" placeholder="0"
            value={price} onChangeText={setPrice} error={errors.price}
            keyboardType="decimal-pad" leadingIcon={<Text style={efStyles.currencySymbol}>$</Text>}
            accessibilityLabel="Price per person"/>
        </View>
      </View>

      {/* Currency picker */}
      <TouchableOpacity style={efStyles.pickerBtn} onPress={() => setShowCurrencyPicker(true)}
        activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Currency: ${currency}`}>
        <Ionicons name="cash-outline" size={18} color={Colors.iconSecondary}/>
        <Text style={efStyles.pickerBtnText} allowFontScaling={false}>
          {CURRENCY_SYMBOLS[currency as Currency] ?? ""} {currency} — {CURRENCY_LABELS[currency as Currency] ?? currency}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.iconSecondary}/>
      </TouchableOpacity>

      {/* ── Tags ──────────────────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Tags (comma-separated)</Text>
      <AppInput label="" placeholder="e.g. anxiety, wellness, mindfulness"
        value={tagsInput} onChangeText={setTagsInput} returnKeyType="done"
        accessibilityLabel="Tags, comma separated"/>

      {/* ── Visibility ────────────────────────────────────────── */}
      <Text style={efStyles.sectionLabel}>Visibility</Text>
      <View style={efStyles.toggleRow}>
        <View style={efStyles.toggleInfo}>
          <Text style={efStyles.toggleLabel} allowFontScaling={false}>
            {isPublic ? "Public Event" : "Private Event"}
          </Text>
          <Text style={efStyles.toggleSub} allowFontScaling={false}>
            {isPublic ? "Visible in the public events feed" : "Only reachable via direct link"}
          </Text>
        </View>
        <AppSwitch value={isPublic} onValueChange={setIsPublic} accessibilityLabel="Toggle event visibility"/>
      </View>

      {/* ── Audio only ────────────────────────────────────────── */}
      {!isEditing && (
        <>
          <View style={efStyles.toggleRow}>
            <View style={efStyles.toggleInfo}>
              <Text style={efStyles.toggleLabel} allowFontScaling={false}>Audio-Only Room</Text>
              <Text style={efStyles.toggleSub} allowFontScaling={false}>
                Podcast-style with speakers and listeners instead of video
              </Text>
            </View>
            <AppSwitch value={isAudioOnly} onValueChange={setIsAudioOnly} accessibilityLabel="Toggle audio-only mode"/>
          </View>

          {isAudioOnly && (
            <View style={efStyles.audioCard}>
              <Text style={efStyles.audioCardTitle} allowFontScaling={false}>Audio Room Settings</Text>
              <AppInput label="Max Speakers" placeholder="5"
                value={maxSpeakers} onChangeText={setMaxSpeakers}
                error={errors.audioSpeakers} keyboardType="number-pad"
                accessibilityLabel="Maximum number of speakers"/>
              <View style={efStyles.toggleRow}>
                <View style={efStyles.toggleInfo}>
                  <Text style={efStyles.toggleLabel} allowFontScaling={false}>Allow Hand Raise</Text>
                  <Text style={efStyles.toggleSub} allowFontScaling={false}>Listeners can request to speak</Text>
                </View>
                <AppSwitch value={allowHandRaise} onValueChange={setAllowHandRaise} accessibilityLabel="Allow hand raise"/>
              </View>
              <View style={[efStyles.toggleRow, {borderBottomWidth:0}]}>
                <View style={efStyles.toggleInfo}>
                  <Text style={efStyles.toggleLabel} allowFontScaling={false}>Record Audio</Text>
                  <Text style={efStyles.toggleSub} allowFontScaling={false}>Save a recording for later download</Text>
                </View>
                <AppSwitch value={recordAudio} onValueChange={setRecordAudio} accessibilityLabel="Record audio"/>
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Submit error ───────────────────────────────────────── */}
      {submitErr !== "" && (
        <View style={efStyles.submitError}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger}/>
          <Text style={efStyles.submitErrorText} allowFontScaling={false}>{submitErr}</Text>
        </View>
      )}

      {/* ── Buttons ───────────────────────────────────────────── */}
      <View style={efStyles.btnRow}>
        <SecondaryButton label="Cancel" onPress={onCancel} style={efStyles.btnCancel} accessibilityLabel="Cancel"/>
        <PrimaryButton
          label={isEditing ? "Save Changes" : "Create Event"}
          onPress={handleSubmit} loading={submitting} style={efStyles.btnSubmit}
          icon={<Ionicons name={isEditing ? "save-outline" : "add-circle-outline"} size={18} color="#FFFFFF"/>}
          accessibilityLabel={isEditing ? "Save event changes" : "Create event"}/>
      </View>

      {/* Pickers */}
      <DropdownPicker
        visible={showTimePicker} options={TIME_OPTIONS} value={time}
        onSelect={setTime} onClose={() => setShowTimePicker(false)}
        label="Session Time" renderLabel={displayTime}/>
      <DropdownPicker
        visible={showCurrencyPicker} options={CURRENCIES as unknown as string[]} value={currency}
        onSelect={(v) => setCurrency(v)} onClose={() => setShowCurrencyPicker(false)}
        label="Pricing Currency"
        renderLabel={(v) => `${CURRENCY_SYMBOLS[v as Currency] ?? ""} ${v} — ${CURRENCY_LABELS[v as Currency] ?? v}`}/>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const efStyles = StyleSheet.create({
  scroll: { flex:1 },
  content: { paddingHorizontal:spacing.space4, paddingBottom:spacing.space10 },

  sectionLabel: {
    ...typeScale.labelSM, color:Colors.textSecondary, fontWeight:"700",
    textTransform:"uppercase", letterSpacing:0.7,
    marginBottom:spacing.space2, marginTop:spacing.space4,
  },
  fieldError: { ...typeScale.caption, color:Colors.statusDanger, marginBottom:spacing.space2, marginTop:-spacing.space2 },

  calCard: { backgroundColor:Colors.bgElevated, borderRadius:radius.radiusMD, borderWidth:1, borderColor:Colors.borderSubtle, padding:spacing.space3, marginBottom:spacing.space3 },
  selectedDate: { flexDirection:"row", alignItems:"center", gap:spacing.space2, paddingTop:spacing.space2, borderTopWidth:1, borderTopColor:Colors.borderSubtle },
  selectedDateText: { ...typeScale.labelSM, color:Colors.actionPrimary, fontWeight:"600" },

  pickerBtn: { flexDirection:"row", alignItems:"center", gap:spacing.space2, height:56, borderRadius:radius.radiusMD, borderWidth:1.5, borderColor:Colors.borderDefault, backgroundColor:Colors.bgSurface, paddingHorizontal:spacing.space4, marginBottom:spacing.space3 },
  pickerBtnError: { borderColor:Colors.borderError },
  pickerBtnText: { ...typeScale.bodyMD, color:Colors.textPrimary, flex:1 },

  chipRow: { flexDirection:"row", gap:spacing.space2, flexWrap:"wrap", marginBottom:spacing.space3 },
  chip: { paddingHorizontal:14, paddingVertical:8, borderRadius:radius.radiusFull, backgroundColor:Colors.bgElevated, borderWidth:1, borderColor:Colors.borderSubtle },
  chipActive: { backgroundColor:Colors.bgPrimaryMid, borderColor:Colors.borderFilled },
  chipText: { ...typeScale.labelSM, color:Colors.textMuted },
  chipTextActive: { color:Colors.actionPrimary, fontWeight:"600" },

  twoCol: { flexDirection:"row", gap:spacing.space3 },
  colField: { flex:1 },
  currencySymbol: { ...typeScale.bodyMD, color:Colors.textMuted, fontWeight:"600" },

  toggleRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingVertical:spacing.space3, borderBottomWidth:1, borderBottomColor:Colors.borderSubtle },
  toggleInfo: { flex:1, marginRight:spacing.space4 },
  toggleLabel: { ...typeScale.bodyMD, color:Colors.textPrimary, fontWeight:"500" },
  toggleSub: { ...typeScale.caption, color:Colors.textMuted, marginTop:2 },

  audioCard: { backgroundColor:Colors.statusInfoBg, borderRadius:radius.radiusMD, borderWidth:1, borderColor:Colors.borderSubtle, padding:spacing.space4, marginBottom:spacing.space4 },
  audioCardTitle: { ...typeScale.headingSM, color:Colors.statusInfo, fontWeight:"700", marginBottom:spacing.space3 },

  submitError: { flexDirection:"row", alignItems:"flex-start", gap:spacing.space2, backgroundColor:Colors.statusDangerBg, borderRadius:radius.radiusMD, borderWidth:1, borderColor:Colors.statusDanger, padding:spacing.space3, marginBottom:spacing.space4 },
  submitErrorText: { ...typeScale.bodySM, color:Colors.statusDanger, flex:1, lineHeight:18 },

  btnRow: { flexDirection:"row", gap:spacing.space3, marginTop:spacing.space4 },
  btnCancel: { flex:1 },
  btnSubmit: { flex:2 },
});
