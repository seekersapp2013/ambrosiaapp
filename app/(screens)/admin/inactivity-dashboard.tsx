import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TierBadge } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function AdminInactivityDashboardScreen() {
  const router = useRouter();
  const summary = useQuery(api.inactivityDashboard.getInactivitySummary);

  const [activeTab, setActiveTab] = useState<"90" | "180" | "365">("90");
  const [roleFilter, setRoleFilter] = useState<"providers" | "users">("providers");

  if (summary === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
        <Text style={styles.loadingText}>Loading Inactivity Dashboard...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Admin Access Required</Text>
        <Text style={styles.errorSub}>You do not have permission to view inactivity reports.</Text>
      </View>
    );
  }

  const getList = () => {
    if (roleFilter === "providers") {
      if (activeTab === "90") return summary.providers.inactivity90Days;
      if (activeTab === "180") return summary.providers.inactivity180Days;
      return summary.providers.inactivity365Days;
    } else {
      if (activeTab === "90") return summary.users.inactivity90Days;
      if (activeTab === "180") return summary.users.inactivity180Days;
      return summary.users.inactivity365Days;
    }
  };

  const listData = getList();

  return (
    <View style={styles.screen}>
      {/* Nav Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Inactivity Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Role Selector (Providers vs Users) */}
      <View style={styles.roleBar}>
        <TouchableOpacity
          style={[styles.roleBtn, roleFilter === "providers" && styles.roleBtnActive]}
          onPress={() => setRoleFilter("providers")}
        >
          <Ionicons name="medkit-outline" size={16} color={roleFilter === "providers" ? "#00BFA6" : "#9CA3AF"} />
          <Text style={[styles.roleText, roleFilter === "providers" && styles.roleTextActive]}>
            Providers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleBtn, roleFilter === "users" && styles.roleBtnActive]}
          onPress={() => setRoleFilter("users")}
        >
          <Ionicons name="people-outline" size={16} color={roleFilter === "users" ? "#00BFA6" : "#9CA3AF"} />
          <Text style={[styles.roleText, roleFilter === "users" && styles.roleTextActive]}>
            Patients / Users
          </Text>
        </TouchableOpacity>
      </View>

      {/* Threshold Tabs (90, 180, 365 Days) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "90" && styles.tabBtnActive]}
          onPress={() => setActiveTab("90")}
        >
          <Text style={[styles.tabText, activeTab === "90" && styles.tabTextActive]}>
            90 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "180" && styles.tabBtnActive]}
          onPress={() => setActiveTab("180")}
        >
          <Text style={[styles.tabText, activeTab === "180" && styles.tabTextActive]}>
            180 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "365" && styles.tabBtnActive]}
          onPress={() => setActiveTab("365")}
        >
          <Text style={[styles.tabText, activeTab === "365" && styles.tabTextActive]}>
            365 Days (Risk)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsSummaryBox}>
          <Text style={styles.statsSummaryTitle}>
            Inactivity Report: {activeTab} Days Filter ({roleFilter.toUpperCase()})
          </Text>
          <Text style={styles.statsSummarySub}>
            {listData.length} account(s) have been inactive for over {activeTab} days.
          </Text>
        </View>

        {listData.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#10B981" />
            <Text style={styles.emptyTitle}>No Inactive Accounts</Text>
            <Text style={styles.emptySub}>
              All registered {roleFilter} have active logins within the last {activeTab} days.
            </Text>
          </View>
        ) : (
          listData.map((item) => (
            <View key={item.userId} style={styles.userCard}>
              <View style={styles.userMain}>
                <View style={styles.userTop}>
                  <Text style={styles.userName}>{item.name}</Text>
                  {roleFilter === "providers" && item.tier && (
                    <TierBadge tier={item.tier} size="small" showScore prsScore={item.prsScore} />
                  )}
                </View>

                <Text style={styles.daysText}>
                  Inactive for <Text style={styles.daysHighlight}>{item.daysInactive} days</Text>
                </Text>
                <Text style={styles.lastActiveText}>
                  Last active: {new Date(item.lastActivityAt).toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity style={styles.remindBtn}>
                <Ionicons name="notifications-outline" size={16} color="#00BFA6" />
                <Text style={styles.remindText}>Notify</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A15",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A15",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: "#9CA3AF",
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    marginTop: spacing.sm,
  },
  errorSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#0F101D",
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  navBack: {
    padding: 4,
  },
  navTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  roleBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "#0F101D",
    gap: spacing.sm,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: "#16182B",
  },
  roleBtnActive: {
    backgroundColor: "#00BFA620",
    borderWidth: 1,
    borderColor: "#00BFA6",
  },
  roleText: {
    ...typeScale.labelMedium,
    color: "#9CA3AF",
  },
  roleTextActive: {
    color: "#00BFA6",
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "#0F101D",
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#16182B",
  },
  tabBtnActive: {
    backgroundColor: "#00BFA6",
  },
  tabText: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
  },
  statsSummaryBox: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  statsSummaryTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statsSummarySub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  userCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userMain: {
    flex: 1,
  },
  userTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  userName: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  daysText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 4,
  },
  daysHighlight: {
    color: "#EF4444",
    fontWeight: "700",
  },
  lastActiveText: {
    ...typeScale.labelSmall,
    color: "#6B7280",
    marginTop: 2,
  },
  remindBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#00BFA630",
  },
  remindText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  emptyBox: {
    backgroundColor: "#16182B",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    alignItems: "center",
  },
  emptyTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    marginTop: spacing.xs,
  },
  emptySub: {
    ...typeScale.bodySmall,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
});
