import { SignIn } from "@/app/SignIn";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { Keyboard, Pressable, Image, ScrollView, TouchableOpacity, Alert, Modal, TextInput, StyleSheet } from "react-native";
import { Button, View, Text, H1, Input, Label } from "tamagui";
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from "react";
import { useToastController } from "@tamagui/toast";
import { useRouter } from "expo-router";
import { decrypt } from "@/utils/encryption";
import * as Clipboard from 'expo-clipboard';
import { verifyPin } from "@/utils/pinHash";

export default function Index() {
  return (
    <View flex={1} backgroundColor="#0A0A0A">
      <Pressable
        onPress={(event) => {
          if (event.target === event.currentTarget) {
            Keyboard.dismiss();
          }
        }}
        style={{
          flex: 1,
          cursor: "auto",
        }}
      >
        <Unauthenticated>
          <SignIn />
        </Unauthenticated>
        <Authenticated>
          <Content />
        </Authenticated>
      </Pressable>
    </View>
  );
}

function Content() {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string>('');
  const [decryptedMnemonic, setDecryptedMnemonic] = useState<string>('');
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Decrypt wallet data when viewer loads
  useEffect(() => {
    if (viewer) {
      if (viewer.walletPrivateKey) {
        try {
          setDecryptedPrivateKey(decrypt(viewer.walletPrivateKey));
        } catch (error) {
          console.error('Error decrypting private key:', error);
        }
      }
      if (viewer.walletMnemonic) {
        try {
          setDecryptedMnemonic(decrypt(viewer.walletMnemonic));
        } catch (error) {
          console.error('Error decrypting mnemonic:', error);
        }
      }
    }
  }, [viewer]);

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const toggleWalletDetails = () => {
    if (!showWalletDetails) {
      // Show PIN input modal
      setPinInput('');
      setShowPinModal(true);
    } else {
      setShowWalletDetails(false);
    }
  };

  const handlePinSubmit = () => {
    if (!viewer?.transactionPin) {
      Alert.alert('Error', 'No PIN found for this account');
      setShowPinModal(false);
      return;
    }

    if (pinInput.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
      return;
    }

    // Verify PIN
    if (verifyPin(pinInput, viewer.transactionPin)) {
      setShowWalletDetails(true);
      setShowPinModal(false);
      setPinInput('');
    } else {
      Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect. Please try again.');
      setPinInput('');
    }
  };

  return (
    <View flex={1} backgroundColor="#0A0A0A">
      <ScrollView flex={1}>
        {/* Header */}
        <View
          backgroundColor="#171717"
          borderBottomWidth={1}
          borderBottomColor="#262626"
          paddingVertical="$4"
          paddingHorizontal="$5"
        >
        <View flexDirection="row" alignItems="center" gap="$3">
          <Image
            source={require("@/assets/images/logo.png")}
            style={{ width: 48, height: 48 }}
            resizeMode="contain"
          />
          <View flex={1}>
            <H1
              color="#FFFFFF"
              fontSize={24}
              fontWeight="700"
              marginBottom="$1"
            >
              VideoClub
            </H1>
            <Text color="#737373" fontSize={14}>
              {viewer?.displayName || viewer?.email}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/auth/Profile')}>
            <Ionicons name="person-circle-outline" size={32} color="#E5E5E5" />
          </Pressable>
        </View>
      </View>

      {/* Content Area */}
      <View flex={1} padding="$5">
        <View
          backgroundColor="#171717"
          borderRadius={20}
          borderWidth={1}
          borderColor="#262626"
          padding="$5"
          marginBottom="$4"
        >
          <Text
            color="#FFFFFF"
            fontSize={20}
            fontWeight="700"
            marginBottom="$2"
          >
            Welcome back!
          </Text>
          <Text color="#A3A3A3" fontSize={15} lineHeight={22} marginBottom="$3">
            You're successfully signed in. Your dashboard and video management tools will appear here.
          </Text>

          {viewer?.phone && (
            <View marginBottom="$2">
              <Text color="#737373" fontSize={13}>
                Phone: <Text color="#E5E5E5">{viewer.phone}</Text>
              </Text>
            </View>
          )}

          {viewer?.username && (
            <View marginBottom="$2">
              <Text color="#737373" fontSize={13}>
                Username: <Text color="#E5E5E5">{viewer.username}</Text>
              </Text>
            </View>
          )}

          {viewer?.interests && viewer.interests.length > 0 && (
            <View>
              <Text color="#737373" fontSize={13} marginBottom="$2">
                Your Interests:
              </Text>
              <View flexDirection="row" flexWrap="wrap" gap="$2">
                {viewer.interests.map((interest) => (
                  <View
                    key={interest}
                    backgroundColor="#262626"
                    borderRadius={12}
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                  >
                    <Text color="#A855F7" fontSize={12}>
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Wallet Information */}
        {viewer?.walletAddress && (
          <View
            backgroundColor="#171717"
            borderRadius={20}
            borderWidth={1}
            borderColor="#262626"
            padding="$5"
            marginBottom="$4"
          >
            <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$3">
              <Ionicons name="wallet" size={24} color="#A855F7" />
              <Text color="#FFFFFF" fontSize={18} fontWeight="700">
                Wallet Information
              </Text>
            </View>

            {/* Wallet Address */}
            <View marginBottom="$3">
              <View flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="$1">
                <Text color="#737373" fontSize={13} fontWeight="600">
                  Wallet Address
                </Text>
                <TouchableOpacity onPress={() => copyToClipboard(viewer.walletAddress!, 'Wallet Address')}>
                  <Ionicons name="copy-outline" size={16} color="#A855F7" />
                </TouchableOpacity>
              </View>
              <Text 
                color="#E5E5E5" 
                fontSize={12} 
                fontFamily="monospace"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {viewer.walletAddress}
              </Text>
            </View>

            {/* Private Key */}
            <View marginBottom="$3">
              <View flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="$1">
                <Text color="#737373" fontSize={13} fontWeight="600">
                  Private Key
                </Text>
                {decryptedPrivateKey && showWalletDetails && (
                  <TouchableOpacity onPress={() => copyToClipboard(decryptedPrivateKey, 'Private Key')}>
                    <Ionicons name="copy-outline" size={16} color="#A855F7" />
                  </TouchableOpacity>
                )}
              </View>
              <Text 
                color="#E5E5E5" 
                fontSize={12} 
                fontFamily="monospace"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {showWalletDetails && decryptedPrivateKey ? decryptedPrivateKey : '••••••••••••••••'}
              </Text>
            </View>

            {/* Recovery Phrase */}
            <View marginBottom="$3">
              <View flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="$1">
                <Text color="#737373" fontSize={13} fontWeight="600">
                  Recovery Phrase
                </Text>
                {decryptedMnemonic && showWalletDetails && (
                  <TouchableOpacity onPress={() => copyToClipboard(decryptedMnemonic, 'Recovery Phrase')}>
                    <Ionicons name="copy-outline" size={16} color="#A855F7" />
                  </TouchableOpacity>
                )}
              </View>
              <Text 
                color="#E5E5E5" 
                fontSize={11} 
                fontFamily="monospace"
                numberOfLines={showWalletDetails ? undefined : 2}
              >
                {showWalletDetails && decryptedMnemonic ? decryptedMnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
              </Text>
            </View>

            {/* Reveal Button */}
            <TouchableOpacity 
              onPress={toggleWalletDetails}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 12,
                backgroundColor: '#262626',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#A855F7',
                marginBottom: 12,
              }}
            >
              <Ionicons 
                name={showWalletDetails ? "eye-off-outline" : "eye-outline"} 
                size={16} 
                color="#A855F7" 
              />
              <Text color="#A855F7" fontSize={14} fontWeight="600">
                {showWalletDetails ? 'Hide Sensitive Details' : 'Reveal Sensitive Details'}
              </Text>
            </TouchableOpacity>

            {/* Warning */}
            <View 
              backgroundColor="#7E22CE20" 
              borderRadius={12} 
              borderWidth={1} 
              borderColor="#A855F7" 
              padding="$3"
              flexDirection="row"
              alignItems="center"
              gap="$2"
            >
              <Ionicons name="lock-closed" size={16} color="#A855F7" />
              <Text color="#E5E5E5" fontSize={11} lineHeight={16} flex={1}>
                Wallet details are encrypted and cannot be changed after creation
              </Text>
            </View>
          </View>
        )}

        <Button
          backgroundColor="#A855F7"
          color="#FFFFFF"
          borderWidth={1}
          borderColor="#9333EA"
          height={52}
          borderRadius={12}
          fontSize={15}
          fontWeight="600"
          marginBottom="$3"
          hoverStyle={{ backgroundColor: "#9333EA" }}
          pressStyle={{ backgroundColor: "#7E22CE", scale: 0.98 }}
          onPress={() => router.push('/auth/Profile')}
          icon={<Ionicons name="person-outline" size={20} color="#FFFFFF" />}
        >
          Edit Profile
        </Button>

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
          onPress={() => signOut()}
          icon={<Ionicons name="log-out-outline" size={20} color="#E5E5E5" />}
        >
          Sign out
        </Button>
        </View>
      </ScrollView>

      {/* PIN Verification Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Your PIN</Text>
            <Text style={styles.modalSubtitle}>
              Enter your 4-digit transaction PIN to reveal sensitive wallet details
            </Text>
            
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#737373"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handlePinSubmit}
                disabled={pinInput.length !== 4}
              >
                <Text style={styles.modalConfirmText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#262626',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  pinInput: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
  },
  modalCancelText: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#A855F7',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
