/**
 * Ambrosia — Permission Constants
 *
 * Pure constants only. No imports, no logic, no Convex.
 * These strings must exactly match what moderationHelpers.ts checks server-side.
 *
 * Usage:
 *   import { PERMISSIONS, CONTENT_TYPES } from '@/app/utils/permissions';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Permission strings — must match moderationHelpers.ts hasPermission() checks
// ─────────────────────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  APPROVE_ARTICLES:             'approve_articles',
  APPROVE_REELS:                'approve_reels',
  APPROVE_CIRCLES:              'approve_circles',
  APPROVE_EXPERTS:              'approve_experts',
  APPROVE_BOOKING_SUBSCRIBERS:  'approve_booking_subscribers',
  DELETE_CONTENT:               'delete_content',
  BAN_USERS:                    'ban_users',
  MANAGE_ROLES:                 'manage_roles',
  VIEW_REPORTS:                 'view_reports',
  MANAGE_MODERATION_SETTINGS:   'manage_moderation_settings',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];

// Human-readable labels for each permission (used in RoleManagement checkboxes)
export const PERMISSION_LABELS: Record<PermissionValue, string> = {
  approve_articles:             'Approve Articles',
  approve_reels:                'Approve Reels',
  approve_circles:              'Approve Circles',
  approve_experts:              'Approve Expert Requests',
  approve_booking_subscribers:  'Approve Booking Subscribers',
  delete_content:               'Delete Content',
  ban_users:                    'Ban Users',
  manage_roles:                 'Manage Roles',
  view_reports:                 'View Reports',
  manage_moderation_settings:   'Manage Moderation Settings',
};

// ─────────────────────────────────────────────────────────────────────────────
// Content type strings — must match canApproveContentType() checks
// ─────────────────────────────────────────────────────────────────────────────
export const CONTENT_TYPES = {
  ARTICLES:             'articles',
  REELS:                'reels',
  CIRCLES:              'circles',
  EXPERT_REQUESTS:      'expertRequests',
  BOOKING_SUBSCRIBERS:  'bookingSubscribers',
} as const;

export type ContentTypeKey = keyof typeof CONTENT_TYPES;
export type ContentTypeValue = (typeof CONTENT_TYPES)[ContentTypeKey];

// Human-readable labels for each content type (used in RoleManagement checkboxes)
export const CONTENT_TYPE_LABELS: Record<ContentTypeValue, string> = {
  articles:             'Articles',
  reels:                'Reels',
  circles:              'Circles',
  expertRequests:       'Expert Requests',
  bookingSubscribers:   'Booking Subscribers',
};
