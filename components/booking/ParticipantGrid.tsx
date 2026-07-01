/**
 * ParticipantGrid
 * Modal overlay showing all participants in a 2-column grid.
 * Tapping a tile focuses that participant in the main view.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ParticipantInfo {
  identity: string;
  name: string;
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

interface ParticipantGridProps {
  visible: boolean;
  participants: ParticipantInfo[];
  onFocus: (identity: string) => void;
  onClose: () => void;
}

// ─── Participant tile ─────────────────────────────────────────────────────────
function ParticipantTile({
  participant,
  onPress,
}: {
  participant: ParticipantInfo;
  onPress: () => void;
}) {
  const initial = (participant.name ?? participant.identity ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.tile, participant.isSpeaking && styles.tileSpeaking]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Focus on ${participant.name ?? participant.identity}`}
    >
      {/* Avatar / video placeholder */}
      <View style={styles.tileVideoPlaceholder}>
        <Text style={styles.tileInitial} allowFontScaling={false}>
          {initial}
        </Text>
      </View>

      {/* Speaking ring indicator */}
      {participant.isSpeaking && <View style={styles.speakingRing} pointerEvents="none" />}

      {/* Status icons overlay */}
      <View style={styles.tileStatusRow}>
        {!participant.isMicrophoneEnabled && (
          <View style={styles.tileStatusIcon}>
            <Ionicons name="mic-off" size={11} color="#FFFFFF" />
          </View>
        )}
        {!participant.isCameraEnabled && (
          <View style={styles.tileStatusIcon}>
            <Ionicons name="videocam-off" size={11} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Name bar */}
      <View style={styles.tileNameBar}>
        <Text style={styles.tileName} numberOfLines={1} allowFontScaling={false}>
          {participant.name ?? participant.identity}
          {participant.isLocal ? " (You)" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ParticipantGrid({
  visible,
  participants,
  onFocus,
  onClose,
}: ParticipantGridProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} allowFontScaling={false}>
              Participants ({participants.length})
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close participant grid"
            >
              <Ionicons name="close" size={24} color={Colors.iconPrimary} />
            </TouchableOpacity>
          </View>

          {/* Grid */}
          {participants.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={40} color={Colors.iconDisabled} />
              <Text style={styles.emptyText} allowFontScaling={false}>
                No other participants yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={participants}
              keyExtractor={(item) => item.identity}
              numColumns={2}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => (
                <ParticipantTile
                  participant={item}
                  onPress={() => {
                    onFocus(item.identity);
                    onClose();
                  }}
                />
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
  },
  emptyText: {
    ...typeScale.bodyMD,
    color: Colors.textDisabled,
  },

  // Grid
  gridContent: {
    padding: spacing.space3,
    gap: spacing.space3,
  },
  gridRow: {
    gap: spacing.space3,
  },

  // Tile
  tile: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    position: "relative",
  },
  tileSpeaking: {
    borderColor: Colors.statusSuccess,
    borderWidth: 2,
  },
  tileVideoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  tileInitial: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.actionPrimary,
  },
  speakingRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.radiusMD,
    borderWidth: 3,
    borderColor: Colors.statusSuccess,
  },
  tileStatusRow: {
    position: "absolute",
    top: spacing.space2,
    right: spacing.space2,
    flexDirection: "row",
    gap: 3,
  },
  tileStatusIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileNameBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: spacing.space2,
    paddingVertical: 5,
  },
  tileName: {
    ...typeScale.caption,
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
