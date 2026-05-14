// Core User Types
export interface User {
  id: string;
  email: string;
  phone: string;
  displayName: string;
  interests: string[];
  isVerified: boolean;
  isCelebrity: boolean;
  createdAt: number;
}

export interface UserProfile {
  displayName?: string;
  phone?: string;
  interests?: string[];
}

// Content Types
export interface Movie {
  id: string;
  title: string;
  genre: string[];
  duration: number;
  price: number; // 50 or 100 Naira
  isBlockbuster: boolean;
  thumbnailUrl: string;
  fileUrl: string;
  description: string;
  releaseYear: number;
  rating: number;
  reviewCount: number;
}

export interface Music {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string[];
  duration: number;
  price: number; // 50, 100, or 500 Naira
  type: 'track' | 'album' | 'video';
  thumbnailUrl: string;
  fileUrl: string;
  rating: number;
  reviewCount: number;
}

export interface Content {
  id: string;
  type: 'movie' | 'music';
  title: string;
  thumbnailUrl: string;
  price: number;
  rating: number;
  recommendationScore: number;
}

export interface ContentFilters {
  genre?: string[];
  priceMin?: number;
  priceMax?: number;
  releaseYear?: number;
  type?: string;
}

// Rental and Purchase Types
export interface Rental {
  id: string;
  userId: string;
  contentId: string;
  rentedAt: number;
  expiresAt: number;
  isActive: boolean;
}

export interface Purchase {
  id: string;
  userId: string;
  contentId: string;
  purchasedAt: number;
  amount: number;
}

export interface OfflineContent {
  id: string;
  contentId: string;
  type: 'movie' | 'music';
  title: string;
  localPath: string;
  expiresAt?: number;
  downloadedAt: number;
}

// Wallet Types
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  purpose: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  metadata: any;
}

export interface PaymentSession {
  sessionId: string;
  paystackUrl: string;
  amount: number;
}

// Streaming Types
export interface LiveStream {
  id: string;
  celebrityId: string;
  title: string;
  startedAt: number;
  viewerCount: number;
  liveKitRoomName: string;
  liveKitToken: string;
  status: 'live' | 'ended';
}

export interface StreamSession {
  streamId: string;
  liveKitToken: string;
  roomName: string;
}

export interface StreamConfig {
  title: string;
  scheduledAt?: number;
}

export interface VideoCall {
  id: string;
  streamId: string;
  celebrityId: string;
  viewerId: string;
  status: 'pending' | 'active' | 'ended' | 'declined';
  liveKitToken: string;
}

export type GiftType = 'emoji' | 'spray';

// Community Types
export interface Review {
  id: string;
  userId: string;
  contentId: string;
  rating: number;
  comment: string;
  timestamp: number;
  flagCount: number;
}

// Engagement Types
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  contentId: string;
  contentType: 'movie' | 'music' | 'stream';
  text: string;
  timestamp: number;
  flagCount: number;
}

export interface EngagementMetrics {
  contentId: string;
  clapCount: number;
  commentCount: number;
  shareCount: number;
  userHasClapped: boolean;
}

export interface ShareLink {
  url: string;
  contentId: string;
  contentType: 'movie' | 'music' | 'stream';
  shareId: string;
}

// Recommendation Types
export type InteractionType = 'view' | 'rent' | 'purchase' | 'review' | 'search';

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  timestamp: number;
}

// LiveKit Types
export interface LiveKitConfig {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  metadata?: string;
}

export interface TokenConfig {
  identity: string;
  name: string;
  roomName: string;
  canPublish: boolean;
  canSubscribe: boolean;
}
