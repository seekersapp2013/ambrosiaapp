/**
 * ModerationHistory — React Native
 * Phase 4 + Light/Dark mode overhaul
 * FlatList of moderation actions with filter pills and load-more.
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
import { useColors } from '@/hooks/useColors';
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

function getActionStyles(C: ReturnType<typeof useColors>): Record<string, ActionStyle> {
  return {
    APPROVE:         { icon: 'checkmark-circle-outline', color: C.statusSuccess },
    REJECT:          { icon: 'close-circle-outline',     color: C.statusDanger  },
    BAN:             { icon: 'ban-outline',              color: C.statusDanger  },
    UNBAN:           { icon: 'checkmark-done-circle-outline', color: C.statusSuccess },
    ASSIGN_ROLE:     { icon: 'person-add-outline',       color: C.statusInfo    },
    REMOVE_ROLE:     { icon: 'person-remove-outline',    color: C.statusWarning },
    UPDATE_SETTINGS: { icon: 'settings-outline',         color: C.palette.purple },
    CREATE_ROLE:     { icon: 'add-circle-outline',       color: C.statusInfo    },
    DELETE_ROLE:     { icon: 'trash-outline',            color: C.statusDanger  },
  };
}

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
  const C = useColors();
  const [selectedFilter, setSelectedFilter] = useState<ActionFilter>('all');
  const [limit, setLimit] = useState(50);

  const ACTION_STYLES = getActionStyles(C);

  const history = useQuery(
    api.moderationActions.getModerationHistory,
    selectedFilter === 'all'
      ? { limit }
      : { limit, actionType: selectedFilter },
  );

  const renderItem = ({ item }: { item: any }) => {
    const style = ACTION_STYLES[item.actionType] ?? {
      icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
      color: C.textMuted,
    };
    const label = ACTION_LABELS[item.actionType] ?? item.actionType;

    return (
      <View style={[styles.itemCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${style.color}18` }]}>
          <Ionicons name={style.icon} size={20} color={style.color} />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemTopRow}>
            <Text style={[styles.itemLabel, { color: C.textPrimary }]}>{label}</Text>
            {item.performerRoleName ? (
              <View style={[styles.roleBadge, { backgroundColor: C.isDark ? C.purpleSurface : 'rgba(139,92,246,0.08)' }]}>
                <Text style={[styles.roleBadgeText, { color: C.palette.purple }]}>{item.performerRoleName}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.itemPerformer, { color: C.textMuted }]}>
            By{' '}
            <Text style={[styles.itemPerformerName, { color: C.textPrimary }]}>
              {item.performer?.username
                ? `@${item.performer.username}`
                : item.performer?.name ?? 'Unknown'}
            </Text>
          </Text>
          {item.reason ? (
            <Text style={[styles.itemReason, { color: C.textMuted }]} numberOfLines={2}>
              {item.reason}
            </Text>
          ) : null}
          <Text style={[styles.itemDate, { color: C.textDisabled }]}>{formatDate(item.createdAt)}</Text>
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
        <Text style={[styles.loadMoreText, { color: C.actionPrimary }]}>Load More</Text>
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
              style={[
                styles.filterPill,
                { backgroundColor: C.isDark ? C.bgElevated : C.bgInput, borderColor: C.borderSubtle },
                active && { backgroundColor: C.actionPrimary, borderColor: C.actionPrimary },
              ]}
              onPress={() => setSelectedFilter(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterPillText, { color: C.textMuted }, active && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* History list */}
      {history === undefined ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={C.actionPrimary} size="large" />
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
  root: { flex: 1 },

  // Filter bar
  filterBarList: { flexGrow: 0, flexShrink: 0, height: 48 },
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
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: { ...typeScale.labelSM, lineHeight: 16 },
  filterPillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: spacing.scrollBottomPadding,
  },
  emptyState: { marginTop: spacing.space10 },

  // Item card
  itemCard: {
    flexDirection: 'row',
    borderRadius: radius.radiusLG,
    borderWidth: 1,
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
  itemBody: { flex: 1, gap: 4 },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    flexWrap: 'wrap',
  },
  itemLabel: { ...typeScale.headingSM, fontSize: 14 },
  roleBadge: {
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space2,
    paddingVertical: 2,
  },
  roleBadgeText: { ...typeScale.caption, fontWeight: '600' },
  itemPerformer: { ...typeScale.bodySM },
  itemPerformerName: { fontWeight: '600' },
  itemReason: { ...typeScale.bodySM },
  itemDate: { ...typeScale.caption },

  // Load more
  loadMoreBtn: { alignItems: 'center', paddingVertical: spacing.space4 },
  loadMoreText: { ...typeScale.labelMD, fontWeight: '700' },
});
