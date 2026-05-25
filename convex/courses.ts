import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Create a new course
export const createCourse = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    priceCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate required fields
    if (!args.title.trim()) {
      throw new Error("Course title is required");
    }
    
    if (!args.description.trim()) {
      throw new Error("Course description is required");
    }

    const courseId = await ctx.db.insert("courses", {
      authorId: userId,
      title: args.title,
      description: args.description,
      coverImage: args.coverImage,
      category: args.category,
      tags: args.tags,
      totalPrice: 0, // Will be calculated when content is added
      priceCurrency: args.priceCurrency,
      isPublished: false, // Start as draft
      createdAt: Date.now(),
    });

    return courseId;
  },
});

// Add content to course
export const addContentToCourse = mutation({
  args: {
    courseId: v.id("courses"),
    contentType: v.string(), // "article" | "reel"
    contentId: v.union(v.id("articles"), v.id("reels")),
    order: v.number(),
    isRequired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify course exists and user owns it
    const course = await ctx.db.get(args.courseId);
    if (!course || course.authorId !== userId) {
      throw new Error("Course not found or access denied");
    }

    // Verify content exists and user owns it
    let content: any = null;
    if (args.contentType === 'article') {
      content = await ctx.db.get(args.contentId as any);
    } else if (args.contentType === 'reel') {
      content = await ctx.db.get(args.contentId as any);
    }

    if (!content || content.authorId !== userId) {
      throw new Error("Content not found or access denied");
    }

    // Check if content is already used in ANY course (one-content-per-course rule)
    const existingUsage = await ctx.db
      .query("courseContent")
      .withIndex("by_content", (q) => 
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .first();

    if (existingUsage) {
      const existingCourse = await ctx.db.get(existingUsage.courseId);
      throw new Error(`Content is already used in course: "${existingCourse?.title || 'Unknown Course'}". Each content can only be used in one course.`);
    }

    // Add content to course
    await ctx.db.insert("courseContent", {
      courseId: args.courseId,
      contentType: args.contentType,
      contentId: args.contentId,
      order: args.order,
      isRequired: args.isRequired,
      createdAt: Date.now(),
    });

    // Recalculate course total price
    await ctx.scheduler.runAfter(0, internal.courses.recalculateCoursePrice, {
      courseId: args.courseId,
    });

    return { success: true };
  },
});

// Remove content from course
export const removeContentFromCourse = mutation({
  args: {
    courseId: v.id("courses"),
    contentType: v.string(),
    contentId: v.union(v.id("articles"), v.id("reels")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify course exists and user owns it
    const course = await ctx.db.get(args.courseId);
    if (!course || course.authorId !== userId) {
      throw new Error("Course not found or access denied");
    }

    // Find and remove content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => 
        q.and(
          q.eq(q.field("contentType"), args.contentType),
          q.eq(q.field("contentId"), args.contentId)
        )
      )
      .first();

    if (!courseContent) {
      throw new Error("Content not found in course");
    }

    await ctx.db.delete(courseContent._id);

    // Recalculate course total price
    await ctx.scheduler.runAfter(0, internal.courses.recalculateCoursePrice, {
      courseId: args.courseId,
    });

    return { success: true };
  },
});

// Publish course
export const publishCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify course exists and user owns it
    const course = await ctx.db.get(args.courseId);
    if (!course || course.authorId !== userId) {
      throw new Error("Course not found or access denied");
    }

    // Check if course has content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    if (courseContent.length === 0) {
      throw new Error("Cannot publish course without content");
    }

    // Update course status
    await ctx.db.patch(args.courseId, {
      isPublished: true,
      updatedAt: Date.now(),
    });

    // Notify followers about new course
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();

    // Create notifications for all followers
    for (const follow of followers) {
      await ctx.runMutation(internal.notifications.createNotificationEvent, {
        type: 'NEW_COURSE',
        recipientUserId: follow.followerId,
        actorUserId: userId,
        relatedContentType: 'course',
        relatedContentId: args.courseId,
      });
    }

    return { success: true };
  },
});

