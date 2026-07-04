/**
 * AI For You Tab
 * AI-curated content experience — sister screen to for-you.tsx.
 *
 * Accessible via the toggle FAB on the For You screen.
 * Shares the same shell (AppBackground + MobileCard + TopNav) so
 * switching feels seamless.
 */

import React from "react";
import { View, Text } from "tamagui";

import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";

export default function AIForYouScreen() {
  return (
    <AppBackground>
      <MobileCard style={{ flex: 1 }}>
        <TopNav />
        {/* TODO: AI-curated feed content goes here */}
      </MobileCard>
    </AppBackground>
  );
}
