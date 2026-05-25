import "@/utils/polyfills";
import { useAuthActions } from "@convex-dev/auth/react";
import { useToastController } from "@tamagui/toast";
import { useState, useEffect } from "react";
import { Label, Input, Button, View, Text, Progress, YStack } from "tamagui";
import { ChevronLeft, ChevronRight, Check, Eye, EyeOff, X } from "@tamagui/lucide-icons";
import { TouchableOpacity } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { hashPin } from "@/utils/pinHash";

// ── Constants ────────────────────────────────────────────────────────────────

const HEALTH_INTERESTS = [
  "Nutrition",
  "Fitness & Exercise",
  "Mental Health",
  "Weight Management",
  "Diabetes Care",
  "Heart Health",
  "Women's Health",
  "Men's Health",
  "Pregnancy & Maternity",
  "Pediatric Health",
  "Senior Health",
  "Sleep & Recovery",
  "Stress Management",
  "Preventive Care",
  "Chronic Disease Management",
  "Alternative Medicine",
  "Supplements & Vitamins",
  "Skin Care",
  "Dental Health",
  "Vision & Eye Care",
  "Physical Therapy",
  "Yoga & Meditation",
  "Sports Medicine",
  "Addiction Recovery",
  "Cancer Care",
  "Autoimmune Conditions",
  "Digestive Health",
  "Respiratory Health",
  "Bone & Joint Health",
  "Hormonal Health",
];

const CURRENCIES = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "🇿🇦" },
  { code: "GMD", symbol: "D", name: "Gambian Dalasi", flag: "🇬🇲" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", flag: "🇨🇦" },
];

