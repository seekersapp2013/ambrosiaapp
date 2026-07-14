/**
 * UserManagement — Admin User Management Screen
 * Lists all users with search, ban/unban, and hard delete capabilities.
 * Matches the existing admin panel design language.
 */

import React, { useState, useCallback } from 'react';
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
function UserAvatar({ uri, name, size = 44, C }: { uri?: string | null; name?: string; size?: number; C: ReturnType<typeof useColors> }) {
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

// ─── Ban Modal ────────────────────────────────────────────────────────────────
function BanModal({
  visible, user, onClose, onConfirm, isSaving, C,
}: {
  visible: boolean; user: any; onClose: () => void; onConfirm: (reason: string, banType: string, expiresAt?: number) => void;
  isSaving: boolean; C: ReturnType<typeof useColors>;
}) {
  const [reason, setReason] = useState('');
  const [banType, setBanType] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');
  const [durationDays, setDurationDays] = useState('7');

  const handleConfirm = () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the ban.');
      return;
    }
    const expiresAt = banType === 'TEMPORARY'
      ? Date.now() + parseInt(durationDays, 10) * 24 * 60 * 60 * 1000
      : undefined;
    onConfirm(reason.trim(), banType, expiresAt);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Ban User</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.iconSecondary} />
            </TouchableOpacity>
          </View>

          {user && (
            <View style={[styles.selectedUserCard, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput }]}>
              <UserAvatar uri={user.avatarUrl} name={user.name} size={36} C={C} />
              <View style={styles.selectedUserText}>
                <Text style={[styles.selectedUserName, { color: C.textPrimary }]}>{user.name || 'Unknown'}</Text>
                <Text style={[styles.selectedUserUsername, { color: C.textMuted }]}>@{user.username}</Text>
              </View>
            </View>
          )}

          {/* Ban type */}
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Ban Type</Text>
          <View style={styles.banTypeRow}>
            <TouchableOpacity
              style={[styles.banTypeBtn, banType === 'PERMANENT' && { backgroundColor: C.bgPrimarySubtle, borderColor: C.borderFilled, borderWidth: 1 }]}
              onPress={() => setBanType('PERMANENT')}
            >
              <Text style={[styles.banTypeBtnText, { color: banType === 'PERMANENT' ? C.actionPrimary : C.textSecondary }]}>Permanent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.banTypeBtn, banType === 'TEMPORARY' && { backgroundColor: C.bgPrimarySubtle, borderColor: C.borderFilled, borderWidth: 1 }]}
              onPress={() => setBanType('TEMPORARY')}
            >
              <Text style={[styles.banTypeBtnText, { color: banType === 'TEMPORARY' ? C.actionPrimary : C.textSecondary }]}>Temporary</Text>
            </TouchableOpacity>
          </View>

          {banType === 'TEMPORARY' && (
            <View style={styles.durationRow}>
              <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Duration (days)</Text>
              <TextInput
                style={[styles.durationInput, { color: C.textPrimary, backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault }]}
                value={durationDays}
                onChangeText={setDurationDays}
                keyboardType="number-pad"
                placeholder="7"
                placeholderTextColor={C.textDisabled}
              />
            </View>
          )}

          {/* Reason */}
          <Text style={[styles.fieldLabel, { color: C.textMuted, marginTop: spacing.space3 }]}>Reason *</Text>
          <TextInput
            style={[styles.reasonInput, { color: C.textPrimary, backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this user being banned?"
            placeholderTextColor={C.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#DC2626' }, (!reason.trim() || isSaving) && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={!reason.trim() || isSaving}
            >
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Ban User</Text>}
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

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  visible, user, onClose, onConfirm, isSaving, C,
}: {
  visible: boolean; user: any; onClose: () => void; onConfirm: (confirmUsername: string) => void;
  isSaving: boolean; C: ReturnType<typeof useColors>;
}) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText.toLowerCase() !== user?.username?.toLowerCase()) {
      Alert.alert('Error', 'Username does not match. Please type the exact username.');
      return;
    }
    onConfirm(confirmText);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Delete User Permanently</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.iconSecondary} />
            </TouchableOpacity>
          </View>

          {user && (
            <View style={[styles.selectedUserCard, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput }]}>
              <UserAvatar uri={user.avatarUrl} name={user.name} size={36} C={C} />
              <View style={styles.selectedUserText}>
                <Text style={[styles.selectedUserName, { color: C.textPrimary }]}>{user.name || 'Unknown'}</Text>
                <Text style={[styles.selectedUserUsername, { color: C.textMuted }]}>@{user.username}</Text>
              </View>
            </View>
          )}

          <View style={[styles.warningBox, { backgroundColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.3)' }]}>
            <Ionicons name="warning" size={18} color="#DC2626" />
            <Text style={[styles.warningText, { color: C.textPrimary }]}>
              This will permanently delete this user and ALL their content including articles, reels, comments, likes, claps, messages, and all other data. This action cannot be undone.
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: C.textMuted, marginTop: spacing.space3 }]}>
            Type <Text style={{ fontWeight: '700' }}>@{user?.username}</Text> to confirm
          </Text>
          <TextInput
            style={[styles.reasonInput, { color: C.textPrimary, backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault, height: 48 }]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={`@${user?.username ?? ''}`}
            placeholderTextColor={C.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#DC2626' }, (confirmText.toLowerCase() !== (user?.username?.toLowerCase() ?? '---') || isSaving) && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={confirmText.toLowerCase() !== (user?.username?.toLowerCase() ?? '---') || isSaving}
            >
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Delete Permanently</Text>}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export function UserManagement() {
  const C = useColors();
  const [searchTerm, setSearchTerm] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Modals
  const [banModalUser, setBanModalUser] = useState<any>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const usersResult = useQuery(api.adminUsers.listAllUsers, {
    searchQuery: searchTerm.length >= 2 ? searchTerm : undefined,
    limit: 50,
    cursor,
  });

  // Mutations
  const banUser = useMutation(api.moderationActions.banUser);
  const unbanUser = useMutation(api.moderationActions.unbanUser);
  const hardDeleteUser = useMutation(api.adminUsers.hardDeleteUser);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleBan = async (reason: string, banType: string, expiresAt?: number) => {
    if (!banModalUser) return;
    setIsSaving(true);
    try {
      await banUser({
        userId: banModalUser.userId as Id<'users'>,
        reason,
        banType,
        expiresAt,
      });
      Alert.alert('Success', `User @${banModalUser.username} has been banned.`);
      setBanModalUser(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to ban user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnban = async (user: any) => {
    Alert.alert(
      'Unban User',
      `Are you sure you want to unban @${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: async () => {
            try {
              await unbanUser({ userId: user.userId as Id<'users'> });
              Alert.alert('Success', `User @${user.username} has been unbanned.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to unban user');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (confirmUsername: string) => {
    if (!deleteModalUser) return;
    setIsSaving(true);
    try {
      const result = await hardDeleteUser({
        userId: deleteModalUser.userId as Id<'users'>,
        confirmUsername,
      });
      Alert.alert('Deleted', result.message);
      setDeleteModalUser(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete user');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString();
  };

  // ─── User row ─────────────────────────────────────────────────────────────
  const renderUser = ({ item: user }: { item: any }) => (
    <View style={[styles.userRow, { borderBottomColor: C.borderSubtle }]}>
      <UserAvatar uri={user.avatarUrl} name={user.name} size={44} C={C} />
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1}>{user.name || 'Unknown'}</Text>
          {user.isBanned && (
            <View style={[styles.bannedBadge, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="ban" size={10} color="#DC2626" />
              <Text style={styles.bannedBadgeText}>Banned</Text>
            </View>
          )}
        </View>
        <Text style={[styles.userUsername, { color: C.textMuted }]}>@{user.username}</Text>
        <Text style={[styles.userJoined, { color: C.textDisabled }]}>Joined {formatDate(user.joinedAt)}</Text>
      </View>
      <View style={styles.userActions}>
        {user.isBanned ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.statusSuccessBg }]}
            onPress={() => handleUnban(user)}
            accessibilityLabel="Unban user"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={C.statusSuccess} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.statusWarningBg }]}
            onPress={() => setBanModalUser(user)}
            accessibilityLabel="Ban user"
          >
            <Ionicons name="ban" size={16} color={C.statusWarning} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'rgba(220,38,38,0.08)' }]}
          onPress={() => setDeleteModalUser(user)}
          accessibilityLabel="Delete user"
        >
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const loadMore = () => {
    if (usersResult?.nextCursor) {
      setCursor(usersResult.nextCursor);
    }
  };

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderDefault }]}>
        <Ionicons name="search-outline" size={18} color={C.iconSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: C.textPrimary }]}
          value={searchTerm}
          onChangeText={(text) => { setSearchTerm(text); setCursor(undefined); }}
          placeholder="Search by username or name…"
          placeholderTextColor={C.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchTerm(''); setCursor(undefined); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={C.iconSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Total count */}
      {usersResult && (
        <View style={styles.countRow}>
          <Text style={[styles.countText, { color: C.textMuted }]}>
            {usersResult.totalCount} user{usersResult.totalCount !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* User list */}
      {usersResult === undefined ? (
        <ActivityIndicator color={C.actionPrimary} style={{ marginTop: spacing.space6 }} />
      ) : usersResult.users.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={C.iconSecondary} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>
            {searchTerm.length >= 2 ? 'No users match your search' : 'No users found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={usersResult.users}
          keyExtractor={(u) => u.userId}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: C.borderSubtle }]} />}
          ListFooterComponent={
            usersResult.nextCursor ? (
              <TouchableOpacity style={[styles.loadMoreBtn, { borderColor: C.borderDefault }]} onPress={loadMore}>
                <Text style={[styles.loadMoreText, { color: C.actionPrimary }]}>Load More</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Ban Modal */}
      <BanModal
        visible={!!banModalUser}
        user={banModalUser}
        onClose={() => setBanModalUser(null)}
        onConfirm={handleBan}
        isSaving={isSaving}
        C={C}
      />

      {/* Delete Modal */}
      <DeleteModal
        visible={!!deleteModalUser}
        user={deleteModalUser}
        onClose={() => setDeleteModalUser(null)}
        onConfirm={handleDelete}
        isSaving={isSaving}
        C={C}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.screenPaddingH },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.radiusMD, borderWidth: 1,
    paddingHorizontal: spacing.space3, marginBottom: spacing.space2, minHeight: 48,
  },
  searchIcon: { marginRight: spacing.space2 },
  searchInput: { flex: 1, ...typeScale.bodyMD, paddingVertical: spacing.space3 },

  // Count
  countRow: { paddingVertical: spacing.space2 },
  countText: { ...typeScale.caption },

  // List
  listContent: { paddingBottom: spacing.scrollBottomPadding },
  separator: { height: 1, marginLeft: 60 },

  // User row
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.space3, gap: spacing.space3 },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { ...typeScale.headingSM, fontSize: 14, flexShrink: 1 },
  userUsername: { ...typeScale.bodySM, marginTop: 1 },
  userJoined: { ...typeScale.caption, marginTop: 1 },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Banned badge
  bannedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  bannedBadgeText: { fontSize: 9, fontWeight: '700', color: '#DC2626' },

  // Empty state
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.space8, gap: spacing.space3 },
  emptyText: { ...typeScale.bodyMD, textAlign: 'center' },

  // Load more
  loadMoreBtn: {
    alignItems: 'center', padding: spacing.space3,
    marginTop: spacing.space3, borderRadius: radius.radiusMD, borderWidth: 1,
  },
  loadMoreText: { ...typeScale.labelMD, fontWeight: '600' },

  // Avatar fallback
  avatarFallback: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { ...typeScale.labelSM },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.space6, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space4 },
  modalTitle: { ...typeScale.headingMD },
  selectedUserCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, borderRadius: radius.radiusMD, padding: spacing.space3, marginBottom: spacing.space4 },
  selectedUserText: { flex: 1 },
  selectedUserName: { ...typeScale.headingSM, fontSize: 14 },
  selectedUserUsername: { ...typeScale.bodySM },
  fieldLabel: { ...typeScale.labelSM, marginBottom: spacing.space2 },

  // Ban type
  banTypeRow: { flexDirection: 'row', gap: spacing.space2, marginBottom: spacing.space2 },
  banTypeBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.space3, borderRadius: radius.radiusMD },
  banTypeBtnText: { ...typeScale.labelMD, fontWeight: '600' },
  durationRow: { marginBottom: spacing.space2 },
  durationInput: {
    borderWidth: 1, borderRadius: radius.radiusMD,
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space2, ...typeScale.bodyMD,
  },

  // Reason input
  reasonInput: {
    borderWidth: 1, borderRadius: radius.radiusMD,
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space3,
    ...typeScale.bodyMD, minHeight: 80,
  },

  // Warning box
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2,
    padding: spacing.space3, borderRadius: radius.radiusMD, borderWidth: 1,
  },
  warningText: { ...typeScale.bodySM, flex: 1 },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space4 },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.space3, borderRadius: radius.radiusMD, minHeight: 48 },
  btnDisabled: { opacity: 0.4 },
  modalBtnPrimaryText: { ...typeScale.labelMD, color: '#FFFFFF', fontWeight: '700' },
  modalBtnCancelText: { ...typeScale.labelMD, fontWeight: '600' },
});
