import { useAuthActions } from "@convex-dev/auth/react";
import { useToastController } from "@tamagui/toast";
import { useState } from "react";
import { Form, Label, Input, Button, View } from "tamagui";
import { SignUpWizard } from "./SignUpWizard";
import { Eye, EyeOff } from "@tamagui/lucide-icons";
import { TouchableOpacity } from "react-native";
import { Colors } from "@/constants/Colors";

export function SignInWithPassword({
  provider,
  handleSent,
  handlePasswordReset,
  flow: externalFlow,
  onFlowChange,
}: {
  provider?: string;
  handleSent?: (email: string) => void;
  handlePasswordReset?: () => void;
  flow?: "signIn" | "signUp";
  onFlowChange?: (flow: "signIn" | "signUp") => void;
}) {
  const { signIn } = useAuthActions();
  const [internalFlow, setInternalFlow] = useState<"signIn" | "signUp">("signIn");
  const flow = externalFlow ?? internalFlow;
  const setFlow = (newFlow: "signIn" | "signUp") => {
    setInternalFlow(newFlow);
    onFlowChange?.(newFlow);
  };
  const toast = useToastController();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    signIn(provider ?? "password", { email, password, flow: "signIn" })
      .then(() => handleSent?.(email))
      .catch((error) => {
        console.error(error);
        toast.show("Could not sign in, did you mean to sign up?");
        setSubmitting(false);
      });
  };

  if (flow === "signUp") {
    return (
      <SignUpWizard
        provider={provider}
        handleSent={handleSent}
        onBackToSignIn={() => setFlow("signIn")}
      />
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      <View marginBottom="$4">
        <Label color={Colors.textSecondary} marginBottom="$2" fontSize={14} fontWeight="600">
          Email
        </Label>
        <Input
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          backgroundColor={Colors.background}
          borderColor={Colors.borderSubtle}
          borderWidth={1}
          color={Colors.textPrimary}
          placeholderTextColor={Colors.textFaint}
          placeholder="you@example.com"
          height={52}
          borderRadius={12}
          fontSize={15}
          paddingHorizontal="$4"
          focusStyle={{ borderColor: Colors.primary, backgroundColor: Colors.surface }}
        />
      </View>

      <View marginBottom="$5">
        <Label color={Colors.textSecondary} marginBottom="$2" fontSize={14} fontWeight="600">
          Password
        </Label>
        <View position="relative">
          <Input
            autoComplete="current-password"
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            backgroundColor={Colors.background}
            borderColor={Colors.borderSubtle}
            borderWidth={1}
            color={Colors.textPrimary}
            placeholderTextColor={Colors.textFaint}
            placeholder="Enter your password"
            height={52}
            borderRadius={12}
            fontSize={15}
            paddingHorizontal="$4"
            paddingRight={48}
            focusStyle={{ borderColor: Colors.primary, backgroundColor: Colors.surface }}
          />
          <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={Colors.textDim} />
              ) : (
                <Eye size={20} color={Colors.textDim} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Form.Trigger asChild>
        <Button
          backgroundColor={Colors.primary}
          color={Colors.textPrimary}
          hoverStyle={{ backgroundColor: Colors.primaryDeep }}
          pressStyle={{ backgroundColor: Colors.primaryCrimson, scale: 0.98 }}
          disabled={submitting}
          opacity={submitting ? 0.6 : 1}
          height={52}
          borderRadius={12}
          fontSize={16}
          fontWeight="600"
          borderWidth={0}
          marginBottom="$3"
        >
          Sign in
        </Button>
      </Form.Trigger>

      <Button
        backgroundColor={Colors.blueSurface}
        color={Colors.textSecondary}
        borderWidth={1}
        borderColor={Colors.blueBorder}
        height={52}
        borderRadius={12}
        fontSize={15}
        fontWeight="600"
        hoverStyle={{ backgroundColor: Colors.blueSurfaceMid }}
        pressStyle={{ backgroundColor: Colors.blueSurface, scale: 0.98 }}
        onPress={() => setFlow("signUp")}
      >
        Create new account
      </Button>

      {handlePasswordReset ? (
        <Button
          backgroundColor="transparent"
          color={Colors.primary}
          borderWidth={0}
          marginTop="$3"
          height={44}
          fontSize={14}
          fontWeight="600"
          hoverStyle={{ opacity: 0.8 }}
          pressStyle={{ opacity: 0.6 }}
          onPress={handlePasswordReset}
        >
          Forgot password?
        </Button>
      ) : null}
    </Form>
  );
}
