import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { decrypt } from '@/utils/encryption';
import * as Clipboard from 'expo-clipboard';
import { verifyPin } from '@/utils/pinHash';
import { Modal } from 'react-native';

const INTEREST_OPTIONS = [
  'Nollywood Movies',
  'Action',
  'Comedy',
  'Drama',
  'Romance',
  'Thriller',
  'Afrobeats',
  'Hip Hop',
  'Gospel',
  'Highlife',
  'R&B',
  'Live Streams',
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useQuery(api.users.viewer);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  
  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    user?.profilePictureStorageId ? { storageId: user.profilePictureStorageId } : 'skip'
  );

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string>('');
  const [decryptedMnemonic, setDecryptedMnemonic] = useState<string>('');
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Initialize form when user data loads
  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setInterests(user.interests || []);
      
      // Decrypt wallet data if available
      if (user.walletPrivateKey) {
        try {
          setDecryptedPrivateKey(decrypt(user.walletPrivateKey));
        } catch (error) {
          console.error('Error decrypting private key:', error);
        }
      }
      if (user.walletMnemonic) {
        try {
          setDecryptedMnemonic(decrypt(user.walletMnemonic));
        } catch (error) {
          console.error('Error decrypting mnemonic:', error);
        }
      }
    }
  }, [user]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handlePickImage = async () => {
    try {
      // Request permissions directly - simpler approach
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('Permission result:', permissionResult);
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture');
        return;
      }

      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Selected image URI:', result.assets[0].uri);
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      console.error('Error details:', error.message, error.stack);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    setIsUploadingImage(true);
    try {
      console.log('Starting upload for URI:', uri);
      
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      console.log('Got upload URL:', uploadUrl);

      // Fetch the image and convert to blob
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size, 'type:', blob.type);

      // Upload to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });

      console.log('Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const { storageId } = await uploadResponse.json();
      console.log('Got storage ID:', storageId);

      // Update user profile with new storage ID
      await updateProfile({
        profilePictureStorageId: storageId,
      });

      console.log('Profile updated successfully');
      Alert.alert('Success', 'Profile picture updated');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      console.error('Error details:', error.message, error.stack);
      Alert.alert('Error', `Failed to upload profile picture: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        displayName: displayName || undefined,
        interests: interests.length > 0 ? interests : undefined,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setDisplayName(user.displayName || '');
      setInterests(user.interests || []);
    }
    setIsEditing(false);
  };

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
    if (!user?.transactionPin) {
      Alert.alert('Error', 'No PIN found for this account');
      setShowPinModal(false);
      return;
    }

    if (pinInput.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
      return;
    }

    // Verify PIN
    if (verifyPin(pinInput, user.transactionPin)) {
      setShowWalletDetails(true);
      setShowPinModal(false);
      setPinInput('');
    } else {
      Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect. Please try again.');
      setPinInput('');
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Picture */}
      <View style={styles.profilePictureContainer}>
        <TouchableOpacity
          style={styles.profilePictureWrapper}
          onPress={handlePickImage}
          disabled={isUploadingImage}
        >
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Ionicons name="person" size={60} color="#737373" />
            </View>
          )}
          <View style={styles.cameraIconContainer}>
            {isUploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.profilePictureHint}>Tap to change profile picture</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email || 'Not set'}</Text>
        <Text style={styles.hint}>Email cannot be changed</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user.username || 'Not set'}</Text>
        <Text style={styles.hint}>Username cannot be changed</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{user.phone || 'Not set'}</Text>
        <Text style={styles.hint}>Phone cannot be changed</Text>
      </View>

      {/* Wallet Information */}
      <View style={styles.section}>
        <View style={styles.walletHeader}>
          <Ionicons name="wallet" size={20} color="#A855F7" />
          <Text style={styles.walletTitle}>Wallet Information</Text>
        </View>
        
        <View style={styles.walletItem}>
          <View style={styles.walletItemHeader}>
            <Text style={styles.label}>Wallet Address</Text>
            {user.walletAddress && (
              <TouchableOpacity onPress={() => copyToClipboard(user.walletAddress!, 'Wallet Address')}>
                <Ionicons name="copy-outline" size={16} color="#A855F7" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.value, styles.walletValue]} numberOfLines={1} ellipsizeMode="middle">
            {user.walletAddress || 'Not set'}
          </Text>
        </View>

        <View style={styles.walletItem}>
          <View style={styles.walletItemHeader}>
            <Text style={styles.label}>Private Key</Text>
            {decryptedPrivateKey && showWalletDetails && (
              <TouchableOpacity onPress={() => copyToClipboard(decryptedPrivateKey, 'Private Key')}>
                <Ionicons name="copy-outline" size={16} color="#A855F7" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.value, styles.walletValue]} numberOfLines={1} ellipsizeMode="middle">
            {showWalletDetails && decryptedPrivateKey ? decryptedPrivateKey : (user.walletPrivateKey ? '••••••••••••••••' : 'Not set')}
          </Text>
        </View>

        <View style={styles.walletItem}>
          <View style={styles.walletItemHeader}>
            <Text style={styles.label}>Recovery Phrase</Text>
            {decryptedMnemonic && showWalletDetails && (
              <TouchableOpacity onPress={() => copyToClipboard(decryptedMnemonic, 'Recovery Phrase')}>
                <Ionicons name="copy-outline" size={16} color="#A855F7" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.value, styles.walletValue]} numberOfLines={showWalletDetails ? undefined : 2}>
            {showWalletDetails && decryptedMnemonic ? decryptedMnemonic : (user.walletMnemonic ? '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••' : 'Not set')}
          </Text>
        </View>

        {user.walletAddress && (
          <TouchableOpacity 
            style={styles.revealButton}
            onPress={toggleWalletDetails}
          >
            <Ionicons 
              name={showWalletDetails ? "eye-off-outline" : "eye-outline"} 
              size={16} 
              color="#A855F7" 
            />
            <Text style={styles.revealButtonText}>
              {showWalletDetails ? 'Hide Sensitive Details' : 'Reveal Sensitive Details'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.walletImportant}>
          <Ionicons name="warning" size={16} color="#A855F7" />
          <Text style={styles.walletImportantText}>
            ⚠️ Important: Store these details safely. Never share your private key or recovery phrase with anyone.
          </Text>
        </View>

        <View style={styles.walletWarning}>
          <Ionicons name="lock-closed" size={16} color="#A855F7" />
          <Text style={styles.walletWarningText}>
            Wallet details are encrypted and cannot be changed after creation
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Display Name</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            placeholderTextColor="#737373"
          />
        ) : (
          <Text style={styles.value}>{user.displayName || 'Not set'}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Interests</Text>
        {isEditing ? (
          <View>
            <View style={styles.interestsGrid}>
              {INTEREST_OPTIONS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestTag,
                    interests.includes(interest) && styles.interestTagSelected,
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.interestTagText,
                      interests.includes(interest) && styles.interestTagTextSelected,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.interestCount}>{interests.length} selected</Text>
          </View>
        ) : (
          <View>
            {user.interests && user.interests.length > 0 ? (
              <View style={styles.interestsGrid}>
                {user.interests.map((interest) => (
                  <View key={interest} style={styles.interestTagDisplay}>
                    <Text style={styles.interestTagTextDisplay}>{interest}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.value}>Not set</Text>
            )}
          </View>
        )}
      </View>

      {isEditing && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.changePasswordButton}
        onPress={() => router.push('/auth/password/ChangePassword')}
      >
        <Text style={styles.changePasswordText}>Change Password</Text>
      </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#262626',
    borderWidth: 2,
    borderColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0A0A0A',
  },
  profilePictureHint: {
    fontSize: 12,
    color: '#737373',
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#A855F7',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#171717',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#E5E5E5',
  },
  hint: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#404040',
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#E5E5E5',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  interestTagSelected: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  interestTagText: {
    color: '#A3A3A3',
    fontSize: 14,
  },
  interestTagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  interestTagDisplay: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  interestTagTextDisplay: {
    color: '#A855F7',
    fontSize: 14,
  },
  interestCount: {
    color: '#737373',
    fontSize: 12,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
  },
  cancelButtonText: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#A855F7',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    alignItems: 'center',
  },
  changePasswordText: {
    color: '#A855F7',
    fontSize: 16,
    fontWeight: '600',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  walletItem: {
    marginBottom: 12,
  },
  walletItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletValue: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#262626',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A855F7',
    marginBottom: 12,
  },
  revealButtonText: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: '600',
  },
  walletImportant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#7E22CE20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  walletImportantText: {
    flex: 1,
    fontSize: 12,
    color: '#E5E5E5',
    lineHeight: 18,
    fontWeight: '600',
  },
  walletWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#7E22CE20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  walletWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#E5E5E5',
    lineHeight: 16,
  },
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
