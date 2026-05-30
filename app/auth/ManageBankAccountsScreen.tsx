import { ScrollView, KeyboardAvoidingView, Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import LinkBank from "@/components/wallet/LinkBank";
import { spacing } from "@/tokens/spacing";
import { typeScale } from "@/tokens/typography";
import { Colors } from "@/tokens/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ManageBankAccountsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.space4 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MobileCard>
            {/* ── In-card header with X close ─────────────────────────── */}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Bank Accounts</Text>
                <Text style={styles.cardSubtitle}>Link accounts for withdrawals</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Content ──────────────────────────────────────────────── */}
            <LinkBank />
          </MobileCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.space4,
    paddingBottom: spacing.scrollBottomPadding,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space4,
  },
  cardTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});
