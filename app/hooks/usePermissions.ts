/**
 * Ambrosia — Permission Hooks
 *
 * Client-side UX hooks only. These wrap Convex queries to reactively
 * show/hide UI elements. They do NOT enforce anything — all enforcement
 * lives in Convex server-side (moderationHelpers.ts).
 *
 * Return type is `boolean | undefined`:
 *   undefined = still loading (show skeleton/loader, not denied state)
 *   false     = not permitted (hide the UI element)
 *   true      = permitted (show the UI element)
 */

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─────────────────────────────────────────────────────────────────────────────
// useIsModerator
// True if the current user has any active moderation assignment.
// ─────────────────────────────────────────────────────────────────────────────
export function useIsModerator(): boolean | undefined {
  return useQuery(api.moderation.amIModerator);
}

// ─────────────────────────────────────────────────────────────────────────────
// useIsAdmin
// True if the current user has the manage_roles permission (Admin or Primary Admin).
// ─────────────────────────────────────────────────────────────────────────────
export function useIsAdmin(): boolean | undefined {
  return useQuery(api.moderation.amIAdmin);
}

// ─────────────────────────────────────────────────────────────────────────────
// useIsPrimaryAdmin
// True if the current user has isPrimaryAdmin: true on their assignment.
// ─────────────────────────────────────────────────────────────────────────────
export function useIsPrimaryAdmin(): boolean | undefined {
  return useQuery(api.moderation.amIPrimaryAdmin);
}

// ─────────────────────────────────────────────────────────────────────────────
// useCanApprove
// True if the current user's roles include the given content type in canApprove.
// Pass the content type string (e.g. 'articles', 'reels') — must match CONTENT_TYPES values.
// ─────────────────────────────────────────────────────────────────────────────
export function useCanApprove(contentType: string): boolean | undefined {
  const myRoles = useQuery(api.moderation.getMyRoles);

  if (myRoles === undefined) return undefined;
  if (!myRoles || myRoles.length === 0) return false;

  return myRoles.some((role: any) =>
    Array.isArray(role.canApprove) && role.canApprove.includes(contentType)
  );
}
