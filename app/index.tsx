import { SignIn } from "@/app/SignIn";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { View } from "tamagui";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppLoader } from "@/components/AppLoader";
import { Colors } from "@/constants/Colors";

function RedirectToTabs() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/home");
  }, []);
  return null;
}

export default function Index() {
  return (
    <View flex={1} backgroundColor={Colors.bgBase}>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <AuthLoading>
        <AppLoader />
      </AuthLoading>
      <Authenticated>
        <RedirectToTabs />
      </Authenticated>
    </View>
  );
}
