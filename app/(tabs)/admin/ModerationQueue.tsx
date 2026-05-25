/**
 * ModerationQueue — React Native
 * Phase 3: FlatList of pending content with approve/reject actions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useCanApprove } from '@/app/hooks/usePermissions';
import { EmptyStateCard } from '@/components/ui/Card';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';
import { CONTENT_TYPES, CONTENT_TYPE_LABELS, ContentTypeValue } from '@/app/utils/permissions';

type FilterType = 'all' | ContentTypeValue;

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all',                          label: 'All' },
  { id: CONTENT_TYPES.ARTICLES,         label: 'Articles' },
  { id: CONTENT_TYPES.REELS,            label: 'Reels' },
  { id: CONTENT_TYPES.CIRCLES,          label: 'Circles' },
  { id: CONTENT_TYPES.EXPERT_REQUESTS,  label: 'Expert Requests' },
  { id: CONTENT_TYPES.BOOKING_SUBSCRIBERS, label: 'Booking Subscribers' },
];

const CONTENT_ICONS: Record<ContentTypeValue, keyof typeof Ionicons.glyphMap> = {
  articles:             'newspaper-outline',
  reels:                'videocam-outline',
  circles:              'people-outline',
  expertRequests:       'person-circle-outline',
  bookingSubscribers:   'calendar-outline',
};

export function ModerationQueue() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const canApproveArticles          = useCanApprove(CONTENT_TYPES.ARTICLES);
  const canApproveReels             = useCanApprove(CONTENT_TYPES.REELS);
  const canApproveCircles           = useCanApprove(CONTENT_TYPES.CIRCLES);
  const canApproveExpertRequests    = useCanApprove(CONTENT_TYPES.EXPERT_REQUESTS);
  const canApproveBookingSubscribers = useCanApprove(CONTENT_TYPES.BOOKING_SUBSCRIBERS);

  const queue = useQuery(
    api.moderationActions.getModerationQueue,
    selectedFilter === 'all' ? {} : { contentType: selectedFilter },
  );

  const approveContent = useMutation(api.moderationActions.approveContent);
  const rejectContent  = useMutation(api.moderationActions.rejectContent);

  const canApproveType = (type: string): boolean => {
    switch (type) {
      case CONTENT_TYPES.ARTICLES:             return !!canApproveArticles;
      case CONTENT_TYPES.REELS:                return !!canApproveReels;
      case CONTENT_TYPES.CIRCLES:              return !!canApproveCircles;
      case CONTENT_TYPES.EXPERT_REQUESTS:      return !!canApproveExpertRequests;
      case CONTENT_TYPES.BOOKING_SUBSCRIBERS:  return !!canApproveBookingSubscribers;
      default: return false;
    }
  };

  const visibleFilters = FILTERS.filter(f => {
    if (f.id === 'all') return true;
    return canApproveType(f.id);
  });

  const handleApprove = async (item: any) => {
    try {
      await approveContent({ contentType: item.contentType, contentId: item.contentId });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve content');
    }
  };

  const openRejectModal = (item: any) => {
    setRejectTarget(item);
    setRejectReason('');
  };

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectReason('');
    setIsRejecting(false);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection.');
      return;
    }
    setIsRejecting(true);
    try {
      await rejectContent({
        contentType: rejectTarget.contentType,
        contentId:   rejectTarget.contentId,
        reason:      rejectReason.trim(),
      });
      closeRejectModal();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject content');
    } finally {
      setIsRejecting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = CONTENT_ICONS[item.contentType as ContentTypeValue] ?? 'document-outline';
    const label = CONTENT_TYPE_LABELS[item.contentType as ContentTypeValue] ?? item.contentType;
    const canAct = canApproveType(item.contentType);

    return (
      <View style={styles.itemCard}>
        {/* Top row: badge + date */}
        <View style={styles.itemTopRow}>
          <View style={styles.typeBadge}>
            <Ionicons name={icon} size={12} color={Colors.palette.purple} />
            <Text style={styles.typeBadgeText}>{label}</Text>
          </View>
          <Text style={styles.itemDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Submitter */}
        <Text style={styles.itemSubmitter}>
          Submitted by{' '}
          <Text style={styles.itemSubmitterName}>
            {item.submitter?.username
              ? `@${item.submitter.username}`
              : item.submitter?.name ?? 'Unknown'}
          </Text>
        </Text>

        {/* Content ID */}
        <Text style={styles.itemId} numberOfLines={1}>
          ID: {item.contentId}
        </Text>

        {/* Actions */}
        {canAct && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApprove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Approve ${label}`}
            >
              <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => openRejectModal(item)}
              accessibilityRole="button"
              accessibilityLabel={`Reject ${label}`}
            >
              <Ionicons name="close" size={14} color={Colors.textPrimary} />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Filter pills */}
      <FlatList
        data={visibleFilters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={f => f.id}
        contentContainerStyle={styles.filterBar}
        renderItem={({ item: f }) => {
          const active = selectedFilter === f.id;
          return (
            <TouchableOpacity
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setSelectedFilter(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Queue list */}
      {queue === undefined ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.actionPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={item => `${item.contentType}-${item.contentId}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateCard
              icon="mail-open-outline"
              title="Queue is Empty"
              subtitle="No pending content to review"
              style={styles.emptyState}
            />
          }
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={!!rejectTarget}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Content</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason. The creator will be notified.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter rejection reason…"
              placeholderTextColor={Colors.textDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Rejection reason"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnReject,
                  (!rejectReason.trim() || isRejecting) && styles.modalBtnDisabled,
                ]}
                onPress={handleReject}
                disabled={!rejectReason.trim() || isRejecting}
                accessibilityRole="button"
                accessibilityLabel="Confirm rejection"
              >
                {isRejecting ? (
                  <ActivityIndicator color={Colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.modalBtnText}>Reject</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={closeRejectModal}
                accessibilityRole="button"
                accessibilityLabel="Cancel rejection"
              >
                <Text style={[styles.modalBtnText, { color: Colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  filterBar: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.space3,
    gap: spacing.space2,
  },
  filterPill: {
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  filterPillText: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    color: Colors.textPrimary,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: spacing.scrollBottomPadding,
  },
  emptyState: {
    marginTop: spacing.space10,
  },

  // Item card
  itemCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.purpleSurface,
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space2,
    paddingVertical: 3,
  },
  typeBadgeText: {
    ...typeScale.caption,
    color: Colors.palette.purple,
    fontWeight: '600',
  },
  itemDate: {
    ...typeScale.caption,
    color: Colors.textDisabled,
  },
  itemSubmitter: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  itemSubmitterName: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  itemId: {
    ...typeScale.caption,
    color: Colors.textDisabled,
    marginBottom: spacing.space3,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.space2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.space2,
    borderRadius: radius.radiusMD,
  },
  approveBtn: {
    backgroundColor: Colors.statusSuccess,
  },
  rejectBtn: {
    backgroundColor: Colors.statusDanger,
  },
  actionBtnText: {
    ...typeScale.labelSM,
    color: Colors.textPrimary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPaddingH,
  },
  modalCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space6,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginBottom: spacing.space2,
  },
  modalSubtitle: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    marginBottom: spacing.space4,
  },
  modalInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    color: Colors.textPrimary,
    padding: spacing.space3,
    minHeight: 100,
    ...typeScale.bodyMD,
    marginBottom: spacing.space4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space3,
    borderRadius: radius.radiusMD,
    minHeight: 44,
  },
  modalBtnReject: {
    backgroundColor: Colors.statusDanger,
  },
  modalBtnCancel: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
  modalBtnText: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },
});
