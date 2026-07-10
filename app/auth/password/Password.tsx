import { H2, View, Text } from "tamagui";
import { SignInWithPassword } from "./SignInWithPassword";
import { useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { MOBILE_CARD_ENABLED } from "@/components/MobileCard";
import { useColors } from "@/hooks/useColors";

export function Password() {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const C = useColors();

  // Card background: frosted on light, deep-dark on dark
  const cardBg = MOBILE_CARD_ENABLED ? C.surface : "transparent";
  const cardBorder = MOBILE_CARD_ENABLED ? C.redBorder : "transparent";

  return (
    <View
      padding={flow === "signUp" ? "$4" : "$6"}
      width="90%"
      maxWidth={440}
      minHeight={flow === "signUp" ? 600 : undefined}
      backgroundColor={cardBg}
      borderRadius={MOBILE_CARD_ENABLED ? 24 : 0}
      borderWidth={MOBILE_CARD_ENABLED ? 1 : 0}
      borderColor={cardBorder}
      shadowColor={MOBILE_CARD_ENABLED ? "#C62229" : "transparent"}
      shadowOffset={{ width: 0, height: MOBILE_CARD_ENABLED ? 20 : 0 }}
      shadowOpacity={MOBILE_CARD_ENABLED ? 0.15 : 0}
      shadowRadius={MOBILE_CARD_ENABLED ? 40 : 0}
    >
      {flow === "signIn" && (
        <View alignItems="center" marginBottom="$4">
          <AppLogo size={72} showGlow />
          <H2
            color={C.blue}
            fontSize={26}
            fontWeight="700"
            marginBottom="$1"
            marginTop="$2"
            letterSpacing={-0.5}
          >
            Ambrosia
          </H2>
          <Text color={C.textMuted} fontSize={12} textAlign="center" lineHeight={18}>
            A Safe Haven For Health Information
          </Text>
        </View>
      )}
      {flow === "signUp" && (
        <View alignItems="center" marginBottom="$4">
          <AppLogo size={48} showGlow />
          <H2
            color={C.blue}
            fontSize={22}
            fontWeight="700"
            marginBottom="$1"
            marginTop="$2"
            letterSpacing={-0.5}
          >
            Ambrosia
          </H2>
          <Text color={C.textMuted} fontSize={12}>
            A Safe Haven For Health Information
          </Text>
        </View>
      )}
      <SignInWithPassword flow={flow} onFlowChange={setFlow} />
    </View>
  );
}
