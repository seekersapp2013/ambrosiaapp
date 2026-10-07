import { SignIn } from "@/app/SignIn";
import SplashScreen from "@/app/SplashScreen";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { View } from "tamagui";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Colors } from "@/constants/Colors";
import { hasSeenOnboarding } from "@/utils/appStorage";

function RedirectToTabs() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/for-you");
  }, []);
  return null;
}

// Unauthenticated entry: first-time users see onboarding, returning users see sign-in.
function UnauthenticatedEntry() {
  const router = useRouter();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    hasSeenOnboarding().then((v) => {
      if (!active) return;
      if (!v) {
        router.replace("/onboarding");
      } else {
        setSeen(true);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  // While resolving the flag (or when redirecting to onboarding) show the splash.
  if (seen !== true) {
    return <SplashScreen />;
  }

  return <SignIn />;
}

export default function Index() {
  return (
    <View flex={1} backgroundColor={Colors.bgBase}>
      <Unauthenticated>
        <UnauthenticatedEntry />
      </Unauthenticated>
      <AuthLoading>
        <SplashScreen />
      </AuthLoading>
      <Authenticated>
        <RedirectToTabs />
      </Authenticated>
    </View>
  );
}
