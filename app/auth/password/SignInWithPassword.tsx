import { useAuthActions } from "@convex-dev/auth/react";
import { useToastController } from "@tamagui/toast";
import { useState } from "react";
import { Form, Label, Input, Button, View } from "tamagui";
import { SignUpWizard } from "./SignUpWizard";
import { Eye, EyeOff } from "@tamagui/lucide-icons";
import { TouchableOpacity } from "react-native";

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
    const authData = { email, password, flow: "signIn" };

    signIn(provider ?? "password", authData)
      .then(() => {
        handleSent?.(email);
      })
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
        <Label
          color="#E5E5E5"
          marginBottom="$2"
          fontSize={14}
          fontWeight="600"
        >
          Email
        </Label>
        <Input
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          backgroundColor="#0A0A0A"
          borderColor="#262626"
          borderWidth={1}
          color="#FFFFFF"
          placeholderTextColor="#525252"
          placeholder="you@example.com"
          height={52}
          borderRadius={12}
          fontSize={15}
          paddingHorizontal="$4"
          focusStyle={{
            borderColor: "#A855F7",
            backgroundColor: "#0F0F0F"
          }}
        />
      </View>

      <View marginBottom="$5">
        <Label
          color="#E5E5E5"
          marginBottom="$2"
          fontSize={14}
          fontWeight="600"
        >
          Password
        </Label>
        <View position="relative">
          <Input
            autoComplete="current-password"
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            backgroundColor="#0A0A0A"
            borderColor="#262626"
            borderWidth={1}
            color="#FFFFFF"
            placeholderTextColor="#525252"
            placeholder="Enter your password"
            height={52}
            borderRadius={12}
            fontSize={15}
            paddingHorizontal="$4"
            paddingRight={48}
            focusStyle={{
              borderColor: "#A855F7",
              backgroundColor: "#0F0F0F"
            }}
          />
          <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color="#737373" />
              ) : (
                <Eye size={20} color="#737373" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Form.Trigger asChild>
        <Button
          backgroundColor="#A855F7"
          color="#FFFFFF"
          hoverStyle={{ backgroundColor: "#9333EA" }}
          pressStyle={{ backgroundColor: "#7E22CE", scale: 0.98 }}
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
        backgroundColor="#262626"
        color="#E5E5E5"
        borderWidth={1}
        borderColor="#404040"
        height={52}
        borderRadius={12}
        fontSize={15}
        fontWeight="600"
        hoverStyle={{ backgroundColor: "#2A2A2A" }}
        pressStyle={{ backgroundColor: "#1F1F1F", scale: 0.98 }}
        onPress={() => setFlow("signUp")}
      >
        Create new account
      </Button>

      {handlePasswordReset ? (
        <Button
          backgroundColor="transparent"
          color="#A855F7"
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
