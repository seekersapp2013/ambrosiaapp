# Country Code Auto-Detection Feature

## Overview
This feature automatically detects the user's country and pre-populates the phone number input field with the appropriate country code, improving the UX for phone-based authentication.

## Implementation

### ✅ Files Created/Modified

1. **`utils/countryPhone.ts`** - Country code to phone prefix mapping
   - Maps 50+ countries to their international calling codes
   - Defaults to Nigeria (+234) as the primary target market
   - Helper functions for formatting phone numbers

2. **`hooks/useCountryDetection.ts`** - Custom React hook for country detection
   - Detects user's country using `expo-localization`
   - Gracefully falls back to Nigeria if detection fails
   - Returns country code, phone prefix, and loading state

3. **`app/auth/otp/sms/SignInFormPhoneCode.tsx`** - Phone input component
   - Auto-populates with detected country code
   - Shows loading state during detection
   - Enhanced placeholder with example phone format
   - Keyboard type set to phone-pad for better mobile UX

## Installation Required

To enable this feature, you need to install `expo-localization`:

```bash
npx expo install expo-localization
```

### Alternative Installation Methods

If you encounter PowerShell execution policy issues:

**Option 1: Run in Command Prompt (cmd)**
```cmd
npx expo install expo-localization
```

**Option 2: Temporarily allow PowerShell scripts**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx expo install expo-localization
```

**Option 3: Use yarn instead**
```bash
yarn add expo-localization
```

## Features

### 1. **Automatic Country Detection**
- Uses device locale to detect user's country
- Falls back to Nigeria (+234) if detection fails
- Works offline after initial detection

### 2. **Smart Phone Input**
- Auto-populates country code when component loads
- Prevents duplicate country codes
- Phone-optimized keyboard
- Example format in placeholder: "+234 8012345678"

### 3. **User Experience Improvements**
- Loading indicator while detecting country
- Button disabled during detection
- Clear error messages
- Maintains existing validation

### 4. **Supported Countries**
- **50+ countries** including:
  - 🇳🇬 Nigeria (primary market)
  - 🇿🇦 South Africa, 🇰🇪 Kenya, 🇬🇭 Ghana
  - 🇬🇧 UK, 🇺🇸 US, 🇨🇦 Canada
  - 🇨🇳 China, 🇮🇳 India, 🇯🇵 Japan
  - And many more!

## How It Works

1. Component mounts → Hook starts country detection
2. `expo-localization` reads device locale
3. Country code mapped to phone prefix (e.g., "NG" → "+234")
4. Phone input auto-populated with prefix
5. User enters their number after the prefix
6. Form submission ensures correct formatting

## Testing

### Before Installation
- Feature works with fallback to Nigeria (+234)
- No errors, just console log message

### After Installation
- Should detect actual user country
- Phone prefix changes based on location
- Loading state visible briefly

## Fallback Behavior

If `expo-localization` is not installed:
- ✅ No crashes or errors
- ✅ Defaults to Nigeria (+234)
- ✅ All functionality works normally
- ℹ️ Console message: "Country detection not available, using default (Nigeria)"

## Next Steps

1. **Install the package**: Run one of the installation commands above
2. **Test the feature**: Clear app data and sign up with a new phone number
3. **Verify detection**: Check that your country's code appears automatically
4. **International testing**: Ask users in different countries to verify their codes

## Benefits

✅ **Better UX** - Users don't need to remember country codes
✅ **Fewer errors** - Reduces chance of incorrect country code
✅ **Faster signup** - One less field to fill manually
✅ **International ready** - Supports users worldwide
✅ **Resilient** - Works even without geo-detection

---

**Status**: Implementation complete, pending package installation
**Target Market**: Nigeria and international users
**Compatibility**: Works on iOS and Android via Expo
