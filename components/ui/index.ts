/**
 * Ambrosia Design System — UI Component Barrel Export
 * Phases 4–14
 *
 * Usage:
 *   import { PrimaryButton, AppInput, ListCard, Toast } from '@/components/ui';
 */

// Phase 4 — Buttons
export {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  SmallPillButton,
  DestructiveButton,
  IconButton,
} from './Button';

// Phase 5 — Inputs
export {
  AppInput,
  PasswordInput,
  SearchInput,
  TextareaInput,
  OTPInput,
} from './Input';

// Phase 6 — Cards
export {
  BaseCard,
  ListCard,
  SettingsRow,
  TransactionCard,
  EmptyStateCard,
  QuickActionCard,
} from './Card';

// Phase 7 — Navigation
export { ScreenHeader, WizardProgressBar } from './ScreenHeader';
export { BottomSheet } from './BottomSheet';

// Phase 14 — Micro-interactions
export { Toast } from './Toast';
export type { ToastVariant } from './Toast';

export {
  StandardBadge,
  StatusBadge,
  UnreadBadge,
  InfoBadge,
  RatingStars,
  FullDivider,
  InsetDivider,
  SectionDivider,
} from './Badge';

export { AppSwitch, AppCheckbox } from './Toggle';
export { Skeleton, SkeletonCard } from './Skeleton';
