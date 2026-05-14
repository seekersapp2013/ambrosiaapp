import "@/utils/polyfills";
import { useAuthActions } from "@convex-dev/auth/react";
import { useToastController } from "@tamagui/toast";
import { useState, useEffect } from "react";
import { Form, Label, Input, Button, View, Text, Progress, YStack } from "tamagui";
import { ChevronLeft, ChevronRight, Check, Eye, EyeOff, Wallet, Copy } from "@tamagui/lucide-icons";
import { TouchableOpacity, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Oathstone } from "oathstone";
import { oathstoneConfig } from "@/utils/oathstone.config";
import * as Clipboard from 'expo-clipboard';
import { hashPin } from "@/utils/pinHash";
import { encrypt } from "@/utils/encryption";

const INTEREST_OPTIONS = [
  "Nollywood Movies",
  "Action",
  "Comedy",
  "Drama",
  "Romance",
  "Thriller",
  "Afrobeats",
  "Hip Hop",
  "Gospel",
  "Highlife",
  "R&B",
  "Live Streams",
];

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

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
  const completeSignup = useMutation(api.signup.completeSignup);
  const viewer = useQuery(api.users.viewer);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  
  // Form data
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryFlag, setCountryFlag] = useState<string>("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [walletData, setWalletData] = useState<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null>(null);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Country code and flag mapping
  const countryCodeMap: { [key: string]: { code: string; flag: string } } = {
    NG: { code: "+234", flag: "🇳🇬" }, // Nigeria
    GH: { code: "+233", flag: "🇬🇭" }, // Ghana
    KE: { code: "+254", flag: "🇰🇪" }, // Kenya
    ZA: { code: "+27", flag: "🇿🇦" },  // South Africa
    EG: { code: "+20", flag: "🇪🇬" },  // Egypt
    ET: { code: "+251", flag: "🇪🇹" }, // Ethiopia
    TZ: { code: "+255", flag: "🇹🇿" }, // Tanzania
    UG: { code: "+256", flag: "🇺🇬" }, // Uganda
    DZ: { code: "+213", flag: "🇩🇿" }, // Algeria
    MA: { code: "+212", flag: "🇲🇦" }, // Morocco
    AO: { code: "+244", flag: "🇦🇴" }, // Angola
    CM: { code: "+237", flag: "🇨🇲" }, // Cameroon
    CI: { code: "+225", flag: "🇨🇮" }, // Côte d'Ivoire
    SN: { code: "+221", flag: "🇸🇳" }, // Senegal
    RW: { code: "+250", flag: "🇷🇼" }, // Rwanda
    BW: { code: "+267", flag: "🇧🇼" }, // Botswana
    ZM: { code: "+260", flag: "🇿🇲" }, // Zambia
    ZW: { code: "+263", flag: "🇿🇼" }, // Zimbabwe
    MW: { code: "+265", flag: "🇲🇼" }, // Malawi
    MZ: { code: "+258", flag: "🇲🇿" }, // Mozambique
    NA: { code: "+264", flag: "🇳🇦" }, // Namibia
    BJ: { code: "+229", flag: "🇧🇯" }, // Benin
    BF: { code: "+226", flag: "🇧🇫" }, // Burkina Faso
    TG: { code: "+228", flag: "🇹🇬" }, // Togo
    ML: { code: "+223", flag: "🇲🇱" }, // Mali
    NE: { code: "+227", flag: "🇳🇪" }, // Niger
    TD: { code: "+235", flag: "🇹🇩" }, // Chad
    LR: { code: "+231", flag: "🇱🇷" }, // Liberia
    SL: { code: "+232", flag: "🇸🇱" }, // Sierra Leone
    GM: { code: "+220", flag: "🇬🇲" }, // Gambia
    GN: { code: "+224", flag: "🇬🇳" }, // Guinea
    MU: { code: "+230", flag: "🇲🇺" }, // Mauritius
    SC: { code: "+248", flag: "🇸🇨" }, // Seychelles
    SD: { code: "+249", flag: "🇸🇩" }, // Sudan
    SS: { code: "+211", flag: "🇸🇸" }, // South Sudan
    SO: { code: "+252", flag: "🇸🇴" }, // Somalia
    DJ: { code: "+253", flag: "🇩🇯" }, // Djibouti
    ER: { code: "+291", flag: "🇪🇷" }, // Eritrea
    LS: { code: "+266", flag: "🇱🇸" }, // Lesotho
    SZ: { code: "+268", flag: "🇸🇿" }, // Eswatini
    GA: { code: "+241", flag: "🇬🇦" }, // Gabon
    CG: { code: "+242", flag: "🇨🇬" }, // Congo
    CD: { code: "+243", flag: "🇨🇩" }, // DR Congo
    CF: { code: "+236", flag: "🇨🇫" }, // Central African Republic
    GQ: { code: "+240", flag: "🇬🇶" }, // Equatorial Guinea
    ST: { code: "+239", flag: "🇸🇹" }, // São Tomé and Príncipe
    TN: { code: "+216", flag: "🇹🇳" }, // Tunisia
    LY: { code: "+218", flag: "🇱🇾" }, // Libya
    MR: { code: "+222", flag: "🇲🇷" }, // Mauritania
    CV: { code: "+238", flag: "🇨🇻" }, // Cape Verde
    KM: { code: "+269", flag: "🇰🇲" }, // Comoros
    MG: { code: "+261", flag: "🇲🇬" }, // Madagascar
  };

  // Create wallet in background on mount
  useEffect(() => {
    createWallet();
  }, []);

  // Detect user's country when reaching step 3
  useEffect(() => {
    if (currentStep === 3 && !countryCode) {
      detectCountry();
    }
  }, [currentStep]);

  const detectCountry = async () => {
    try {
      // Try multiple geolocation APIs for better reliability
      let countryCode = null;
      
      // Try ipapi.co first
      try {
        const response = await fetch("https://ipapi.co/json/", {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            countryCode = data.country_code;
            console.log("Country detected from ipapi.co:", countryCode);
          }
        }
      } catch (err) {
        console.log("ipapi.co failed, trying alternative...");
      }
      
      // If first API fails, try ip-api.com
      if (!countryCode) {
        try {
          const response = await fetch("http://ip-api.com/json/");
          if (response.ok) {
            const data = await response.json();
            if (data.countryCode) {
              countryCode = data.countryCode;
              console.log("Country detected from ip-api.com:", countryCode);
            }
          }
        } catch (err) {
          console.log("ip-api.com failed, trying alternative...");
        }
      }
      
      // If second API fails, try ipinfo.io
      if (!countryCode) {
        try {
          const response = await fetch("https://ipinfo.io/json");
          if (response.ok) {
            const data = await response.json();
            if (data.country) {
              countryCode = data.country;
              console.log("Country detected from ipinfo.io:", countryCode);
            }
          }
        } catch (err) {
          console.log("ipinfo.io failed");
        }
      }
      
      // Set country info or default to Nigeria
      if (countryCode && countryCodeMap[countryCode]) {
        const countryInfo = countryCodeMap[countryCode];
        setCountryCode(countryInfo.code);
        setCountryFlag(countryInfo.flag);
        console.log("Country set to:", countryCode, countryInfo.code);
      } else {
        console.log("Could not detect country, defaulting to Nigeria");
        const nigeriaInfo = countryCodeMap["NG"];
        setCountryCode(nigeriaInfo.code);
        setCountryFlag(nigeriaInfo.flag);
      }
    } catch (error) {
      console.error("Error detecting country:", error);
      const nigeriaInfo = countryCodeMap["NG"];
      setCountryCode(nigeriaInfo.code);
      setCountryFlag(nigeriaInfo.flag);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const [usernameToCheck, setUsernameToCheck] = useState<string>("");
  const usernameCheckResult = useQuery(
    api.users.checkUsernameAvailability,
    usernameToCheck.length >= 3 ? { username: usernameToCheck } : "skip"
  );

  useEffect(() => {
    if (usernameToCheck.length >= 3) {
      setCheckingUsername(true);
    }
  }, [usernameToCheck]);

  useEffect(() => {
    if (usernameCheckResult !== undefined) {
      setUsernameAvailable(usernameCheckResult.available);
      setCheckingUsername(false);
    }
  }, [usernameCheckResult]);

  const validateStep1 = () => {
    if (!email) {
      toast.show("Please enter your email");
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.show("Please enter a valid email address");
      return false;
    }
    if (!username) {
      toast.show("Please enter a username");
      return false;
    }
    if (username.length < 3) {
      toast.show("Username must be at least 3 characters");
      return false;
    }
    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
      toast.show("Username can only contain letters, numbers, and underscores");
      return false;
    }
    if (usernameAvailable === false) {
      toast.show("This username is already taken");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!password) {
      toast.show("Please enter a password");
      return false;
    }
    if (password.length < 8) {
      toast.show("Password must be at least 8 characters");
      return false;
    }
    if (!confirmPassword) {
      toast.show("Please confirm your password");
      return false;
    }
    if (password.trim() !== confirmPassword.trim()) {
      console.log("Password mismatch:", { password, confirmPassword, passwordLength: password.length, confirmLength: confirmPassword.length });
      toast.show("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!phone) {
      toast.show("Please enter your phone number");
      return false;
    }
    // Remove spaces and check if it's a valid phone number
    const cleanPhone = phone.replace(/\s/g, "");
    if (!cleanPhone.match(/^[0-9]{7,15}$/)) {
      toast.show("Please enter a valid phone number");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (interests.length === 0) {
      toast.show("Please select at least one interest");
      return false;
    }
    return true;
  };

  const validateStep6 = () => {
    if (!pin) {
      toast.show("Please enter a PIN");
      return false;
    }
    if (pin.length !== 4) {
      toast.show("PIN must be exactly 4 digits");
      return false;
    }
    if (!pin.match(/^[0-9]{4}$/)) {
      toast.show("PIN must contain only numbers");
      return false;
    }
    if (!confirmPin) {
      toast.show("Please confirm your PIN");
      return false;
    }
    if (pin !== confirmPin) {
      toast.show("PINs do not match");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    } else if (currentStep === 4 && validateStep4()) {
      // Check if wallet is ready, if not wait for it
      if (!walletData && !creatingWallet) {
        // Wallet creation failed, retry
        setCreatingWallet(true);
        const success = await createWallet();
        if (success) {
          setCurrentStep(5);
        }
      } else if (walletData) {
        // Wallet is ready, proceed
        setCurrentStep(5);
      } else {
        // Still creating, show message
        toast.show("Creating your wallet, please wait...");
      }
    } else if (currentStep === 5 && walletData) {
      setCurrentStep(6);
    }
  };

  const createWallet = async () => {
    try {
      setCreatingWallet(true);
      const oathstone = new Oathstone(oathstoneConfig);
      await oathstone.initialize();
      
      const wallet = oathstone.createWallet();
      setWalletData({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic
      });
      
      console.log("Wallet created successfully in background");
      return true;
    } catch (error) {
      console.error("Wallet creation error:", error);
      return false;
    } finally {
      setCreatingWallet(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    toast.show(`${label} copied to clipboard`);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleSubmit = () => {
    if (!validateStep6()) return;
    if (!walletData) {
      toast.show("Wallet data is missing. Please try again.");
      return;
    }

    setSubmitting(true);
    // Combine country code with phone number
    const fullPhoneNumber = countryCode + phone.replace(/\s/g, "");
    
    // Hash the PIN before sending
    const hashedPin = hashPin(pin);
    
    // Encrypt wallet data before sending
    const encryptedPrivateKey = encrypt(walletData.privateKey);
    const encryptedMnemonic = encrypt(walletData.mnemonic);
    
    console.log("Submitting signup with wallet data...");
    console.log("Wallet address:", walletData.address);
    console.log("Private key encrypted length:", encryptedPrivateKey.length);
    console.log("Mnemonic encrypted length:", encryptedMnemonic.length);
    console.log("PIN hashed length:", hashedPin.length);
    
    const authData = {
      email,
      username,
      password,
      flow: "signUp" as const,
      phone: fullPhoneNumber,
      interests,
      walletAddress: walletData.address,
      walletPrivateKey: encryptedPrivateKey,
      walletMnemonic: encryptedMnemonic,
      transactionPin: hashedPin,
    };

    console.log("Auth data keys:", Object.keys(authData));

    signIn(provider ?? "password", authData)
      .then(() => {
        console.log("Signup successful!");
        toast.show("Account created successfully! Welcome to VideoClub.");
        handleSent?.(email);
      })
      .catch((error) => {
        console.error("Signup error:", error);
        toast.show("Could not create account. Please try again.");
        setSubmitting(false);
      });
  };

  const progress = (currentStep / 6) * 100;

  return (
    <YStack width="100%" minHeight={500}>
          {/* Progress Bar */}
          <View marginBottom="$4">
            <View flexDirection="row" justifyContent="space-between" marginBottom="$2">
              <Text color="#E5E5E5" fontSize={13} fontWeight="600">
                Step {currentStep} of 6
              </Text>
              <Text color="#737373" fontSize={13}>
                {currentStep === 1 && "Account Details"}
                {currentStep === 2 && "Security"}
                {currentStep === 3 && "Contact Info"}
                {currentStep === 4 && "Your Interests"}
                {currentStep === 5 && "Your Wallet"}
                {currentStep === 6 && "Transaction PIN"}
              </Text>
            </View>
            <Progress value={progress} backgroundColor="#262626" height={6} borderRadius={3}>
              <Progress.Indicator
                animation="bouncy"
                backgroundColor="#A855F7"
                borderRadius={3}
              />
            </Progress>
          </View>

          {/* Step 1: Email */}
          {currentStep === 1 && (
            <View>
              <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
                Let's get started
              </Text>
              <Text color="#737373" fontSize={14} marginBottom="$3">
                Enter your details
              </Text>

              <View marginBottom="$2.5">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={13} fontWeight="600">
                  Email Address
                </Label>
                <Input
                  autoComplete="email"
                  autoCapitalize="none"
                  autoFocus
                  value={email}
                  onChangeText={setEmail}
                  backgroundColor="#0A0A0A"
                  borderColor="#262626"
                  borderWidth={1}
                  color="#FFFFFF"
                  placeholderTextColor="#525252"
                  placeholder="you@example.com"
                  height={48}
                  borderRadius={12}
                  fontSize={14}
                  paddingHorizontal="$4"
                  focusStyle={{
                    borderColor: "#A855F7",
                    backgroundColor: "#0F0F0F",
                  }}
                />
              </View>

              <View marginBottom="$2.5">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={13} fontWeight="600">
                  Username
                </Label>
                <View position="relative">
                  <Input
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={(text) => {
                      const cleanText = text.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setUsername(cleanText);
                      if (cleanText.length >= 3) {
                        setUsernameToCheck(cleanText);
                      } else {
                        setUsernameAvailable(null);
                        setCheckingUsername(false);
                      }
                    }}
                    backgroundColor="#0A0A0A"
                    borderColor={
                      usernameAvailable === true 
                        ? "#22C55E" 
                        : usernameAvailable === false 
                        ? "#EF4444" 
                        : "#262626"
                    }
                    borderWidth={1}
                    color="#FFFFFF"
                    placeholderTextColor="#525252"
                    placeholder="johndoe"
                    height={48}
                    borderRadius={12}
                    fontSize={14}
                    paddingHorizontal="$4"
                    paddingRight={44}
                    focusStyle={{
                      borderColor: "#A855F7",
                      backgroundColor: "#0F0F0F",
                    }}
                  />
                  <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                    {checkingUsername ? (
                      <View width={18} height={18} justifyContent="center" alignItems="center">
                        <Text color="#A855F7" fontSize={11}>...</Text>
                      </View>
                    ) : usernameAvailable === true ? (
                      <Check size={18} color="#22C55E" />
                    ) : usernameAvailable === false ? (
                      <Text color="#EF4444" fontSize={16}>✕</Text>
                    ) : null}
                  </View>
                </View>
                <Text color="#737373" fontSize={11} marginTop="$1.5">
                  {username.length >= 3 && usernameAvailable === true && "Available"}
                  {username.length >= 3 && usernameAvailable === false && "Already taken"}
                  {username.length < 3 && "3+ characters, letters, numbers, underscores"}
                </Text>
              </View>
            </View>
          )}

          {/* Step 2: Password */}
          {currentStep === 2 && (
            <View>
              <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
                Secure your account
              </Text>
              <Text color="#737373" fontSize={14} marginBottom="$3">
                Create a strong password
              </Text>

              <View marginBottom="$3">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={14} fontWeight="600">
                  Password
                </Label>
                <View position="relative">
                  <Input
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                    secureTextEntry={!showPassword}
                    backgroundColor="#0A0A0A"
                    borderColor="#262626"
                    borderWidth={1}
                    color="#FFFFFF"
                    placeholderTextColor="#525252"
                    placeholder="At least 8 characters"
                    height={52}
                    borderRadius={12}
                    fontSize={15}
                    paddingHorizontal="$4"
                    paddingRight={48}
                    focusStyle={{
                      borderColor: "#A855F7",
                      backgroundColor: "#0F0F0F",
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

              <View marginBottom="$3">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={14} fontWeight="600">
                  Confirm Password
                </Label>
                <View position="relative">
                  <Input
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={confirmPassword}
                    onChangeText={(text) => setConfirmPassword(text)}
                    secureTextEntry={!showConfirmPassword}
                    backgroundColor="#0A0A0A"
                    borderColor="#262626"
                    borderWidth={1}
                    color="#FFFFFF"
                    placeholderTextColor="#525252"
                    placeholder="Re-enter your password"
                    height={52}
                    borderRadius={12}
                    fontSize={15}
                    paddingHorizontal="$4"
                    paddingRight={48}
                    focusStyle={{
                      borderColor: "#A855F7",
                      backgroundColor: "#0F0F0F",
                    }}
                  />
                  <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#737373" />
                      ) : (
                        <Eye size={20} color="#737373" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Phone Number */}
          {currentStep === 3 && (
            <View>
              <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
                Add your phone number
              </Text>
              <Text color="#737373" fontSize={14} marginBottom="$3">
                We'll use this to keep your account secure
              </Text>

              <View marginBottom="$3">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={14} fontWeight="600">
                  Country Code
                </Label>
                <View 
                  backgroundColor="#0A0A0A"
                  borderColor="#262626"
                  borderWidth={1}
                  height={52}
                  borderRadius={12}
                  paddingHorizontal="$4"
                  flexDirection="row"
                  alignItems="center"
                  gap="$2"
                >
                  <Text fontSize={24}>{countryFlag || "🌍"}</Text>
                  <Text color="#FFFFFF" fontSize={15} fontWeight="600">
                    {countryCode || "+234"}
                  </Text>
                </View>
              </View>

              <View marginBottom="$3">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={14} fontWeight="600">
                  Phone Number
                </Label>
                <Input
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  backgroundColor="#0A0A0A"
                  borderColor="#262626"
                  borderWidth={1}
                  color="#FFFFFF"
                  placeholderTextColor="#525252"
                  placeholder="800 000 0000"
                  height={52}
                  borderRadius={12}
                  fontSize={15}
                  paddingHorizontal="$4"
                  focusStyle={{
                    borderColor: "#A855F7",
                    backgroundColor: "#0F0F0F",
                  }}
                />
              </View>
            </View>
          )}

          {/* Step 4: Interests */}
          {currentStep === 4 && (
            <View>
              <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
                What do you love?
              </Text>
              <Text color="#737373" fontSize={14} marginBottom="$3">
                Select your interests
              </Text>

              <View marginBottom="$3">
                <View flexDirection="row" flexWrap="wrap" gap="$2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <Button
                      key={interest}
                      size="$2"
                      backgroundColor={interests.includes(interest) ? "#A855F7" : "#262626"}
                      color={interests.includes(interest) ? "#FFFFFF" : "#A3A3A3"}
                      borderWidth={1}
                      borderColor={interests.includes(interest) ? "#A855F7" : "#404040"}
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
                <Text color="#737373" fontSize={12} marginTop="$2">
                  {interests.length} selected
                </Text>
              </View>
            </View>
          )}

          {/* Step 5: Wallet */}
          {currentStep === 5 && (
            <View>
              <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
                Your Wallet is Ready!
              </Text>
              <Text color="#737373" fontSize={14} marginBottom="$4">
                We've created a secure wallet for you
              </Text>

              {creatingWallet ? (
                <View alignItems="center" paddingVertical="$6">
                  <Text color="#A855F7" fontSize={15}>Creating your wallet...</Text>
                </View>
              ) : walletData ? (
                <View alignItems="center" paddingVertical="$4">
                  <View 
                    backgroundColor="#A855F7" 
                    borderRadius={50} 
                    width={80} 
                    height={80} 
                    justifyContent="center" 
                    alignItems="center"
                    marginBottom="$4"
                  >
                    <Wallet size={40} color="#FFFFFF" />
                  </View>
                  <Text color="#E5E5E5" fontSize={16} fontWeight="600" marginBottom="$2" textAlign="center">
                    Wallet Created Successfully
                  </Text>
                  <Text color="#737373" fontSize={14} textAlign="center" lineHeight={20}>
                    Your wallet details are securely stored. You can view them anytime from your profile page.
                  </Text>
                </View>
              ) : (
                <View alignItems="center" paddingVertical="$6">
                  <Text color="#EF4444" fontSize={15}>Failed to create wallet</Text>
                </View>
              )}
            </View>
          )}

          {/* Step 6: Transaction PIN */}
          {currentStep === 6 && (
            <View>
              <Text color="#FFFFFF" fontSize={20} fontWeight="700" marginBottom="$2">
                Create Transaction PIN
              </Text>
              <Text color="#737373" fontSize={14} marginBottom="$3">
                This 4-digit PIN will be used to authorize transactions
              </Text>

              <View marginBottom="$2.5">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={13} fontWeight="600">
                  PIN
                </Label>
                <View position="relative">
                  <Input
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={pin}
                    onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ""))}
                    secureTextEntry={!showPin}
                    backgroundColor="#0A0A0A"
                    borderColor="#262626"
                    borderWidth={1}
                    color="#FFFFFF"
                    placeholderTextColor="#525252"
                    placeholder="Enter 4-digit PIN"
                    height={48}
                    borderRadius={12}
                    fontSize={14}
                    paddingHorizontal="$4"
                    paddingRight={48}
                    focusStyle={{
                      borderColor: "#A855F7",
                      backgroundColor: "#0F0F0F",
                    }}
                  />
                  <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                    <TouchableOpacity onPress={() => setShowPin(!showPin)}>
                      {showPin ? (
                        <EyeOff size={20} color="#737373" />
                      ) : (
                        <Eye size={20} color="#737373" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View marginBottom="$2.5">
                <Label color="#E5E5E5" marginBottom="$2" fontSize={13} fontWeight="600">
                  Confirm PIN
                </Label>
                <View position="relative">
                  <Input
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={confirmPin}
                    onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ""))}
                    secureTextEntry={!showConfirmPin}
                    backgroundColor="#0A0A0A"
                    borderColor="#262626"
                    borderWidth={1}
                    color="#FFFFFF"
                    placeholderTextColor="#525252"
                    placeholder="Re-enter your PIN"
                    height={48}
                    borderRadius={12}
                    fontSize={14}
                    paddingHorizontal="$4"
                    paddingRight={48}
                    focusStyle={{
                      borderColor: "#A855F7",
                      backgroundColor: "#0F0F0F",
                    }}
                  />
                  <View position="absolute" right={12} top={0} bottom={0} justifyContent="center">
                    <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)}>
                      {showConfirmPin ? (
                        <EyeOff size={20} color="#737373" />
                      ) : (
                        <Eye size={20} color="#737373" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View 
                backgroundColor="#7E22CE20" 
                borderColor="#A855F7" 
                borderWidth={1} 
                borderRadius={12} 
                padding="$3"
              >
                <Text color="#A855F7" fontSize={12} fontWeight="600" marginBottom="$1">
                  🔒 Security Note
                </Text>
                <Text color="#E5E5E5" fontSize={11} lineHeight={16}>
                  Your PIN will be required for all transactions. Keep it secure and don't share it with anyone.
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View marginTop="auto" paddingTop="$4">
            <View flexDirection="row" gap="$3">
              {currentStep > 1 && (
                <Button
                  flex={1}
                  backgroundColor="#262626"
                  color="#E5E5E5"
                  borderWidth={1}
                  borderColor="#404040"
                  height={52}
                  borderRadius={12}
                  fontSize={15}
                  fontWeight="600"
                  onPress={handleBack}
                  icon={<ChevronLeft size={20} />}
                  pressStyle={{ backgroundColor: "#1F1F1F", scale: 0.98 }}
                >
                  Back
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  flex={1}
                  backgroundColor="#A855F7"
                  color="#FFFFFF"
                  height={52}
                  borderRadius={12}
                  fontSize={16}
                  fontWeight="600"
                  onPress={handleNext}
                  iconAfter={<ChevronRight size={20} />}
                  pressStyle={{ backgroundColor: "#7E22CE", scale: 0.98 }}
                >
                  Continue
                </Button>
              ) : currentStep === 4 ? (
                <Button
                  flex={1}
                  backgroundColor="#A855F7"
                  color="#FFFFFF"
                  height={52}
                  borderRadius={12}
                  fontSize={16}
                  fontWeight="600"
                  onPress={handleNext}
                  disabled={creatingWallet}
                  opacity={creatingWallet ? 0.6 : 1}
                  iconAfter={<ChevronRight size={20} />}
                  pressStyle={{ backgroundColor: "#7E22CE", scale: 0.98 }}
                >
                  {creatingWallet ? "Creating Wallet..." : "Continue"}
                </Button>
              ) : currentStep === 5 ? (
                <Button
                  flex={1}
                  backgroundColor="#A855F7"
                  color="#FFFFFF"
                  height={52}
                  borderRadius={12}
                  fontSize={16}
                  fontWeight="600"
                  onPress={handleNext}
                  disabled={!walletData}
                  opacity={!walletData ? 0.6 : 1}
                  iconAfter={<ChevronRight size={20} />}
                  pressStyle={{ backgroundColor: "#7E22CE", scale: 0.98 }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  flex={1}
                  backgroundColor="#A855F7"
                  color="#FFFFFF"
                  height={52}
                  borderRadius={12}
                  fontSize={16}
                  fontWeight="600"
                  onPress={handleSubmit}
                  disabled={submitting || !walletData}
                  opacity={submitting || !walletData ? 0.6 : 1}
                  icon={<Check size={20} />}
                  pressStyle={{ backgroundColor: "#7E22CE", scale: 0.98 }}
                >
                  {submitting ? "Creating..." : "Complete Sign Up"}
                </Button>
              )}
            </View>

            {currentStep < 6 && (
              <Button
                backgroundColor="transparent"
                color="#A855F7"
                borderWidth={0}
                marginTop="$3"
                height={44}
                fontSize={14}
                fontWeight="600"
                onPress={onBackToSignIn}
                pressStyle={{ opacity: 0.6 }}
              >
                Already have an account? Sign in
              </Button>
            )}
          </View>
        </YStack>
  );
}
