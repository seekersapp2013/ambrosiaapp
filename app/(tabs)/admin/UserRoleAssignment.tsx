/**
 * UserRoleAssignment — React Native
 * Phase 7 + Light/Dark mode overhaul
 * User search + custom role picker Modal.
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
  Image,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '@/convex/_generated/dataModel';
import { useColors } from '@/hooks/useColors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

// ─── Avatar with initials fallback ───────────────────────────────────────────
function UserAvatar({ uri, name, size = 40, C }: { uri?: string | null; name?: string; size?: number; C: ReturnType<typeof useColors> }) {
  const initials = (name ?? '?').split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderSubtle }]}>
      <Text style={[styles.avatarInitials, { color: C.textMuted }]}>{initials}</Text>
    </View>
  );
}

// ─── Role picker modal ────────────────────────────────────────────────────────
function RolePickerModal({
  visible, user, roles, selectedRoleId, onSelect, onConfirm, onClose, isSaving, C,
}: {
  visible: boolean; user: any; roles: any[] | undefined; selectedRoleId: string | null;
  onSelect: (id: string) => void; onConfirm: () => void; onClose: () => void; isSaving: boolean;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Assign Role</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.iconSecondary} />
            </TouchableOpacity>
          </View>

          {user && (
            <View style={[styles.selectedUserCard, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput }]}>
              <UserAvatar uri={user.avatarUrl} name={user.name} size={36} C={C} />
              <View style={styles.selectedUserText}>
                <Text style={[styles.selectedUserName, { color: C.textPrimary }]}>{user.name}</Text>
                {user.username ? <Text style={[styles.selectedUserUsername, { color: C.textMuted }]}>@{user.username}</Text> : null}
              </View>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Select Role</Text>

          {roles === undefined ? (
            <ActivityIndicator color={C.actionPrimary} style={{ marginVertical: spacing.space4 }} />
          ) : (
            <ScrollView style={styles.roleList} showsVerticalScrollIndicator={false}>
              {roles.map(role => {
                const selected = selectedRoleId === role._id;
                return (
                  <TouchableOpacity
                    key={role._id}
                    style={[styles.rolePickerRow, selected && { backgroundColor: C.bgPrimarySubtle, borderWidth: 1, borderColor: C.borderFilled }]}
                    onPress={() => onSelect(role._id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={styles.rolePickerLeft}>
                      <Text style={[styles.rolePickerName, { color: C.textPrimary }, selected && { color: C.actionPrimary }]}>{role.name}</Text>
                      <Text style={[styles.rolePickerDesc, { color: C.textDisabled }]} numberOfLines={1}>{role.description}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={C.actionPrimary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.actionPrimary }, (!selectedRoleId || isSaving) && styles.btnDisabled]} onPress={onConfirm} disabled={!selectedRoleId || isSaving}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Assign Role</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderWidth: 1, borderColor: C.borderDefault }]} onPress={onClose}>
              <Text style={[styles.modalBtnCancelText, { color: C.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UserRoleAssignment() {
  const C = useColors();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const roles = useQuery(api.moderation.listModerationRoles);
  const searchResults = useQuery(
    api.profiles.searchProfiles,
    searchTerm.length >= 2 ? { query: searchTerm } : 'skip',
  );
  const assignRole = useMutation(api.moderation.assignRoleToUser);

  const openAssignModal = (user: any) => { setSelectedUser(user); setSelectedRoleId(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setSelectedUser(null); setSelectedRoleId(null); };

  const handleAssign = async () => {
    if (!selectedUser || !selectedRoleId) return;
    setIsSaving(true);
    try {
      await assignRole({ userId: selectedUser.userId as Id<'users'>, roleId: selectedRoleId as Id<'moderationRoles'> });
      closeModal();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to assign role'); }
    finally { setIsSaving(false); }
  };

  const renderUser = ({ item: user }: { item: any }) => (
    <View style={[styles.userRow, { borderBottomColor: C.borderSubtle }]}>
      <UserAvatar uri={user.avatarUrl} name={user.name} size={44} C={C} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: C.textPrimary }]}>{user.name}</Text>
        {user.username ? <Text style={[styles.userUsername, { color: C.textMuted }]}>@{user.username}</Text> : null}
      </View>
      <TouchableOpacity style={[styles.assignBtn, { backgroundColor: C.actionPrimary }]} onPress={() => openAssignModal(user)}>
        <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
        <Text style={styles.assignBtnText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>User Role Assignment</Text>

        {/* Search input */}
        <View style={[styles.searchWrap, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault }]}>
          <Ionicons name="search-outline" size={18} color={C.iconSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by username or name…"
            placeholderTextColor={C.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={C.iconSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results */}
        {searchTerm.length >= 2 && (
          <View style={[styles.resultsWrap, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
            {searchResults === undefined ? (
              <ActivityIndicator color={C.actionPrimary} style={{ marginVertical: spacing.space4 }} />
            ) : searchResults.length === 0 ? (
              <Text style={[styles.noResults, { color: C.textMuted }]}>No users found</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={u => u.userId}
                renderItem={renderUser}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: C.borderSubtle }]} />}
              />
            )}
          </View>
        )}

        {/* Info note */}
        <View style={[styles.infoRow, { backgroundColor: C.statusInfoBg, borderColor: C.isDark ? C.blueBorder : 'rgba(37,99,235,0.2)' }]}>
          <Ionicons name="information-circle-outline" size={16} color={C.statusInfo} />
          <Text style={[styles.infoText, { color: C.textMuted }]}>
            Search for a user above to assign them a moderation role.
          </Text>
        </View>
      </ScrollView>

      <RolePickerModal visible={showModal} user={selectedUser} roles={roles} selectedRoleId={selectedRoleId} onSelect={setSelectedRoleId} onConfirm={handleAssign} onClose={closeModal} isSaving={isSaving} C={C} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.screenPaddingH, paddingBottom: spacing.scrollBottomPadding },
  sectionTitle: { ...typeScale.headingLG, marginBottom: spacing.space4 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.radiusMD, borderWidth: 1,
    paddingHorizontal: spacing.space3, marginBottom: spacing.space4, minHeight: 48,
  },
  searchIcon: { marginRight: spacing.space2 },
  searchInput: { flex: 1, ...typeScale.bodyMD, paddingVertical: spacing.space3 },

  // Results
  resultsWrap: { borderRadius: radius.radiusLG, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.space4 },
  noResults: { ...typeScale.bodyMD, textAlign: 'center', padding: spacing.space6 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.space3, gap: spacing.space3 },
  userInfo: { flex: 1 },
  userName: { ...typeScale.headingSM, fontSize: 14 },
  userUsername: { ...typeScale.bodySM },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.radiusFull, paddingHorizontal: spacing.space3, paddingVertical: spacing.space2,
  },
  assignBtnText: { ...typeScale.labelSM, color: '#FFFFFF', fontWeight: '700' },
  separator: { height: 1, marginHorizontal: spacing.space3 },

  // Avatar fallback
  avatarFallback: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { ...typeScale.labelSM },

  // Info note
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2,
    padding: spacing.space3, borderRadius: radius.radiusMD, borderWidth: 1,
  },
  infoText: { ...typeScale.bodySM, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.space6, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space4 },
  modalTitle: { ...typeScale.headingMD },
  selectedUserCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, borderRadius: radius.radiusMD, padding: spacing.space3, marginBottom: spacing.space4 },
  selectedUserText: { flex: 1 },
  selectedUserName: { ...typeScale.headingSM, fontSize: 14 },
  selectedUserUsername: { ...typeScale.bodySM },
  fieldLabel: { ...typeScale.labelSM, marginBottom: spacing.space2 },
  roleList: { maxHeight: 280 },
  rolePickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.space3, paddingHorizontal: spacing.space3, borderRadius: radius.radiusMD, marginBottom: 4 },
  rolePickerLeft: { flex: 1, marginRight: spacing.space2 },
  rolePickerName: { ...typeScale.headingSM, fontSize: 14 },
  rolePickerDesc: { ...typeScale.caption, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space4 },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.space3, borderRadius: radius.radiusMD, minHeight: 48 },
  btnDisabled: { opacity: 0.4 },
  modalBtnPrimaryText: { ...typeScale.labelMD, color: '#FFFFFF', fontWeight: '700' },
  modalBtnCancelText: { ...typeScale.labelMD, fontWeight: '600' },
});