const countryCodeMap: { [key: string]: { code: string; flag: string; currency: string } } = {
  NG: { code: "+234", flag: "🇳🇬", currency: "NGN" },
  GH: { code: "+233", flag: "🇬🇭", currency: "GHS" },
  KE: { code: "+254", flag: "🇰🇪", currency: "KES" },
  ZA: { code: "+27",  flag: "🇿🇦", currency: "ZAR" },
  EG: { code: "+20",  flag: "🇪🇬", currency: "USD" },
  ET: { code: "+251", flag: "🇪🇹", currency: "USD" },
  TZ: { code: "+255", flag: "🇹🇿", currency: "USD" },
  UG: { code: "+256", flag: "🇺🇬", currency: "USD" },
  DZ: { code: "+213", flag: "🇩🇿", currency: "USD" },
  MA: { code: "+212", flag: "🇲🇦", currency: "USD" },
  AO: { code: "+244", flag: "🇦🇴", currency: "USD" },
  CM: { code: "+237", flag: "🇨🇲", currency: "USD" },
  CI: { code: "+225", flag: "🇨🇮", currency: "USD" },
  SN: { code: "+221", flag: "🇸🇳", currency: "USD" },
  RW: { code: "+250", flag: "🇷🇼", currency: "USD" },
  ZM: { code: "+260", flag: "🇿🇲", currency: "USD" },
  ZW: { code: "+263", flag: "🇿🇼", currency: "USD" },
  GM: { code: "+220", flag: "🇬🇲", currency: "GMD" },
  US: { code: "+1",   flag: "🇺🇸", currency: "USD" },
  GB: { code: "+44",  flag: "🇬🇧", currency: "GBP" },
  CA: { code: "+1",   flag: "🇨🇦", currency: "CAD" },
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

// ── Component ─────────────────────────────────────────────────────────────────

export function SignUpWizard({
  provider,
  handleSent,
  onBackToSignIn,
}: {
  provider?: string;
  handleSent?: (email: string) => void;
  onBackToSignIn: () => void;
}) {
  const { signIn } = useAuthActions();
  const toast = useToastController();
  const storeSignupData = useMutation(api.signup.storeSignupData);

  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+234");
  const [countryFlag, setCountryFlag] = useState("🇳🇬");
  const [detectedCountry, setDetectedCountry] = useState("NG");

  // Step 3
  const [primaryCurrency, setPrimaryCurrency] = useState("NGN");

  // Step 4
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Step 5
  const [interests, setInterests] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState("");

  const usernameAvailability = useQuery(
    api.profiles.checkUsernameAvailability,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : "skip"
  );

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setUsernameStatus("idle");
      setDebouncedUsername("");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(() => setDebouncedUsername(trimmed), 500);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) return;
    if (usernameAvailability === undefined) return;
    setUsernameStatus(usernameAvailability.available ? "available" : "taken");
  }, [usernameAvailability, debouncedUsername]);

  useEffect(() => {
    if (currentStep === 2) detectCountry();
  }, [currentStep]);

  const detectCountry = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const code: string = data.country_code;
        if (code && countryCodeMap[code]) {
          setCountryCode(countryCodeMap[code].code);
          setCountryFlag(countryCodeMap[code].flag);
          setDetectedCountry(code);
          setPrimaryCurrency(countryCodeMap[code].currency);
          return;
        }
      }
    } catch {}
    setCountryCode("+234");
    setCountryFlag("🇳🇬");
    setDetectedCountry("NG");
    setPrimaryCurrency("NGN");
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  // ── Validators ──────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.show("Please enter a valid email address");
      return false;
    }
    if (password.length < 8) {
      toast.show("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      toast.show("Passwords do not match");
      return false;
    }
    if (!name.trim() || name.trim().length < 2) {
      toast.show("Please enter your full name (at least 2 characters)");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (username.trim().length < 3) {
      toast.show("Username must be at least 3 characters");
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(username.trim().toLowerCase())) {
      toast.show("Username can only contain letters, numbers, and underscores");
      return false;
    }
    if (usernameStatus === "taken") {
      toast.show("Username is already taken");
      return false;
    }
    if (usernameStatus === "checking") {
      toast.show("Please wait while we check username availability");
      return false;
    }
    const clean = phone.replace(/\s/g, "");
    if (!clean.match(/^[0-9]{7,15}$/)) {
      toast.show("Please enter a valid phone number");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!primaryCurrency) {
      toast.show("Please select a primary currency");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (pin.length !== 4 || !pin.match(/^[0-9]{4}$/)) {
      toast.show("PIN must be exactly 4 digits");
      return false;
    }
    if (pin !== confirmPin) {
      toast.show("PINs do not match");
      return false;
    }
    return true;
  };

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
    else if (currentStep === 3 && validateStep3()) setCurrentStep(4);
    else if (currentStep === 4 && validateStep4()) setCurrentStep(5);
  };

  const handleBack = () => {
    if (currentStep === 1) onBackToSignIn();
    else setCurrentStep((currentStep - 1) as WizardStep);
  };

  const handleSubmit = async () => {
    if (interests.length === 0) {
      toast.show("Please select at least one interest");
      return;
    }
    setSubmitting(true);
    try {
      const fullPhone = countryCode + phone.replace(/\s/g, "");
      const pinHash = hashPin(pin);
      await storeSignupData({
        email,
        username: username.trim().toLowerCase(),
        phoneNumber: fullPhone,
        phoneCountryCode: countryCode,
        detectedCountry,
        primaryCurrency,
        interests,
        transactionPin: pinHash,
      });
      await signIn(provider ?? "password", {
        email,
        name: name.trim(),
        password,
        flow: "signUp",
      });
      handleSent?.(email);
    } catch (error: any) {
      toast.show(error?.message ?? "Could not create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const progress = (currentStep / 5) * 100;
  const stepLabels = ["Your Details", "Account Info", "Currency", "Transaction PIN", "Health Interests"];
  const filteredInterests = HEALTH_INTERESTS.filter((i) =>
    i.toLowerCase().includes(interestSearch.toLowerCase())
  );

  // ── Input shared styles ───────────────────────────────────────────────────────

  const inputProps = {
    backgroundColor: "#0a0a15" as const,
    borderColor: "#1f1f2e" as const,
    borderWidth: 1,
    color: "#FFFFFF" as const,
    placeholderTextColor: "#4b5563" as const,
    height: 48,
    borderRadius: 12,
    fontSize: 14,
    paddingHorizontal: "$4" as const,
    focusStyle: { borderColor: "#C62229", backgroundColor: "#0f0f1e" },
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <YStack width="100%" minHeight={500}>
      {/* Progress Bar */}
      <View marginBottom="$4">
        <View flexDirection="row" justifyContent="space-between" marginBottom="$2">
          <Text color="#d1d5db" fontSize={13} fontWeight="600">
            Step {currentStep} of 5
          </Text>
          <Text color="#9ca3af" fontSize={13}>{stepLabels[currentStep - 1]}</Text>
        </View>
        <Progress value={progress} backgroundColor="#1f1f2e" height={6} borderRadius={3}>
          <Progress.Indicator animation="bouncy" backgroundColor="#C62229" borderRadius={3} />
        </Progress>
      </View>

      {/* ── Step 1: Email + Password + Full Name ── */}
      {currentStep === 1 && (
        <View>
          <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
            Let's get started
          </Text>
          <Text color="#9ca3af" fontSize={14} marginBottom="$3">
            Enter your details to create an account
          </Text>

          <View marginBottom="$2.5">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Email Address</Label>
            <Input
              {...inputProps}
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
          </View>

          <View marginBottom="$2.5">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Password</Label>
            <View position="relative">
              <Input
                {...inputProps}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="At least 8 characters"
                paddingRight={48}
              />
              <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View marginBottom="$2.5">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Confirm Password</Label>
            <View position="relative">
              <Input
                {...inputProps}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="Re-enter your password"
                paddingRight={48}
              />
              <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View marginBottom="$2.5">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Full Name</Label>
            <Input
              {...inputProps}
              autoComplete="name"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
            />
            <Text color="#6b7280" fontSize={11} marginTop="$1.5">
              This will be your display name on your profile
            </Text>
          </View>
        </View>
      )}

      {/* ── Step 2: Username + Phone ── */}
      {currentStep === 2 && (
        <View>
          <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
            Set up your account
          </Text>
          <Text color="#9ca3af" fontSize={14} marginBottom="$3">
            Choose a username and add your phone number
          </Text>

          <View marginBottom="$3">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Username</Label>
            <View position="relative">
              <Input
                {...inputProps}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(text) => setUsername(text.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                borderColor={
                  usernameStatus === "available" ? "#22C55E"
                  : usernameStatus === "taken" ? "#EF4444"
                  : "#1f1f2e"
                }
                placeholder="your_username"
                paddingRight={48}
              />
              <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                {usernameStatus === "available" && <Check size={18} color="#22C55E" />}
                {usernameStatus === "taken" && <X size={18} color="#EF4444" />}
                {usernameStatus === "checking" && <Text color="#6b7280" fontSize={11}>...</Text>}
              </View>
            </View>
            {usernameStatus === "taken" && (
              <Text color="#EF4444" fontSize={12} marginTop="$1.5">Username is already taken</Text>
            )}
            {usernameStatus === "available" && (
              <Text color="#22C55E" fontSize={12} marginTop="$1.5">Username is available</Text>
            )}
          </View>

          <View marginBottom="$2">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Country Code</Label>
            <View
              backgroundColor="#0a0a15"
              borderColor="#1f1f2e"
              borderWidth={1}
              height={48}
              borderRadius={12}
              paddingHorizontal="$4"
              flexDirection="row"
              alignItems="center"
              gap="$2"
            >
              <Text fontSize={22}>{countryFlag}</Text>
              <Text color="#FFFFFF" fontSize={14} fontWeight="600">{countryCode}</Text>
            </View>
          </View>

          <View marginBottom="$3">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Phone Number</Label>
            <Input
              {...inputProps}
              autoComplete="tel"
              keyboardType="number-pad"
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9\s]/g, ""))}
              placeholder="800 000 0000"
            />
          </View>
        </View>
      )}

      {/* ── Step 3: Primary Currency ── */}
      {currentStep === 3 && (
        <View>
          <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
            Select your currency
          </Text>
          <Text color="#9ca3af" fontSize={14} marginBottom="$3">
            Choose your primary currency for transactions
          </Text>

          <View gap="$2">
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                onPress={() => setPrimaryCurrency(currency.code)}
                activeOpacity={0.7}
              >
                <View
                  flexDirection="row"
                  alignItems="center"
                  backgroundColor={primaryCurrency === currency.code ? "rgba(198, 34, 41, 0.12)" : "#0a0a15"}
                  borderColor={primaryCurrency === currency.code ? "#C62229" : "#1f1f2e"}
                  borderWidth={1}
                  borderRadius={12}
                  paddingHorizontal="$4"
                  paddingVertical="$3"
                  gap="$3"
                >
                  <Text fontSize={24}>{currency.flag}</Text>
                  <View flex={1}>
                    <Text color="#FFFFFF" fontSize={14} fontWeight="600">{currency.code}</Text>
                    <Text color="#9ca3af" fontSize={12}>{currency.name}</Text>
                  </View>
                  <Text color="#9ca3af" fontSize={14} fontWeight="600">{currency.symbol}</Text>
                  {primaryCurrency === currency.code && <Check size={18} color="#C62229" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Step 4: Transaction PIN ── */}
      {currentStep === 4 && (
        <View>
          <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
            Create Transaction PIN
          </Text>
          <Text color="#9ca3af" fontSize={14} marginBottom="$3">
            This 4-digit PIN will be used to authorize transactions
          </Text>

          <View marginBottom="$2.5">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">PIN</Label>
            <View position="relative">
              <Input
                {...inputProps}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={4}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ""))}
                secureTextEntry={!showPin}
                placeholder="Enter 4-digit PIN"
                paddingRight={48}
              />
              <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                <TouchableOpacity onPress={() => setShowPin(!showPin)}>
                  {showPin ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View marginBottom="$2.5">
            <Label color="#d1d5db" marginBottom="$2" fontSize={13} fontWeight="600">Confirm PIN</Label>
            <View position="relative">
              <Input
                {...inputProps}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={4}
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ""))}
                secureTextEntry={!showConfirmPin}
                placeholder="Re-enter your PIN"
                paddingRight={48}
              />
              <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)}>
                  {showConfirmPin ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Step 5: Health Interests ── */}
      {currentStep === 5 && (
        <View>
          <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$1">
            Health Interests
          </Text>
          <Text color="#9ca3af" fontSize={14} marginBottom="$3">
            Tell us what you're interested in (select at least one)
          </Text>

          <View marginBottom="$3">
            <Input
              {...inputProps}
              autoCapitalize="none"
              autoCorrect={false}
              value={interestSearch}
              onChangeText={setInterestSearch}
              placeholder="Search health topics..."
              height={44}
            />
          </View>

          {interests.length > 0 && (
            <Text color="#9ca3af" fontSize={12} marginBottom="$2">
              {interests.length} selected
            </Text>
          )}

          <View flexDirection="row" flexWrap="wrap" gap="$2">
            {filteredInterests.map((interest) => (
              <Button
                key={interest}
                size="$2"
                backgroundColor={interests.includes(interest) ? "#C62229" : "rgba(198, 34, 41, 0.08)"}
                color={interests.includes(interest) ? "#FFFFFF" : "#d1d5db"}
                borderWidth={1}
                borderColor={interests.includes(interest) ? "#C62229" : "rgba(198, 34, 41, 0.25)"}
                borderRadius={20}
                paddingHorizontal="$3"
                paddingVertical="$1.5"
                fontSize={12}
                fontWeight="500"
                onPress={() => toggleInterest(interest)}
                pressStyle={{ scale: 0.95 }}
                icon={interests.includes(interest) ? <Check size={12} /> : undefined}
              >
                {interest}
              </Button>
            ))}
          </View>
        </View>
      )}

      {/* ── Navigation Buttons ── */}
      <View flexDirection="row" justifyContent="space-between" marginTop="$4" gap="$3">
        {currentStep > 1 && (
          <Button
            flex={1}
            height={48}
            borderRadius={12}
            backgroundColor="rgba(59, 130, 246, 0.08)"
            borderWidth={1}
            borderColor="rgba(59, 130, 246, 0.3)"
            color="#d1d5db"
            fontSize={15}
            fontWeight="600"
            icon={<ChevronLeft size={18} />}
            onPress={handleBack}
            disabled={submitting}
          >
            Back
          </Button>
        )}

        {currentStep < 5 ? (
          <Button
            flex={1}
            height={48}
            borderRadius={12}
            backgroundColor="#C62229"
            color="#FFFFFF"
            fontSize={15}
            fontWeight="600"
            iconAfter={<ChevronRight size={18} />}
            onPress={handleNext}
            disabled={submitting}
            opacity={submitting ? 0.7 : 1}
            pressStyle={{ backgroundColor: "#73141d", scale: 0.98 }}
          >
            {submitting ? "Please wait..." : "Next"}
          </Button>
        ) : (
          <Button
            flex={1}
            height={48}
            borderRadius={12}
            backgroundColor="#C62229"
            color="#FFFFFF"
            fontSize={15}
            fontWeight="600"
            onPress={handleSubmit}
            disabled={submitting}
            opacity={submitting ? 0.7 : 1}
            pressStyle={{ backgroundColor: "#73141d", scale: 0.98 }}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
        )}
      </View>

      {currentStep === 1 && (
        <Button
          backgroundColor="transparent"
          color="#9ca3af"
          borderWidth={0}
          marginTop="$2"
          height={40}
          fontSize={14}
          onPress={onBackToSignIn}
        >
          Already have an account? Sign in
        </Button>
      )}
    </YStack>
  );
}
