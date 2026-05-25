import { H2, View, Text } from "tamagui";
import { SignInWithPassword } from "./SignInWithPassword";
import { useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { AppBackgroundWithGlow } from "@/components/AppBackground";
import { Colors } from "@/constants/Colors";
import { MOBILE_CARD_ENABLED } from "@/components/MobileCard";

export function Password() {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");

  return (
    <View
      padding={flow === "signUp" ? "$4" : "$6"}
      width="90%"
      maxWidth={440}
      minHeight={flow === "signUp" ? 600 : undefined}
      backgroundColor={MOBILE_CARD_ENABLED ? "rgba(10, 10, 21, 0.97)" : "transparent"}
      borderRadius={MOBILE_CARD_ENABLED ? 24 : 0}
      borderWidth={MOBILE_CARD_ENABLED ? 1 : 0}
      borderColor={MOBILE_CARD_ENABLED ? "rgba(198, 34, 41, 0.3)" : "transparent"}
      shadowColor={MOBILE_CARD_ENABLED ? "#C62229" : "transparent"}
      shadowOffset={{ width: 0, height: MOBILE_CARD_ENABLED ? 20 : 0 }}
      shadowOpacity={MOBILE_CARD_ENABLED ? 0.15 : 0}
      shadowRadius={MOBILE_CARD_ENABLED ? 40 : 0}
    >
      {flow === "signIn" && (
        <View alignItems="center" marginBottom="$4">
          <AppLogo size={72} showGlow />
          <H2
            color={Colors.blue}
            fontSize={26}
            fontWeight="700"
            marginBottom="$1"
            marginTop="$2"
            letterSpacing={-0.5}
          >
            Ambrosia
          </H2>
          <Text color="#9ca3af" fontSize={12} textAlign="center" lineHeight={18}>
            A Safe Haven For Health Information
          </Text>
        </View>
      )}
      {flow === "signUp" && (
        <View alignItems="center" marginBottom="$4">
          <AppLogo size={48} showGlow />
          <H2
            color={Colors.blue}
            fontSize={22}
            fontWeight="700"
            marginBottom="$1"
            marginTop="$2"
            letterSpacing={-0.5}
          >
            Ambrosia
          </H2>
          <Text color="#9ca3af" fontSize={12}>
            A Safe Haven For Health Information
          </Text>
        </View>
      )}
      <SignInWithPassword flow={flow} onFlowChange={setFlow} />
    </View>
  );
}
