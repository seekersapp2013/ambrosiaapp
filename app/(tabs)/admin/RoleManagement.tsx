/**
 * RoleManagement — React Native
 * Phase 6 + Light/Dark mode overhaul
 * FlatList of roles with create/edit Modal form and checklist inputs.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '@/convex/_generated/dataModel';
import { EmptyStateCard } from '@/components/ui/Card';
import { useColors } from '@/hooks/useColors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  PermissionValue,
  ContentTypeValue,
} from '@/app/utils/permissions';

interface FormData {
  name: string;
  description: string;
  permissions: PermissionValue[];
  canApprove: ContentTypeValue[];
}

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  permissions: [],
  canApprove: [],
};

// ─── Checklist row ────────────────────────────────────────────────────────────
function CheckRow({
  label,
  checked,
  onToggle,
  C,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={[styles.checkbox, { borderColor: C.borderDefault, backgroundColor: C.isDark ? C.bgElevated : C.bgInput }, checked && { backgroundColor: C.actionPrimary, borderColor: C.actionPrimary }]}>
        {checked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
      </View>
      <Text style={[styles.checkLabel, { color: C.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Role form modal ──────────────────────────────────────────────────────────
function RoleFormModal({
  visible,
  isEdit,
  formData,
  onClose,
  onSubmit,
  onChange,
  isSaving,
  C,
}: {
  visible: boolean;
  isEdit: boolean;
  formData: FormData;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (patch: Partial<FormData>) => void;
  isSaving: boolean;
  C: ReturnType<typeof useColors>;
}) {
  const togglePermission = (val: PermissionValue) => {
    const next = formData.permissions.includes(val)
      ? formData.permissions.filter(p => p !== val)
      : [...formData.permissions, val];
    onChange({ permissions: next });
  };

  const toggleContentType = (val: ContentTypeValue) => {
    const next = formData.canApprove.includes(val)
      ? formData.canApprove.filter(c => c !== val)
      : [...formData.canApprove, val];
    onChange({ canApprove: next });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              {isEdit ? 'Edit Role' : 'Create New Role'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.iconSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Role Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault, color: C.textPrimary }]}
              value={formData.name}
              onChangeText={val => onChange({ name: val })}
              placeholder="e.g. Content Moderator"
              placeholderTextColor={C.textDisabled}
            />

            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault, color: C.textPrimary }]}
              value={formData.description}
              onChangeText={val => onChange({ description: val })}
              placeholder="Describe what this role does…"
              placeholderTextColor={C.textDisabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Permissions</Text>
            <View style={styles.checkGrid}>
              {(Object.values(PERMISSIONS) as PermissionValue[]).map(val => (
                <CheckRow key={val} label={PERMISSION_LABELS[val]} checked={formData.permissions.includes(val)} onToggle={() => togglePermission(val)} C={C} />
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Can Approve</Text>
            <View style={styles.checkGrid}>
              {(Object.values(CONTENT_TYPES) as ContentTypeValue[]).map(val => (
                <CheckRow key={val} label={CONTENT_TYPE_LABELS[val]} checked={formData.canApprove.includes(val)} onToggle={() => toggleContentType(val)} C={C} />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.actionPrimary }, isSaving && styles.btnDisabled]}
                onPress={onSubmit}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>{isEdit ? 'Update Role' : 'Create Role'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderWidth: 1, borderColor: C.borderDefault }]}
                onPress={onClose}
              >
                <Text style={[styles.modalBtnCancelText, { color: C.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RoleManagement() {
  const C = useColors();
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const roles = useQuery(api.moderation.listModerationRoles);
  const createRole = useMutation(api.moderation.createModerationRole);
  const updateRole = useMutation(api.moderation.updateModerationRole);
  const deleteRole = useMutation(api.moderation.deleteModerationRole);

  const openCreate = () => { setEditingRole(null); setFormData(EMPTY_FORM); setShowModal(true); };
  const openEdit = (role: any) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description, permissions: role.permissions ?? [], canApprove: role.canApprove ?? [] });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingRole(null); setFormData(EMPTY_FORM); };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) { Alert.alert('Required', 'Please fill in all required fields.'); return; }
    setIsSaving(true);
    try {
      if (editingRole) { await updateRole({ roleId: editingRole._id, ...formData }); }
      else { await createRole(formData); }
      closeModal();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save role'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = (role: any) => {
    Alert.alert('Delete Role', `Are you sure you want to delete "${role.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteRole({ roleId: role._id as Id<'moderationRoles'> }); } catch (e: any) { Alert.alert('Error', e.message || 'Failed to delete role'); } } },
    ]);
  };

  const renderRole = ({ item: role }: { item: any }) => (
    <View style={[styles.roleCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
      <View style={styles.roleHeaderRow}>
        <View style={styles.roleHeaderLeft}>
          <View style={styles.roleTitleRow}>
            <Text style={[styles.roleName, { color: C.textPrimary }]}>{role.name}</Text>
            {role.isSystemRole && (
              <View style={[styles.systemBadge, { backgroundColor: C.statusInfoBg }]}>
                <Text style={[styles.systemBadgeText, { color: C.statusInfo }]}>System</Text>
              </View>
            )}
          </View>
          <Text style={[styles.roleDescription, { color: C.textMuted }]}>{role.description}</Text>
          <Text style={[styles.roleMeta, { color: C.textDisabled }]}>
            Created by {role.creator?.username ? `@${role.creator.username}` : role.creator?.name ?? 'Unknown'}
            {' · '}{role.assignmentCount ?? 0} user{role.assignmentCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {!role.isSystemRole && (
          <View style={styles.roleActions}>
            <TouchableOpacity onPress={() => openEdit(role)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="create-outline" size={20} color={C.statusInfo} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(role)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="trash-outline" size={20} color={C.statusDanger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Permission chips */}
      <View style={styles.chipsSection}>
        <Text style={[styles.chipsLabel, { color: C.textDisabled }]}>Permissions</Text>
        <View style={styles.chips}>
          {(role.permissions ?? []).map((p: string) => (
            <View key={p} style={[styles.chip, { backgroundColor: C.isDark ? C.greenSurface : 'rgba(22,163,74,0.08)' }]}>
              <Text style={[styles.chipText, { color: C.statusSuccess }]}>{PERMISSION_LABELS[p as PermissionValue] ?? p}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.chipsSection}>
        <Text style={[styles.chipsLabel, { color: C.textDisabled }]}>Can Approve</Text>
        <View style={styles.chips}>
          {(role.canApprove ?? []).map((t: string) => (
            <View key={t} style={[styles.chip, { backgroundColor: C.isDark ? C.purpleSurface : 'rgba(139,92,246,0.08)' }]}>
              <Text style={[styles.chipText, { color: C.palette.purple }]}>{CONTENT_TYPE_LABELS[t as ContentTypeValue] ?? t}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.toolbar, { borderBottomColor: C.borderSubtle }]}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Role Management</Text>
        <TouchableOpacity style={[styles.createBtn, { backgroundColor: C.actionPrimary }]} onPress={openCreate}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Role</Text>
        </TouchableOpacity>
      </View>

      {roles === undefined ? (
        <View style={styles.loaderWrap}><ActivityIndicator color={C.actionPrimary} size="large" /></View>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={item => item._id}
          renderItem={renderRole}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyStateCard icon="shield-outline" title="No Roles Yet" subtitle="Create your first moderation role" style={styles.emptyState} />}
        />
      )}

      <RoleFormModal visible={showModal} isEdit={!!editingRole} formData={formData} onClose={closeModal} onSubmit={handleSubmit} onChange={patch => setFormData(prev => ({ ...prev, ...patch }))} isSaving={isSaving} C={C} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingH, paddingVertical: spacing.space3,
    borderBottomWidth: 1,
  },
  sectionTitle: { ...typeScale.headingMD },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.radiusFull, paddingHorizontal: spacing.space3, paddingVertical: spacing.space2,
  },
  createBtnText: { ...typeScale.labelSM, color: '#FFFFFF', fontWeight: '700' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.screenPaddingH, paddingBottom: spacing.scrollBottomPadding },
  emptyState: { marginTop: spacing.space10 },

  // Role card
  roleCard: { borderRadius: radius.radiusLG, borderWidth: 1, padding: spacing.space4, marginBottom: spacing.space3 },
  roleHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.space3 },
  roleHeaderLeft: { flex: 1, marginRight: spacing.space3 },
  roleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, flexWrap: 'wrap', marginBottom: 4 },
  roleName: { ...typeScale.headingMD },
  systemBadge: { borderRadius: radius.radiusFull, paddingHorizontal: spacing.space2, paddingVertical: 2 },
  systemBadgeText: { ...typeScale.caption, fontWeight: '600' },
  roleDescription: { ...typeScale.bodySM, marginBottom: 4 },
  roleMeta: { ...typeScale.caption },
  roleActions: { flexDirection: 'row', gap: spacing.space3, alignItems: 'center' },

  // Chips
  chipsSection: { marginTop: spacing.space2 },
  chipsLabel: { ...typeScale.caption, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: radius.radiusFull, paddingHorizontal: spacing.space2, paddingVertical: 3 },
  chipText: { ...typeScale.caption, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.space6, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space4 },
  modalTitle: { ...typeScale.headingMD },
  fieldLabel: { ...typeScale.labelSM, marginBottom: spacing.space2, marginTop: spacing.space4 },
  textInput: { borderRadius: radius.radiusMD, borderWidth: 1, paddingHorizontal: spacing.space3, paddingVertical: spacing.space3, ...typeScale.bodyMD },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  checkGrid: { gap: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space2 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { ...typeScale.bodyMD },
  modalActions: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space6, marginBottom: spacing.space4 },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.space3, borderRadius: radius.radiusMD, minHeight: 48 },
  btnDisabled: { opacity: 0.4 },
  modalBtnPrimaryText: { ...typeScale.labelMD, color: '#FFFFFF', fontWeight: '700' },
  modalBtnCancelText: { ...typeScale.labelMD, fontWeight: '600' },
});
