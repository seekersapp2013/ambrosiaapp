import {
  User,
  UserProfile,
  Movie,
  Music,
  Content,
  ContentFilters,
  Rental,
  Purchase,
  OfflineContent,
  Transaction,
  PaymentSession,
  LiveStream,
  StreamSession,
  StreamConfig,
  VideoCall,
  GiftType,
  Review,
  Comment,
  EngagementMetrics,
  ShareLink,
  InteractionType,
} from './index';

// Authentication Service Interface
export interface AuthService {
  signUp(email: string, phone: string, password: string, interests: string[]): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<User>;
  getCurrentUser(): User | null;
}

// Content Service Interface
export interface ContentService {
  getMovies(filters?: ContentFilters): Promise<Movie[]>;
  getMusic(filters?: ContentFilters): Promise<Music[]>;
  rentMovie(movieId: string): Promise<Rental>;
  purchaseMusic(musicId: string): Promise<Purchase>;
  downloadContent(contentId: string): Promise<void>;
  getOfflineLibrary(): Promise<OfflineContent[]>;
  deleteOfflineContent(contentId: string): Promise<void>;
}

// Wallet Service Interface
export interface WalletService {
  getBalance(): Promise<number>;
  addFunds(amount: number): Promise<PaymentSession>;
  getTransactionHistory(): Promise<Transaction[]>;
  processPayment(amount: number, purpose: string, metadata: any): Promise<Transaction>;
}

// Streaming Service Interface
export interface StreamingService {
  startStream(streamConfig: StreamConfig): Promise<LiveStream>;
  joinStream(streamId: string): Promise<StreamSession>;
  endStream(streamId: string): Promise<void>;
  sendGift(streamId: string, giftType: GiftType, amount: number): Promise<void>;
  initiateVideoCall(streamId: string, viewerId: string): Promise<VideoCall>;
  acceptVideoCall(callId: string): Promise<void>;
}

// Recommendation Service Interface
export interface RecommendationService {
  getRecommendations(userId: string): Promise<Content[]>;
  recordInteraction(userId: string, contentId: string, interactionType: InteractionType): Promise<void>;
  updatePreferences(userId: string, preferences: string[]): Promise<void>;
}

// Community Service Interface
export interface CommunityService {
  submitReview(contentId: string, rating: number, comment: string): Promise<Review>;
  getReviews(contentId: string): Promise<Review[]>;
  flagReview(reviewId: string, reason: string): Promise<void>;
}

// Engagement Service Interface
export interface EngagementService {
  clapContent(contentId: string, contentType: 'movie' | 'music' | 'stream'): Promise<void>;
  unclapContent(contentId: string, contentType: 'movie' | 'music' | 'stream'): Promise<void>;
  submitComment(contentId: string, contentType: 'movie' | 'music' | 'stream', comment: string): Promise<Comment>;
  getComments(contentId: string, contentType: 'movie' | 'music' | 'stream'): Promise<Comment[]>;
  shareContent(contentId: string, contentType: 'movie' | 'music' | 'stream'): Promise<ShareLink>;
  getEngagementMetrics(contentId: string, contentType: 'movie' | 'music' | 'stream'): Promise<EngagementMetrics>;
  flagComment(commentId: string, reason: string): Promise<void>;
  hasUserClapped(contentId: string, userId: string): Promise<boolean>;
}