// Get course by ID with content
export const getCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) return null;

    // Get author info
    const author = await ctx.db.get(course.authorId);
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), course.authorId))
      .first();

    // Get course content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Sort content by order
    courseContent.sort((a, b) => a.order - b.order);

    // Get content details
    const contentDetails = await Promise.all(
      courseContent.map(async (item) => {
        let content: any = null;
        if (item.contentType === 'article') {
          content = await ctx.db.get(item.contentId as any);
        } else if (item.contentType === 'reel') {
          content = await ctx.db.get(item.contentId as any);
        }

        return {
          ...item,
          content,
        };
      })
    );

    return {
      ...course,
      author: {
        id: author?._id,
        name: author?.name || profile?.name,
        username: profile?.username,
        avatar: profile?.avatar,
      },
      content: contentDetails,
    };
  },
});

// List courses (published only for public, all for author)
export const listCourses = query({
  args: { 
    limit: v.optional(v.number()),
    authorId: v.optional(v.id("users")),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limit = args.limit || 20;

    let courses;

    // Filter by author if specified
    if (args.authorId !== undefined) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_author", (q) => q.eq("authorId", args.authorId!))
        .collect();
    }
    // Filter by category if specified
    else if (args.category !== undefined) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }
    // Get all courses
    else {
      courses = await ctx.db.query("courses").collect();
    }

    // Filter published courses unless viewing own courses
    if (!args.authorId || args.authorId !== userId) {
      courses = courses.filter(course => course.isPublished);
    }

    // Sort by creation date (newest first)
    courses.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    courses = courses.slice(0, limit);

    // Get author info for each course
    const coursesWithAuthors = await Promise.all(
      courses.map(async (course) => {
        const author = await ctx.db.get(course.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), course.authorId))
          .first();

        // Get content count
        const contentCount = await ctx.db
          .query("courseContent")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        return {
          ...course,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
          contentCount: contentCount.length,
        };
      })
    );

    return coursesWithAuthors;
  },
});

// Get courses created by current user
export const getMyCourses = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 20;

    // Get courses created by this user
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    // Sort by creation date (newest first)
    courses.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    const limitedCourses = courses.slice(0, limit);

    // Get author info and content count for each course
    const coursesWithDetails = await Promise.all(
      limitedCourses.map(async (course) => {
        const author = await ctx.db.get(course.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), course.authorId))
          .first();

        // Get content count
        const contentCount = await ctx.db
          .query("courseContent")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        // Get enrollment count
        const enrollmentCount = await ctx.db
          .query("courseEnrollments")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        return {
          ...course,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
          contentCount: contentCount.length,
          enrollmentCount: enrollmentCount.length,
        };
      })
    );

    return coursesWithDetails;
  },
});
export const recalculateCoursePrice = internalMutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) return;

    // Get all course content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    let totalPrice = 0;

    // Sum up prices from all gated content
    for (const item of courseContent) {
      let content: any = null;
      if (item.contentType === 'article') {
        content = await ctx.db.get(item.contentId as any);
      } else if (item.contentType === 'reel') {
        content = await ctx.db.get(item.contentId as any);
      }

      if (content && content.isGated && content.priceAmount) {
        // Convert to course currency if needed (for now, assume same currency)
        if (content.priceToken === course.priceCurrency) {
          totalPrice += content.priceAmount;
        }
      }
    }

    // Update course total price
    await ctx.db.patch(args.courseId, {
      totalPrice,
      updatedAt: Date.now(),
    });
  },
});

// Get available content for course (excludes content already used in other courses)
export const getAvailableContentForCourse = query({
  args: {
    courseId: v.optional(v.id("courses")), // Optional - if provided, excludes content from other courses but allows current course content
    contentType: v.optional(v.string()), // "article" | "reel" | undefined for both
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { articles: [], reels: [] };

    // Get all content already used in courses (excluding current course if provided)
    const usedContent = await ctx.db
      .query("courseContent")
      .collect();

    // Filter out content from other courses
    const usedInOtherCourses = usedContent.filter(item => 
      args.courseId ? item.courseId !== args.courseId : true
    );

    const usedArticleIds = new Set(
      usedInOtherCourses
        .filter(item => item.contentType === 'article')
        .map(item => item.contentId)
    );

    const usedReelIds = new Set(
      usedInOtherCourses
        .filter(item => item.contentType === 'reel')
        .map(item => item.contentId)
    );

    let availableArticles: any[] = [];
    let availableReels: any[] = [];

    // Get available articles if requested
    if (!args.contentType || args.contentType === 'article') {
      const allArticles = await ctx.db
        .query("articles")
        .withIndex("by_author", (q) => q.eq("authorId", userId))
        .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
        .collect();

      availableArticles = allArticles.filter(article => 
        !usedArticleIds.has(article._id)
      );
    }

    // Get available reels if requested
    if (!args.contentType || args.contentType === 'reel') {
      const allReels = await ctx.db
        .query("reels")
        .withIndex("by_author", (q) => q.eq("authorId", userId))
        .collect();

      availableReels = allReels.filter(reel => 
        !usedReelIds.has(reel._id)
      );
    }

    return {
      articles: availableArticles,
      reels: availableReels,
    };
  },
});

