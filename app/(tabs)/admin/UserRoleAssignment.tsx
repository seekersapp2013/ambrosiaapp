/**
 * UserRoleAssignment — React Native
 * Phase 7: User search + custom role picker Modal.
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
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

// ─── Avatar with initials fallback ───────────────────────────────────────────
function UserAvatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const initials = (name ?? '?')
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

// ─── Role picker modal ────────────────────────────────────────────────────────
function RolePickerModal({
  visible,
  user,
  roles,
  selectedRoleId,
  onSelect,
  onConfirm,
  onClose,
  isSaving,
}: {
  visible: boolean;
  user: any;
  roles: any[] | undefined;
  selectedRoleId: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Role</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={Colors.iconSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selected user info */}
          {user && (
            <View style={styles.selectedUserCard}>
              <UserAvatar uri={user.avatarUrl} name={user.name} size={36} />
              <View style={styles.selectedUserText}>
                <Text style={styles.selectedUserName}>{user.name}</Text>
                {user.username ? (
                  <Text style={styles.selectedUserUsername}>@{user.username}</Text>
                ) : null}
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>Select Role</Text>

          {roles === undefined ? (
            <ActivityIndicator color={Colors.actionPrimary} style={{ marginVertical: spacing.space4 }} />
          ) : (
            <ScrollView style={styles.roleList} showsVerticalScrollIndicator={false}>
              {roles.map(role => {
                const selected = selectedRoleId === role._id;
                return (
                  <TouchableOpacity
                    key={role._id}
                    style={[styles.rolePickerRow, selected && styles.rolePickerRowSelected]}
                    onPress={() => onSelect(role._id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={role.name}
                  >
                    <View style={styles.rolePickerLeft}>
                      <Text style={[styles.rolePickerName, selected && styles.rolePickerNameSelected]}>
                        {role.name}
                      </Text>
                      <Text style={styles.rolePickerDesc} numberOfLines={1}>
                        {role.description}
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.actionPrimary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                styles.modalBtnPrimary,
                (!selectedRoleId || isSaving) && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={!selectedRoleId || isSaving}
              accessibilityRole="button"
              accessibilityLabel="Assign role"
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.modalBtnText}>Assign Role</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[styles.modalBtnText, { color: Colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UserRoleAssignment() {
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

  const openAssignModal = (user: any) => {
    setSelectedUser(user);
    setSelectedRoleId(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setSelectedRoleId(null);
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedRoleId) return;
    setIsSaving(true);
    try {
      await assignRole({
        userId: selectedUser.userId as Id<'users'>,
        roleId: selectedRoleId as Id<'moderationRoles'>,
      });
      closeModal();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to assign role');
    } finally {
      setIsSaving(false);
    }
  };

  const renderUser = ({ item: user }: { item: any }) => (
    <View style={styles.userRow}>
      <UserAvatar uri={user.avatarUrl} name={user.name} size={44} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        {user.username ? (
          <Text style={styles.userUsername}>@{user.username}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.assignBtn}
        onPress={() => openAssignModal(user)}
        accessibilityRole="button"
        accessibilityLabel={`Assign role to ${user.name}`}
      >
        <Ionicons name="person-add-outline" size={14} color={Colors.textPrimary} />
        <Text style={styles.assignBtnText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>User Role Assignment</Text>

        {/* Search input */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.iconSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by username or name…"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search users"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchTerm('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={Colors.iconSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results */}
        {searchTerm.length >= 2 && (
          <View style={styles.resultsWrap}>
            {searchResults === undefined ? (
              <ActivityIndicator
                color={Colors.actionPrimary}
                style={{ marginVertical: spacing.space4 }}
              />
            ) : searchResults.length === 0 ? (
              <Text style={styles.noResults}>No users found</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={u => u.userId}
                renderItem={renderUser}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}

        {/* Info note */}
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
          <Text style={styles.infoText}>
            Search for a user above to assign them a moderation role.
          </Text>
        </View>
      </ScrollView>

      <RolePickerModal
        visible={showModal}
        user={selectedUser}
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelect={setSelectedRoleId}
        onConfirm={handleAssign}
        onClose={closeModal}
        isSaving={isSaving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPaddingH,
    paddingBottom: spacing.scrollBottomPadding,
  },
  sectionTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    marginBottom: spacing.space4,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    paddingHorizontal: spacing.space3,
    marginBottom: spacing.space4,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing.space2,
  },
  searchInput: {
    flex: 1,
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    paddingVertical: spacing.space3,
  },

  // Results
  resultsWrap: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.space4,
  },
  noResults: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: spacing.space6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space3,
    gap: spacing.space3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  userUsername: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
  },
  assignBtnText: {
    ...typeScale.labelSM,
    color: Colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: spacing.space3,
  },

  // Avatar fallback
  avatarFallback: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
  },

  // Info note
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
    padding: spacing.space3,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  infoText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    flex: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: radius.radius2XL,
    borderTopRightRadius: radius.radius2XL,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space6,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space4,
  },
  modalTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    padding: spacing.space3,
    marginBottom: spacing.space4,
  },
  selectedUserText: {
    flex: 1,
  },
  selectedUserName: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  selectedUserUsername: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  fieldLabel: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
    marginBottom: spacing.space2,
  },
  roleList: {
    maxHeight: 280,
  },
  rolePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space3,
    borderRadius: radius.radiusMD,
    marginBottom: 4,
  },
  rolePickerRowSelected: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
  },
  rolePickerLeft: {
    flex: 1,
    marginRight: spacing.space2,
  },
  rolePickerName: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rolePickerNameSelected: {
    color: Colors.actionPrimary,
  },
  rolePickerDesc: {
    ...typeScale.caption,
    color: Colors.textDisabled,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginTop: spacing.space4,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space3,
    borderRadius: radius.radiusMD,
    minHeight: 48,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.actionPrimary,
  },
  modalBtnCancel: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  modalBtnText: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },
});
