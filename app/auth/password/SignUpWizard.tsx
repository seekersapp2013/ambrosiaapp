import "@/utils/polyfills";
import React, { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useToastController } from "@tamagui/toast";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { hashPin } from "@/utils/pinHash";
import { useColors } from "@/hooks/useColors";
import { useKYCConfig, KYCConfig } from "@/hooks/useKYCConfig";
import { DynamicKYCForm } from "@/components/ui/DynamicKYCForm";

export function SignUpWizard({
  provider,
  role = 'user',
  handleSent,
  onBackToSignIn,
}: {
  provider?: string;
  role?: 'user' | 'provider';
  handleSent?: (email: string) => void;
  onBackToSignIn: () => void;
}) {
  const { signIn } = useAuthActions();
  const toast = useToastController();
  const storeSignupData = useMutation(api.signup.storeSignupData);
  const C = useColors();

  // Load KYC configurations on demand right when the screen mounts
  const { config: userConfig, loading: loadingUser, error: errorUser } = useKYCConfig('signup');
  const { config: providerConfig, loading: loadingProvider, error: errorProvider } = useKYCConfig('provider');

  if (loadingUser || (role === 'provider' && loadingProvider)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <ActivityIndicator size="large" color={C.actionPrimary} />
      </View>
    );
  }

  if (!userConfig || (role === 'provider' && !providerConfig)) {
    return null;
  }

  // Combine user config and provider config if role is provider
  let activeConfig: KYCConfig = userConfig;
  if (role === 'provider' && providerConfig) {
    const userSteps = userConfig.steps || [];
    const providerSteps = (providerConfig.steps || []).map((step, idx) => ({
      ...step,
      step: userSteps.length + idx + 1,
    }));
    activeConfig = {
      id: "signup_combined_provider",
      title: "Service Provider Registration",
      steps: [...userSteps, ...providerSteps],
    };
  }

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      const email = formData.email?.trim();
      const password = formData.password;
      const name = formData.name?.trim();
      const username = formData.username?.trim();
      const pin = formData.pin;

      let transactionPin: string | undefined = undefined;
      if (pin && String(pin).length === 4) {
        transactionPin = await hashPin(String(pin));
      }

      // Extract provider data if role is provider
      let providerKycData: Record<string, any> | undefined = undefined;
      if (role === 'provider') {
        const p1 = formData.oneOnOnePrice ? parseFloat(formData.oneOnOnePrice) : undefined;
        const p2 = formData.groupSessionPrice ? parseFloat(formData.groupSessionPrice) : undefined;

        providerKycData = {
          ...formData, // Preserves all KYC dynamic fields (yearsOfExperience, licenseNumber, etc.)
          oneOnOnePrice: p1,
          groupSessionPrice: p2,
          sessionPrice: p1 || 100,
          yearsOfExperience: formData.yearsOfExperience !== undefined && formData.yearsOfExperience !== ''
            ? parseInt(String(formData.yearsOfExperience), 10)
            : undefined,
          graduationYear: formData.graduationYear !== undefined && formData.graduationYear !== ''
            ? parseInt(String(formData.graduationYear), 10)
            : undefined,
        };

        // Strip sensitive user auth fields from provider KYC payload
        delete providerKycData.password;
        delete providerKycData.confirmPassword;
        delete providerKycData.pin;
        delete providerKycData.confirmPin;
      }

      // Store pending signup data before auth creation
      await storeSignupData({
        email,
        username,
        phoneNumber: formData.phone,
        phoneCountryCode: formData.countryCode || '+234',
        detectedCountry: 'NG',
        primaryCurrency: formData.primaryCurrency || 'USD',
        interests: formData.interests || [],
        transactionPin,
        signupRole: role,
        providerKycData,
      });

      // Execute Convex auth user signup
      await signIn(provider ?? "password", {
        email,
        name,
        password,
        flow: "signUp",
      });

      handleSent?.(email);
    } catch (err: any) {
      console.error("Signup error:", err);
      toast.show(err?.message || "Failed to complete signup. Please try again.");
      throw err;
    }
  };

  return (
    <DynamicKYCForm
      config={activeConfig}
      onSubmit={handleFormSubmit}
      onCancel={onBackToSignIn}
      submitButtonLabel={role === 'provider' ? 'Complete Provider Sign Up' : 'Create Account'}
    />
  );
}