// Get courses that contain specific content
export const getCoursesForContent = query({
  args: {
    contentType: v.string(), // "article" | "reel"
    contentId: v.union(v.id("articles"), v.id("reels")),
  },
  handler: async (ctx, args) => {
    // Find all courses containing this content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_content", (q) => 
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .collect();

    if (courseContent.length === 0) {
      return [];
    }

    // Get course details and calculate position
    const coursesWithPosition = await Promise.all(
      courseContent.map(async (item) => {
        const course = await ctx.db.get(item.courseId);
        if (!course) return null;

        // Get all content in this course to calculate position
        const allCourseContent = await ctx.db
          .query("courseContent")
          .withIndex("by_course", (q) => q.eq("courseId", item.courseId))
          .collect();

        // Sort by order and find position
        const sortedContent = allCourseContent.sort((a, b) => a.order - b.order);
        const position = sortedContent.findIndex(content => 
          content.contentType === args.contentType && content.contentId === args.contentId
        ) + 1;

        return {
          courseId: course._id,
          courseTitle: course.title,
          isPublished: course.isPublished,
          position,
          totalContent: allCourseContent.length,
          order: item.order,
        };
      })
    );

    return coursesWithPosition.filter(Boolean);
  },
});

// Get purchase options for content (individual vs course)
export const getContentPurchaseOptions = query({
  args: {
    contentType: v.string(), // "article" | "reel"
    contentId: v.union(v.id("articles"), v.id("reels")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get the content
    let content: any = null;
    if (args.contentType === 'article') {
      content = await ctx.db.get(args.contentId as any);
    } else if (args.contentType === 'reel') {
      content = await ctx.db.get(args.contentId as any);
    }

    if (!content || !content.isGated) {
      return null; // Free content doesn't need purchase options
    }

    // Get courses containing this content
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_content", (q) => 
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .collect();

    const courseOptions = await Promise.all(
      courseContent.map(async (item) => {
        const course = await ctx.db.get(item.courseId);
        if (!course || !course.isPublished) return null;

        // Check if user already has access to this course
        const enrollment = await ctx.db
          .query("courseEnrollments")
          .withIndex("by_user_course", (q) => 
            q.eq("userId", userId).eq("courseId", course._id)
          )
          .first();

        const coursePurchase = await ctx.db
          .query("payments")
          .withIndex("by_user_content", (q) => 
            q.eq("payerId", userId)
             .eq("contentType", "course")
             .eq("contentId", course._id)
          )
          .first();

        // Get all course content to calculate savings
        const allCourseContent = await ctx.db
          .query("courseContent")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();

        // Calculate individual content prices
        let totalIndividualPrice = 0;
        for (const courseItem of allCourseContent) {
          let itemContent: any = null;
          if (courseItem.contentType === 'article') {
            itemContent = await ctx.db.get(courseItem.contentId as any);
          } else if (courseItem.contentType === 'reel') {
            itemContent = await ctx.db.get(courseItem.contentId as any);
          }
          
          if (itemContent && itemContent.isGated && itemContent.priceAmount) {
            totalIndividualPrice += itemContent.priceAmount;
          }
        }

        const savings = totalIndividualPrice - course.totalPrice;

        return {
          courseId: course._id,
          courseTitle: course.title,
          coursePrice: course.totalPrice,
          courseCurrency: course.priceCurrency,
          totalContent: allCourseContent.length,
          totalIndividualPrice,
          savings: Math.max(0, savings),
          hasAccess: !!(enrollment || coursePurchase),
        };
      })
    );

    return {
      individualPrice: content.priceAmount,
      individualCurrency: content.priceToken,
      courseOptions: courseOptions.filter(Boolean),
    };
  },
});

// Reorder content in course
export const reorderCourseContent = mutation({
  args: {
    courseId: v.id("courses"),
    contentUpdates: v.array(v.object({
      contentType: v.string(),
      contentId: v.union(v.id("articles"), v.id("reels")),
      newOrder: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify course exists and user owns it
    const course = await ctx.db.get(args.courseId);
    if (!course || course.authorId !== userId) {
      throw new Error("Course not found or access denied");
    }

    // Update each content item's order
    for (const update of args.contentUpdates) {
      const courseContent = await ctx.db
        .query("courseContent")
        .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
        .filter((q) => 
          q.and(
            q.eq(q.field("contentType"), update.contentType),
            q.eq(q.field("contentId"), update.contentId)
          )
        )
        .first();

      if (courseContent) {
        await ctx.db.patch(courseContent._id, {
          order: update.newOrder,
        });
      }
    }

    return { success: true };
  },
});

// Update course details
export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priceCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify course exists and user owns it
    const course = await ctx.db.get(args.courseId);
    if (!course || course.authorId !== userId) {
      throw new Error("Course not found or access denied");
    }

    // Prepare update object with only provided fields
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      if (!args.title.trim()) {
        throw new Error("Course title cannot be empty");
      }
      updateData.title = args.title.trim();
    }

    if (args.description !== undefined) {
      if (!args.description.trim()) {
        throw new Error("Course description cannot be empty");
      }
      updateData.description = args.description.trim();
    }

    if (args.coverImage !== undefined) {
      updateData.coverImage = args.coverImage;
    }

    if (args.category !== undefined) {
      updateData.category = args.category;
    }

    if (args.tags !== undefined) {
      updateData.tags = args.tags;
    }

    if (args.priceCurrency !== undefined) {
      updateData.priceCurrency = args.priceCurrency;
      // Recalculate price if currency changed
      await ctx.scheduler.runAfter(0, internal.courses.recalculateCoursePrice, {
        courseId: args.courseId,
      });
    }

    // Update the course
    await ctx.db.patch(args.courseId, updateData);

    return { success: true };
  },
});

