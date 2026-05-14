import { View, ScrollView, YStack } from "tamagui";
import { Password } from "./auth/password/Password";

export function SignIn() {
  return (
    <View 
      flex={1} 
      width="100%" 
      backgroundColor="#0A0A0A"
    >
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
    </View>
  );
}
