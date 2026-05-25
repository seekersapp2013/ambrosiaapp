import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Enroll in a course
export const enrollInCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if course exists and is published
    const course = await ctx.db.get(args.courseId);
    if (!course || !course.isPublished) {
      throw new Error("Course not found or not published");
    }

    // Check if already enrolled
    const existingEnrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user_course", (q) => 
        q.eq("userId", userId).eq("courseId", args.courseId)
      )
      .first();

    if (existingEnrollment) {
      throw new Error("Already enrolled in this course");
    }

    // Create enrollment
    const enrollmentId = await ctx.db.insert("courseEnrollments", {
      userId,
      courseId: args.courseId,
      enrolledAt: Date.now(),
      progress: 0,
    });

    // Track enrollment and update interests
    await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackCourseEnrollmentAndUpdateInterests, {
      userId,
      courseId: args.courseId,
    });

    // Notify course author
    await ctx.runMutation(internal.notifications.createNotificationEvent, {
      type: 'COURSE_STARTED',
      recipientUserId: course.authorId,
      actorUserId: userId,
      relatedContentType: 'course',
      relatedContentId: args.courseId,
    });

    return enrollmentId;
  },
});

// Mark content as completed
export const markContentCompleted = mutation({
  args: {
    courseId: v.id("courses"),
    contentId: v.union(v.id("articles"), v.id("reels")),
    timeSpent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if enrolled in course
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user_course", (q) => 
        q.eq("userId", userId).eq("courseId", args.courseId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Not enrolled in this course");
    }

    // Check if already completed
    const existingProgress = await ctx.db
      .query("courseProgress")
      .withIndex("by_user_content", (q) => 
        q.eq("userId", userId).eq("contentId", args.contentId)
      )
      .first();

    if (existingProgress) {
      // Update time spent if provided
      if (args.timeSpent) {
        await ctx.db.patch(existingProgress._id, {
          timeSpent: (existingProgress.timeSpent || 0) + args.timeSpent,
        });
      }
      return { alreadyCompleted: true };
    }

    // Mark as completed
    await ctx.db.insert("courseProgress", {
      userId,
      courseId: args.courseId,
      contentId: args.contentId,
      completedAt: Date.now(),
      timeSpent: args.timeSpent,
    });

    // Recalculate course progress
    await ctx.scheduler.runAfter(0, internal.courseProgress.updateCourseProgress, {
      userId,
      courseId: args.courseId,
    });

    return { success: true };
  },
});

// Get user's course progress
export const getCourseProgress = query({
  args: { 
    courseId: v.id("courses"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return null;

    // Get enrollment
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user_course", (q) => 
        q.eq("userId", targetUserId).eq("courseId", args.courseId)
      )
      .first();

    if (!enrollment) return null;

    // Get completed content
    const completedContent = await ctx.db
      .query("courseProgress")
      .withIndex("by_user_course", (q) => 
        q.eq("userId", targetUserId).eq("courseId", args.courseId)
      )
      .collect();

    // Get course content to calculate progress
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const totalContent = courseContent.length;
    const completedCount = completedContent.length;
    const progressPercentage = totalContent > 0 ? Math.round((completedCount / totalContent) * 100) : 0;

    return {
      enrollment,
      completedContent,
      totalContent,
      completedCount,
      progressPercentage,
    };
  },
});

// Get user's enrolled courses
export const getMyEnrolledCourses = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 20;

    // Get enrollments
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sort by enrollment date (newest first)
    enrollments.sort((a, b) => b.enrolledAt - a.enrolledAt);

    // Limit results
    const limitedEnrollments = enrollments.slice(0, limit);

    // Get course details
    const coursesWithProgress: any[] = await Promise.all(
      limitedEnrollments.map(async (enrollment): Promise<any> => {
        const course = await ctx.db.get(enrollment.courseId);
        if (!course) return null;

        // Get author info
        const author = await ctx.db.get(course.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), course.authorId))
          .first();

        // Get progress
        const progress: any = await ctx.runQuery(api.courseProgress.getCourseProgress, {
          courseId: enrollment.courseId,
          userId,
        });

        return {
          ...course,
          enrollment,
          progress,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return coursesWithProgress.filter(Boolean);
  },
});

// Internal function to update course progress percentage
export const updateCourseProgress = internalMutation({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    // Get enrollment
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user_course", (q) => 
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .first();

    if (!enrollment) return;

    // Get course content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Get completed content
    const completedContent = await ctx.db
      .query("courseProgress")
      .withIndex("by_user_course", (q) => 
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .collect();

    const totalContent = courseContent.length;
    const completedCount = completedContent.length;
    const progressPercentage = totalContent > 0 ? Math.round((completedCount / totalContent) * 100) : 0;

    // Update enrollment progress
    await ctx.db.patch(enrollment._id, {
      progress: progressPercentage,
      lastAccessedAt: Date.now(),
    });

    // Check if course is completed
    if (progressPercentage === 100 && !enrollment.completedAt) {
      await ctx.db.patch(enrollment._id, {
        completedAt: Date.now(),
      });

      // Get course for author notification
      const course = await ctx.db.get(args.courseId);
      if (course) {
        // Notify course author
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'COURSE_COMPLETED',
          recipientUserId: course.authorId,
          actorUserId: args.userId,
          relatedContentType: 'course',
          relatedContentId: args.courseId,
        });
      }
    }

    return progressPercentage;
  },
});

// Check if user has access to specific content (enrolled in course or purchased individually)
export const hasContentAccess = query({
  args: {
    contentType: v.string(), // "article" | "reel"
    contentId: v.union(v.id("articles"), v.id("reels")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    // Check if content is not gated
    let content: any = null;
    if (args.contentType === 'article') {
      content = await ctx.db.get(args.contentId as any);
    } else if (args.contentType === 'reel') {
      content = await ctx.db.get(args.contentId as any);
    }

    if (!content || !content.isGated) {
      return true; // Free content
    }

    // Check if user owns the content
    if (content.authorId === userId) {
      return true;
    }

    // Check if purchased individually
    const individualPurchase = await ctx.db
      .query("payments")
      .withIndex("by_user_content", (q) => 
        q.eq("payerId", userId)
         .eq("contentType", args.contentType)
         .eq("contentId", args.contentId)
      )
      .first();

    if (individualPurchase) {
      return true;
    }

    // Check if enrolled in a course that contains this content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_content", (q) => 
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .collect();

    for (const courseItem of courseContent) {
      // Check if enrolled in this course
      const enrollment = await ctx.db
        .query("courseEnrollments")
        .withIndex("by_user_course", (q) => 
          q.eq("userId", userId).eq("courseId", courseItem.courseId)
        )
        .first();

      if (enrollment) {
        return true;
      }

      // Check if purchased the course
      const coursePurchase = await ctx.db
        .query("payments")
        .withIndex("by_user_content", (q) => 
          q.eq("payerId", userId)
           .eq("contentType", "course")
           .eq("contentId", courseItem.courseId)
        )
        .first();

      if (coursePurchase) {
        return true;
      }
    }

    return false;
  },
});