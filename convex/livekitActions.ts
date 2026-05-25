"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { AccessToken, EgressClient, TrackSource } from "livekit-server-sdk";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

// LiveKit configuration - these should be environment variables
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL;

// Log configuration status (don't throw during module loading)
console.log('LiveKit Config Status:', {
    apiKey: LIVEKIT_API_KEY ? 'Set' : 'Not set',
    apiSecret: LIVEKIT_API_SECRET ? 'Set' : 'Not set',
    wsUrl: LIVEKIT_WS_URL || 'Not set'
});

// Helper function to validate configuration at runtime
function validateLiveKitConfig() {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
        const missing = [];
        if (!LIVEKIT_API_KEY) missing.push('LIVEKIT_API_KEY');
        if (!LIVEKIT_API_SECRET) missing.push('LIVEKIT_API_SECRET');
        if (!LIVEKIT_WS_URL) missing.push('LIVEKIT_WS_URL');

        throw new Error(`LiveKit configuration is incomplete. Missing: ${missing.join(', ')}`);
    }
}

// Generate access token for joining LiveKit room
export const generateAccessToken = action({
    args: {
        bookingId: v.id("bookings"),
        participantName: v.string()
    },
    handler: async (ctx: ActionCtx, args): Promise<{ token: string; wsUrl: string; roomName: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const booking: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // Only provider or client can join
        if (booking.providerId !== userId && booking.clientId !== userId) {
            throw new Error("Not authorized to join this session");
        }

        if (!booking.liveStreamRoomName) {
            throw new Error("Live stream room not created");
        }

        try {
            // Validate configuration before creating token
            validateLiveKitConfig();

            // Create access token with longer TTL
            const at: AccessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
                identity: userId,
                name: args.participantName,
                ttl: '2h', // 2 hour token validity
            });

            // Grant permissions based on user role
            const isProvider = booking.providerId === userId;
            at.addGrant({
                roomJoin: true,
                room: booking.liveStreamRoomName,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
                canUpdateOwnMetadata: true,
                recorder: isProvider, // Only providers can control recording
            });

            const token: string = await at.toJwt();

            console.log('Generated token for user:', {
                userId,
                participantName: args.participantName,
                roomName: booking.liveStreamRoomName,
                isProvider,
                wsUrl: LIVEKIT_WS_URL,
                tokenLength: token.length
            });

            // TypeScript assertion: validateLiveKitConfig() ensures LIVEKIT_WS_URL is defined
            return { token, wsUrl: LIVEKIT_WS_URL!, roomName: booking.liveStreamRoomName };
        } catch (error: any) {
            console.error('Failed to generate access token:', error);
            throw new Error(`Failed to generate access token: ${error?.message || 'Unknown error'}`);
        }
    }
});

