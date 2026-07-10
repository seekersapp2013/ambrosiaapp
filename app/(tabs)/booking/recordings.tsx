/**
 * recordings.tsx
 * Route: /(tabs)/booking/recordings
 * Provider-only screen showing all ended live sessions and their recording status.
 */

import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { RecordingManagement } from "@/components/booking/RecordingManagement";

export default function RecordingsScreen() {
  const router = useRouter();

  return (
    <AppBackground>
      <ScreenHeader
        title="Recordings"
        onBack={() => router.replace("/(tabs)/booking" as any)}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MobileCard>
          <RecordingManagement />
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.scrollBottomPadding,
  },
});
