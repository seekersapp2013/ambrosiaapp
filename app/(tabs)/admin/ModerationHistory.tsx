/**
 * ModerationHistory — React Native
 * Phase 4: FlatList of moderation actions with filter pills and load-more.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { EmptyStateCard } from '@/components/ui/Card';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { radius } from '@/tokens/radius';

type ActionFilter = 'all' | 'APPROVE' | 'REJECT' | 'BAN' | 'ASSIGN_ROLE';

const FILTERS: { id: ActionFilter; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'APPROVE',     label: 'Approvals' },
  { id: 'REJECT',      label: 'Rejections' },
  { id: 'BAN',         label: 'Bans' },
  { id: 'ASSIGN_ROLE', label: 'Role Changes' },
];

interface ActionStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ACTION_STYLES: Record<string, ActionStyle> = {
  APPROVE:         { icon: 'checkmark-circle-outline', color: Colors.statusSuccess },
  REJECT:          { icon: 'close-circle-outline',     color: Colors.statusDanger  },
  BAN:             { icon: 'ban-outline',              color: Colors.statusDanger  },
  UNBAN:           { icon: 'checkmark-done-circle-outline', color: Colors.statusSuccess },
  ASSIGN_ROLE:     { icon: 'person-add-outline',       color: Colors.statusInfo    },
  REMOVE_ROLE:     { icon: 'person-remove-outline',    color: Colors.statusWarning },
  UPDATE_SETTINGS: { icon: 'settings-outline',         color: Colors.palette.purple },
  CREATE_ROLE:     { icon: 'add-circle-outline',       color: Colors.statusInfo    },
  DELETE_ROLE:     { icon: 'trash-outline',            color: Colors.statusDanger  },
};

const ACTION_LABELS: Record<string, string> = {
  APPROVE:         'Approved',
  REJECT:          'Rejected',
  BAN:             'Banned User',
  UNBAN:           'Unbanned User',
  ASSIGN_ROLE:     'Assigned Role',
  REMOVE_ROLE:     'Removed Role',
  UPDATE_SETTINGS: 'Updated Settings',
  CREATE_ROLE:     'Created Role',
  DELETE_ROLE:     'Deleted Role',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function ModerationHistory() {
  const [selectedFilter, setSelectedFilter] = useState<ActionFilter>('all');
  const [limit, setLimit] = useState(50);

  const history = useQuery(
    api.moderationActions.getModerationHistory,
    selectedFilter === 'all'
      ? { limit }
      : { limit, actionType: selectedFilter },
  );

  const renderItem = ({ item }: { item: any }) => {
    const style = ACTION_STYLES[item.actionType] ?? {
      icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
      color: Colors.textMuted,
    };
    const label = ACTION_LABELS[item.actionType] ?? item.actionType;

    return (
      <View style={styles.itemCard}>
        <View style={[styles.iconWrap, { backgroundColor: `${style.color}18` }]}>
          <Ionicons name={style.icon} size={20} color={style.color} />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemLabel}>{label}</Text>
            {item.performerRoleName ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{item.performerRoleName}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.itemPerformer}>
            By{' '}
            <Text style={styles.itemPerformerName}>
              {item.performer?.username
                ? `@${item.performer.username}`
                : item.performer?.name ?? 'Unknown'}
            </Text>
          </Text>
          {item.reason ? (
            <Text style={styles.itemReason} numberOfLines={2}>
              {item.reason}
            </Text>
          ) : null}
          <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  const ListFooter =
    history && history.length >= limit ? (
      <TouchableOpacity
        style={styles.loadMoreBtn}
        onPress={() => setLimit(prev => prev + 50)}
        accessibilityRole="button"
        accessibilityLabel="Load more history"
      >
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    ) : null;

  return (
    <View style={styles.root}>
      {/* Filter pills */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={f => f.id}
        style={styles.filterBarList}
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

      {/* History list */}
      {history === undefined ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.actionPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <EmptyStateCard
              icon="time-outline"
              title="No History Yet"
              subtitle="Moderation actions will appear here"
              style={styles.emptyState}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  filterBarList: {
    flexGrow: 0,
    flexShrink: 0,
    height: 48,
  },
  filterBar: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: spacing.space3,
    paddingVertical: 6,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  filterPillText: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
    lineHeight: 16,
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
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
    gap: spacing.space3,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    flexWrap: 'wrap',
  },
  itemLabel: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: Colors.purpleSurface,
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space2,
    paddingVertical: 2,
  },
  roleBadgeText: {
    ...typeScale.caption,
    color: Colors.palette.purple,
    fontWeight: '600',
  },
  itemPerformer: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  itemPerformerName: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  itemReason: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  itemDate: {
    ...typeScale.caption,
    color: Colors.textDisabled,
  },

  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.space4,
  },
  loadMoreText: {
    ...typeScale.labelMD,
    color: Colors.actionPrimary,
  },
});
