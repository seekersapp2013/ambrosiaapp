import { ScrollView } from "tamagui";
import { Password } from "./auth/password/Password";
import { AppBackgroundWithGlow } from "@/components/AppBackground";

export function SignIn() {
  return (
    <AppBackgroundWithGlow>
      <ScrollView
        flex={1}
        width="100%"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Password />
      </ScrollView>
    </AppBackgroundWithGlow>
  );
}
