import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { typeScale, fontFamily } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';

const USER_CARD = require('@/assets/images/user.png');
const PROVIDER_CARD = require('@/assets/images/provider.png');

interface SignUpRoleSelectorProps {
  onSelectRole: (role: 'user' | 'provider') => void;
  onBackToSignIn?: () => void;
}

export function SignUpRoleSelector({ onSelectRole, onBackToSignIn }: SignUpRoleSelectorProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Card width = screen width minus horizontal padding (clamped for large screens).
  const cardWidth = Math.min(width - spacing.space4 * 2, 468);
  // The source card art is a wide banner — keep its aspect ratio responsive.
  const cardAspectRatio = 2.6;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.space6, paddingBottom: insets.bottom + spacing.space10 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} allowFontScaling={false}>
          Choose an account type
        </Text>
        <Text style={styles.subtitle} allowFontScaling={false}>
          Select how you would like to use Ambrosia. You can always update your account status later.
        </Text>

        {/* User card */}
        <Pressable
          onPress={() => onSelectRole('user')}
          accessibilityRole="button"
          accessibilityLabel="Sign up as a user"
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Image
            source={USER_CARD}
            style={{ width: cardWidth, aspectRatio: cardAspectRatio }}
            resizeMode="contain"
          />
        </Pressable>

        {/* Provider card */}
        <Pressable
          onPress={() => onSelectRole('provider')}
          accessibilityRole="button"
          accessibilityLabel="Sign up as a provider"
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Image
            source={PROVIDER_CARD}
            style={{ width: cardWidth, aspectRatio: cardAspectRatio }}
            resizeMode="contain"
          />
        </Pressable>

        {onBackToSignIn && (
          <Pressable
            style={styles.backBtn}
            onPress={onBackToSignIn}
            accessibilityRole="button"
            accessibilityLabel="Back to Sign in"
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={16} color={Colors.textLink} />
            <Text style={styles.backBtnText} allowFontScaling={false}>
              Back to Sign in
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
  },
  title: {
    ...typeScale.headingXL,
    fontFamily: fontFamily.bold,
    color: Colors.textLink,
    alignSelf: 'stretch',
    marginBottom: spacing.space2,
  },
  subtitle: {
    ...typeScale.bodyMD,
    fontFamily: fontFamily.regular,
    color: Colors.textPrimary,
    alignSelf: 'stretch',
    lineHeight: 20,
    marginBottom: spacing.space6,
  },
  card: {
    marginBottom: spacing.space4,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    marginTop: spacing.space6,
    paddingVertical: spacing.space3,
  },
  backBtnText: {
    ...typeScale.labelMD,
    fontFamily: fontFamily.medium,
    color: Colors.textLink,
  },
});