// Start recording for a live stream
export const startRecording = action({
    args: {
        bookingId: v.id("bookings")
    },
    handler: async (ctx: ActionCtx, args): Promise<{ recordingId: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const booking: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // Only provider can start recording
        if (booking.providerId !== userId) {
            throw new Error("Only provider can start recording");
        }

        if (!booking.liveStreamRoomName) {
            throw new Error("Live stream room not found");
        }

        try {
            // For now, let's focus on debugging existing recordings
            // The actual recording start would be handled by your LiveKit client-side code
            const recordingId = `manual_recording_${args.bookingId}_${Date.now()}`;
            
            console.log('Simulating recording start for debugging:', {
                recordingId,
                roomName: booking.liveStreamRoomName
            });

            // Update booking with recording ID and set status to recording
            await ctx.runMutation(internal.livekit.updateStreamStatusInternal, {
                bookingId: args.bookingId,
                status: "LIVE",
                recordingId: recordingId
            });

            // Store recording metadata - mark as pending until complete
            await ctx.runMutation(internal.livekit.updateRecordingUrl, {
                bookingId: args.bookingId,
                recordingUrl: `pending-${recordingId}`
            });

            return { recordingId };
        } catch (error) {
            console.error("Failed to start recording:", error);
            throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
});

// Stop recording and get download URL
export const stopRecording = action({
    args: {
        bookingId: v.id("bookings")
    },
    handler: async (ctx: ActionCtx, args): Promise<{ recordingUrl?: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const booking: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // Only provider can stop recording
        if (booking.providerId !== userId) {
            throw new Error("Only provider can stop recording");
        }

        if (!booking.recordingId) {
            throw new Error("No active recording found");
        }

        try {
            // Validate configuration
            validateLiveKitConfig();

            // Create LiveKit Egress client
            const egressClient = new EgressClient(LIVEKIT_WS_URL!, LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!);

            // Stop the recording
            const egressInfo = await egressClient.stopEgress(booking.recordingId);

            console.log('Stopped LiveKit recording:', {
                egressId: egressInfo.egressId,
                status: egressInfo.status,
                fileResults: egressInfo.fileResults
            });

            // Update booking status to ended
            await ctx.runMutation(internal.livekit.updateStreamStatusInternal, {
                bookingId: args.bookingId,
                status: "ENDED"
            });

            // Check if recording has file results with download URL
            if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
                const fileResult = egressInfo.fileResults[0];
                if (fileResult.location) {
                    // Update with the actual LiveKit download URL
                    await ctx.runMutation(internal.livekit.updateRecordingUrl, {
                        bookingId: args.bookingId,
                        recordingUrl: fileResult.location
                    });

                    return { recordingUrl: fileResult.location };
                }
            }

            // If no download URL yet, mark as processing
            await ctx.runMutation(internal.livekit.updateRecordingUrl, {
                bookingId: args.bookingId,
                recordingUrl: `processing-${booking.recordingId}`
            });

            return { recordingUrl: undefined };
        } catch (error) {
            console.error("Failed to stop recording:", error);
            throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
});

// Get recording status and download URL from LiveKit
export const getRecordingStatus = action({
    args: {
        bookingId: v.id("bookings")
    },
    handler: async (ctx: ActionCtx, args): Promise<{ status: string; downloadUrl?: string; error?: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const booking: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // Only provider or client can check recording status
        if (booking.providerId !== userId && booking.clientId !== userId) {
            throw new Error("Not authorized to check recording status");
        }

        if (!booking.recordingId) {
            return { status: "NO_RECORDING" };
        }

        try {
            // Validate configuration
            validateLiveKitConfig();

            // Create LiveKit Egress client
            const egressClient = new EgressClient(LIVEKIT_WS_URL!, LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!);

            // Get recording status from LiveKit
            const recordings = await egressClient.listEgress();
            const recording = recordings.find(r => r.egressId === booking.recordingId);

            if (!recording) {
                return { status: "NOT_FOUND", error: "Recording not found in LiveKit" };
            }

            console.log('Recording status from LiveKit:', {
                egressId: recording.egressId,
                status: recording.status?.toString(),
                fileResults: recording.fileResults
            });

            // Check if recording is complete and has file results
            const statusStr = recording.status?.toString() || '';
            if (statusStr === 'EGRESS_COMPLETE' && recording.fileResults && recording.fileResults.length > 0) {
                const fileResult = recording.fileResults[0];
                if (fileResult.location) {
                    // Update the booking with the actual LiveKit download URL
                    await ctx.runMutation(internal.livekit.updateRecordingUrl, {
                        bookingId: args.bookingId,
                        recordingUrl: fileResult.location
                    });

                    return {
                        status: "COMPLETE",
                        downloadUrl: fileResult.location
                    };
                }
            }

            // Map LiveKit status to our status
            let status = "PROCESSING";
            if (statusStr === 'EGRESS_FAILED') {
                status = "FAILED";
            } else if (statusStr === 'EGRESS_ACTIVE') {
                status = "RECORDING";
            }

            return { status };
        } catch (error) {
            console.error("Failed to get recording status:", error);
            return {
                status: "ERROR",
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
});

// Debug: List all egress recordings from LiveKit
export const debugListAllRecordings = action({
    args: {},
    handler: async (ctx: ActionCtx): Promise<{ recordings: any[]; error?: string }> => {
        try {
            validateLiveKitConfig();
            
            const egressClient = new EgressClient(LIVEKIT_WS_URL!, LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!);
            
            // List all egress recordings
            const recordings = await egressClient.listEgress();
            
            console.log('All LiveKit recordings:', recordings);
            
            return { 
                recordings: recordings.map(r => ({
                    egressId: r.egressId,
                    roomName: r.roomName,
                    status: r.status?.toString(),
                    startedAt: r.startedAt,
                    endedAt: r.endedAt,
                    fileResults: r.fileResults?.map(f => ({
                        filename: f.filename,
                        location: f.location,
                        size: f.size,
                        duration: f.duration
                    }))
                }))
            };
        } catch (error) {
            console.error("Failed to list recordings:", error);
            return { 
                recordings: [], 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
});

// Debug: Get specific recording details
export const debugGetRecordingDetails = action({
    args: {
        egressId: v.string()
    },
    handler: async (ctx: ActionCtx, args): Promise<{ recording?: any; error?: string }> => {
        try {
            validateLiveKitConfig();
            
            const egressClient = new EgressClient(LIVEKIT_WS_URL!, LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!);
            
            // Get specific recording details
            const recordings = await egressClient.listEgress();
            const recording = recordings.find(r => r.egressId === args.egressId);
            
            if (!recording) {
                return { error: "Recording not found" };
            }
            
            console.log('Recording details:', recording);
            
            return { 
                recording: {
                    egressId: recording.egressId,
                    roomName: recording.roomName,
                    status: recording.status?.toString(),
                    startedAt: recording.startedAt,
                    endedAt: recording.endedAt,
                    fileResults: recording.fileResults?.map(f => ({
                        filename: f.filename,
                        location: f.location,
                        size: f.size,
                        duration: f.duration
                    })),
                    error: recording.error
                }
            };
        } catch (error) {
            console.error("Failed to get recording details:", error);
            return { 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
});

// Set a test recording URL (for testing purposes)
export const setTestRecordingUrl = action({
    args: {
        bookingId: v.id("bookings"),
        recordingUrl: v.string()
    },
    handler: async (ctx: ActionCtx, args): Promise<{ success: boolean }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const booking: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // Only provider or client can set recording URL
        if (booking.providerId !== userId && booking.clientId !== userId) {
            throw new Error("Not authorized to set recording URL");
        }

        try {
            // Update with the provided recording URL
            await ctx.runMutation(internal.livekit.updateRecordingUrl, {
                bookingId: args.bookingId,
                recordingUrl: args.recordingUrl
            });

            return { success: true };
        } catch (error) {
            console.error("Failed to set recording URL:", error);
            throw new Error("Failed to set recording URL");
        }
    }
});

// Test LiveKit server connectivity
export const testLiveKitConnection = action({
    args: {},
    handler: async (ctx: ActionCtx): Promise<{ success: boolean; error?: string; details?: any }> => {
        try {
            // Validate configuration
            try {
                validateLiveKitConfig();
            } catch (configError: any) {
                return {
                    success: false,
                    error: configError.message,
                    details: {
                        hasApiKey: !!LIVEKIT_API_KEY,
                        hasApiSecret: !!LIVEKIT_API_SECRET,
                        hasWsUrl: !!LIVEKIT_WS_URL,
                        wsUrl: LIVEKIT_WS_URL
                    }
                };
            }

            // Create a test token
            const testToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
                identity: 'test-user',
                name: 'Test User',
                ttl: '5m',
            });

            testToken.addGrant({
                roomJoin: true,
                room: 'test-room',
                canPublish: false,
                canSubscribe: false,
            });

            const token = await testToken.toJwt();

            return {
                success: true,
                details: {
                    wsUrl: LIVEKIT_WS_URL,
                    tokenGenerated: !!token,
                    tokenLength: token.length,
                    timestamp: Date.now()
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || 'Unknown error during connection test',
                details: {
                    wsUrl: LIVEKIT_WS_URL,
                    timestamp: Date.now()
                }
            };
        }
    }
});


// ============================================
// PHASE 1: Audio-Only Event Token Generation
// ============================================

// Generate access token for audio-only events
export const generateAudioEventToken = action({
    args: {
        eventId: v.id("events"),
        bookingId: v.id("bookings"),
        participantName: v.string()
    },
    handler: async (ctx: ActionCtx, args): Promise<{ token: string; wsUrl: string; roomName: string; role: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Get event details
        const event: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!event) {
            throw new Error("Event not found");
        }

        const booking: any = await ctx.runQuery(internal.livekit.getBookingForStreamInternal, {
            bookingId: args.bookingId
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // Verify user is authorized
        if (booking.clientId !== userId && booking.providerId !== userId) {
            throw new Error("Not authorized to join this event");
        }

        if (!booking.liveStreamRoomName) {
            throw new Error("Audio room not created");
        }

        try {
            validateLiveKitConfig();

            // Determine participant role
            const isHost = booking.providerId === userId;
            const participantRole = booking.participantRole || (isHost ? "HOST" : "LISTENER");

            // Create access token
            const at: AccessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
                identity: userId,
                name: args.participantName,
                ttl: '2h',
                metadata: JSON.stringify({ role: participantRole })
            });

            // Grant permissions based on role
            // For audio-only events:
            // - HOST and SPEAKER can publish audio
            // - LISTENER can only subscribe
            const canPublish = participantRole === "HOST" || participantRole === "SPEAKER";

            at.addGrant({
                roomJoin: true,
                room: booking.liveStreamRoomName,
                canPublish: canPublish,
                canPublishSources: canPublish ? [TrackSource.MICROPHONE] : [], // Only audio, no video
                canSubscribe: true,
                canPublishData: true, // For hand-raise signals
                canUpdateOwnMetadata: true,
                recorder: isHost
            });

            const token: string = await at.toJwt();

            console.log('Generated audio event token:', {
                userId,
                participantName: args.participantName,
                roomName: booking.liveStreamRoomName,
                role: participantRole,
                canPublish,
                wsUrl: LIVEKIT_WS_URL
            });

            return { 
                token, 
                wsUrl: LIVEKIT_WS_URL!, 
                roomName: booking.liveStreamRoomName,
                role: participantRole
            };
        } catch (error: any) {
            console.error('Failed to generate audio event token:', error);
            throw new Error(`Failed to generate access token: ${error?.message || 'Unknown error'}`);
        }
    }
});
