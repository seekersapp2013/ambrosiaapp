import { useAuthActions } from "@convex-dev/auth/react";
import { useToastController } from "@tamagui/toast";
import { useState } from "react";
import { View, Text } from "react-native";
import { TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SignUpWizard } from "./SignUpWizard";
import { SignUpRoleSelector } from "./SignUpRoleSelector";
import { Eye, EyeOff } from "@tamagui/lucide-icons";
import { useColors } from "@/hooks/useColors";
import { GradientButton } from "@/components/ui/GradientButton";
import { fontFamily } from "@/tokens/typography";
import { radius } from "@/tokens/radius";

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
  const [signupRole, setSignupRole] = useState<'user' | 'provider' | null>(null);

  const flow    = externalFlow ?? internalFlow;
  const setFlow = (newFlow: "signIn" | "signUp") => {
    setInternalFlow(newFlow);
    onFlowChange?.(newFlow);
    if (newFlow === "signIn") {
      setSignupRole(null);
    }
  };

  const toast        = useToastController();
  const [submitting, setSubmitting] = useState(false);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const C = useColors();

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
    if (!signupRole) {
      return (
        <SignUpRoleSelector
          onSelectRole={(role) => setSignupRole(role)}
          onBackToSignIn={() => setFlow("signIn")}
        />
      );
    }

    return (
      <SignUpWizard
        provider={provider}
        role={signupRole}
        handleSent={handleSent}
        onBackToSignIn={() => setSignupRole(null)}
      />
    );
  }

  return (
    <View style={styles.form}>
      {/* Email */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: C.textPrimary }]} allowFontScaling={false}>
          Email
        </Text>
        <TextInput
          autoComplete="email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={C.textDisabled}
          style={[styles.input, { backgroundColor: C.bgLight, color: C.textOnLight }]}
        />
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: C.textPrimary }]} allowFontScaling={false}>
          Password
        </Text>
        <View style={styles.passwordWrap}>
          <TextInput
            autoComplete="current-password"
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={C.textDisabled}
            style={[
              styles.input,
              styles.passwordInput,
              { backgroundColor: C.bgLight, color: C.textOnLight },
            ]}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={20} color={C.textOnLight as any} />
            ) : (
              <Eye size={20} color={C.textOnLight as any} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {handlePasswordReset && (
        <TouchableOpacity onPress={handlePasswordReset} style={styles.forgotWrap}>
          <Text style={[styles.forgot, { color: C.textLink }]} allowFontScaling={false}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.cta}>
        <GradientButton
          label={submitting ? "Signing in..." : "Sign in"}
          onPress={handleSubmit}
          loading={submitting}
          accessibilityLabel="Sign in"
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: C.textPrimary }]} allowFontScaling={false}>
          Don&apos;t have an account?{" "}
        </Text>
        <TouchableOpacity
          onPress={() => setFlow("signUp")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Sign up"
        >
          <Text style={[styles.footerLink, { color: C.textLink }]} allowFontScaling={false}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: radius.radiusMD,
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotWrap: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  forgot: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  cta: {
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  footerLink: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
  },
});