// Delete course (permanently remove from database)
export const deleteCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify course exists and user owns it
    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Only the course author can delete their course
    if (course.authorId !== userId) {
      throw new Error("Not authorized to delete this course");
    }

    // Prevent deletion of published courses with enrollments
    if (course.isPublished) {
      const enrollments = await ctx.db
        .query("courseEnrollments")
        .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
        .collect();
      
      if (enrollments.length > 0) {
        throw new Error("Cannot delete a published course with active enrollments. Please contact support if you need to remove this course.");
      }
    }

    // Get all related data that needs to be cleaned up
    const courseContent = await ctx.db
      .query("courseContent")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const progress = await ctx.db
      .query("courseProgress")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_content", (q) => q.eq("contentType", "course").eq("contentId", args.courseId))
      .collect();

    // Delete all related data
    for (const content of courseContent) {
      await ctx.db.delete(content._id);
    }

    for (const enrollment of enrollments) {
      await ctx.db.delete(enrollment._id);
    }

    for (const progressItem of progress) {
      await ctx.db.delete(progressItem._id);
    }

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // Delete the course itself
    await ctx.db.delete(args.courseId);

    return { 
      success: true, 
      deletedContent: courseContent.length,
      deletedEnrollments: enrollments.length,
      deletedProgress: progress.length,
      deletedPayments: payments.length
    };
  },
});

