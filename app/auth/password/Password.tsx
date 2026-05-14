import { H2, View, Text, Image } from "tamagui";
import { SignInWithPassword } from "./SignInWithPassword";
import { useState } from "react";

export function Password() {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");

  return (
    <View
      padding={flow === "signUp" ? "$4" : "$6"}
      width="90%"
      maxWidth={440}
      minHeight={flow === "signUp" ? 600 : undefined}
      backgroundColor="#171717"
      borderRadius={24}
      borderWidth={1}
      borderColor="#262626"
      shadowColor="#000000"
      shadowOffset={{ width: 0, height: 20 }}
      shadowOpacity={0.3}
      shadowRadius={40}
    >
      {flow === "signIn" && (
        <View alignItems="center" marginBottom="$5">
          <Image
            source={require("@/assets/images/logo.png")}
            width={80}
            height={80}
            marginBottom="$3"
            resizeMode="contain"
          />
          <H2
            color="#FFFFFF"
            fontSize={28}
            fontWeight="700"
            marginBottom="$2"
            letterSpacing={-0.5}
          >
            Welcome back
          </H2>
          <Text color="#737373" fontSize={15}>
            Sign in to continue to VideoClub
          </Text>
        </View>
      )}
      {flow === "signUp" && (
        <View alignItems="center" marginBottom="$4">
          <Image
            source={require("@/assets/images/logo.png")}
            width={50}
            height={50}
            marginBottom="$2"
            resizeMode="contain"
          />
          <H2
            color="#FFFFFF"
            fontSize={22}
            fontWeight="700"
            marginBottom="$1"
            letterSpacing={-0.5}
          >
            Create Account
          </H2>
          <Text color="#737373" fontSize={13}>
            Join VideoClub today
          </Text>
        </View>
      )}
      <SignInWithPassword flow={flow} onFlowChange={setFlow} />
    </View>
  );
}