// Get all course-related content (articles and reels that belong to courses)
// In "all" mode, shows ALL approved content (not just course content)
export const getCourseRelatedContent = query({
  args: {
    limit: v.optional(v.number()),
    viewMode: v.optional(v.string()), // "all" | "my-courses" | "enrolled"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { articles: [], reels: [] };

    const limit = args.limit || 50;

    // For "all" mode, show ALL approved content (not just course content)
    if (args.viewMode === 'all' || !args.viewMode) {
      // Get all published articles with STRICT approval filtering
      const allArticles = await ctx.db
        .query("articles")
        .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
        .filter((q) => q.and(
          q.or(
            q.eq(q.field("isPublic"), true),
            q.eq(q.field("isPublic"), undefined)
          ),
          // STRICT: Only show APPROVED or NOT_REQUIRED content, or content without approval status (legacy)
          q.or(
            q.eq(q.field("approvalStatus"), "APPROVED"),
            q.eq(q.field("approvalStatus"), "NOT_REQUIRED"),
            q.eq(q.field("approvalStatus"), undefined)
          )
        ))
        .order("desc")
        .take(limit);

      // Get all reels with STRICT approval filtering
      const allReels = await ctx.db
        .query("reels")
        .withIndex("by_created", (q) => q)
        .order("desc")
        .filter((q) => q.and(
          q.or(
            q.eq(q.field("isPublic"), true),
            q.eq(q.field("isPublic"), undefined)
          ),
          // STRICT: Only show APPROVED or NOT_REQUIRED content, or content without approval status (legacy)
          q.or(
            q.eq(q.field("approvalStatus"), "APPROVED"),
            q.eq(q.field("approvalStatus"), "NOT_REQUIRED"),
            q.eq(q.field("approvalStatus"), undefined)
          )
        ))
        .take(limit);

      // Get author info for articles
      const articlesWithAuthors = await Promise.all(
        allArticles.map(async (article) => {
          const authorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", article.authorId))
            .first();

          return {
            ...article,
            author: {
              id: article.authorId,
              name: authorProfile?.name,
              username: authorProfile?.username,
              avatar: authorProfile?.avatar,
            },
          };
        })
      );

      // Get author info for reels
      const reelsWithAuthors = await Promise.all(
        allReels.map(async (reel) => {
          const authorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", reel.authorId))
            .first();

          return {
            ...reel,
            author: {
              id: reel.authorId,
              name: authorProfile?.name,
              username: authorProfile?.username,
              avatar: authorProfile?.avatar,
            },
          };
        })
      );

      return {
        articles: articlesWithAuthors,
        reels: reelsWithAuthors,
      };
    }

    // For "my-courses" and "enrolled" modes, show only course content
    let courseIds: string[] = [];

    // Get relevant course IDs based on view mode
    if (args.viewMode === 'my-courses') {
      // Get courses created by the user
      const myCourses = await ctx.db
        .query("courses")
        .withIndex("by_author", (q) => q.eq("authorId", userId))
        .collect();
      courseIds = myCourses.map(course => course._id);
    } else if (args.viewMode === 'enrolled') {
      // Get courses the user is enrolled in
      const enrollments = await ctx.db
        .query("courseEnrollments")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      courseIds = enrollments.map(enrollment => enrollment.courseId);
    }

    if (courseIds.length === 0) {
      return { articles: [], reels: [] };
    }

    // Get all course content for these courses
    const courseContent = await ctx.db
      .query("courseContent")
      .collect();

    const relevantContent = courseContent.filter(content => 
      courseIds.includes(content.courseId)
    );

    // Separate article and reel IDs
    const articleIds = relevantContent
      .filter(content => content.contentType === 'article')
      .map(content => content.contentId);
    
    const reelIds = relevantContent
      .filter(content => content.contentType === 'reel')
      .map(content => content.contentId);

    // Fetch articles and reels with STRICT approval filtering
    const articles = await Promise.all(
      articleIds.slice(0, limit).map(async (id) => {
        const article = await ctx.db.get(id as any);
        if (!article || !('authorId' in article)) return null;

        // STRICT: Only show APPROVED, NOT_REQUIRED, or legacy content (undefined approval status)
        const approvalStatus = (article as any).approvalStatus;
        if (approvalStatus !== "APPROVED" && approvalStatus !== "NOT_REQUIRED" && approvalStatus !== undefined) {
          return null;
        }

        // Only show PUBLISHED articles
        if ((article as any).status !== "PUBLISHED") {
          return null;
        }

        // Get author profile info
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", article.authorId as any))
          .first();

        return {
          ...article,
          author: {
            id: article.authorId as any,
            name: authorProfile?.name,
            username: authorProfile?.username,
            avatar: authorProfile?.avatar,
          },
        };
      })
    );

    const reels = await Promise.all(
      reelIds.slice(0, limit).map(async (id) => {
        const reel = await ctx.db.get(id as any);
        if (!reel || !('authorId' in reel)) return null;

        // STRICT: Only show APPROVED, NOT_REQUIRED, or legacy content (undefined approval status)
        const approvalStatus = (reel as any).approvalStatus;
        if (approvalStatus !== "APPROVED" && approvalStatus !== "NOT_REQUIRED" && approvalStatus !== undefined) {
          return null;
        }

        // Get author profile info
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", reel.authorId as any))
          .first();

        return {
          ...reel,
          author: {
            id: reel.authorId as any,
            name: authorProfile?.name,
            username: authorProfile?.username,
            avatar: authorProfile?.avatar,
          },
        };
      })
    );

    return {
      articles: articles.filter(Boolean),
      reels: reels.filter(Boolean),
    };
  },
});