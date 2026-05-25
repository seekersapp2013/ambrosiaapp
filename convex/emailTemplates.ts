import { NOTIFICATION_TYPES } from "./notifications";

// Email template interface
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Template data interface
export interface TemplateData {
  recipientName: string;
  actorName?: string;
  actorUsername?: string;
  contentTitle?: string;
  contentType?: string;
  amount?: string;
  token?: string;
  commentText?: string;
  appName: string;
  appUrl: string;
  unsubscribeUrl: string;
  notificationSettingsUrl: string;
}

// Base HTML template wrapper
const baseHtmlTemplate = (content: string, data: TemplateData) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification from ${data.appName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .notification-content {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .actor {
            font-weight: 600;
            color: #007bff;
        }
        .content-title {
            font-style: italic;
            color: #6c757d;
        }
        .cta-button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
            text-align: center;
        }
        .footer a {
            color: #007bff;
            text-decoration: none;
        }
        .unsubscribe {
            margin-top: 20px;
            font-size: 12px;
            color: #adb5bd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${data.appName}</div>
            <div>You have a new notification</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>
                <a href="${data.notificationSettingsUrl}">Manage notification preferences</a> | 
                <a href="${data.appUrl}">Visit ${data.appName}</a>
            </p>
            <div class="unsubscribe">
                <a href="${data.unsubscribeUrl}">Unsubscribe from these emails</a>
            </div>
        </div>
    </div>
</body>
</html>
`;

// Template generators for each notification type
export const emailTemplateGenerators = {
  NEW_FOLLOWER: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} started following you on ${data.appName}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>🎉 You have a new follower!</h2>
        <p><span class="actor">${data.actorName}</span> (@${data.actorUsername}) started following you.</p>
        <p>They'll now see your latest content in their feed.</p>
        <a href="${data.appUrl}/profile/${data.actorUsername}" class="cta-button">View their profile</a>
      </div>
    `, data),
    text: `${data.actorName} (@${data.actorUsername}) started following you on ${data.appName}. View their profile: ${data.appUrl}/profile/${data.actorUsername}`
  }),

  FOLLOWER_NEW_POST: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} published new content on ${data.appName}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>📝 New content from someone you follow</h2>
        <p><span class="actor">${data.actorName}</span> published a new ${data.contentType}:</p>
        <p class="content-title">"${data.contentTitle}"</p>
        <a href="${data.appUrl}/${data.contentType}s" class="cta-button">Read now</a>
      </div>
    `, data),
    text: `${data.actorName} published a new ${data.contentType}: "${data.contentTitle}" on ${data.appName}. Read it: ${data.appUrl}/${data.contentType}s`
  }),

  CONTENT_LIKED: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} liked your ${data.contentType} on ${data.appName}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>👍 Your content was liked!</h2>
        <p><span class="actor">${data.actorName}</span> liked your ${data.contentType}:</p>
        <p class="content-title">"${data.contentTitle}"</p>
        <a href="${data.appUrl}/${data.contentType}s" class="cta-button">View your ${data.contentType}</a>
      </div>
    `, data),
    text: `${data.actorName} liked your ${data.contentType} "${data.contentTitle}" on ${data.appName}. View it: ${data.appUrl}/${data.contentType}s`
  }),

  CONTENT_CLAPPED: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} clapped for your ${data.contentType} on ${data.appName}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>👏 Your content received claps!</h2>
        <p><span class="actor">${data.actorName}</span> clapped for your ${data.contentType}:</p>
        <p class="content-title">"${data.contentTitle}"</p>
        <p>Claps show appreciation for quality content. Keep up the great work!</p>
        <a href="${data.appUrl}/${data.contentType}s" class="cta-button">View your ${data.contentType}</a>
      </div>
    `, data),
    text: `${data.actorName} clapped for your ${data.contentType} "${data.contentTitle}" on ${data.appName}. View it: ${data.appUrl}/${data.contentType}s`
  }),

  CONTENT_COMMENTED: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} commented on your ${data.contentType}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>💬 New comment on your content</h2>
        <p><span class="actor">${data.actorName}</span> commented on your ${data.contentType}:</p>
        <p class="content-title">"${data.contentTitle}"</p>
        ${data.commentText ? `<p><em>"${data.commentText}"</em></p>` : ''}
        <a href="${data.appUrl}/${data.contentType}s" class="cta-button">View comment</a>
      </div>
    `, data),
    text: `${data.actorName} commented on your ${data.contentType} "${data.contentTitle}" on ${data.appName}. View comment: ${data.appUrl}/${data.contentType}s`
  }),

  COMMENT_REPLY: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} replied to your comment`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>💬 Someone replied to your comment</h2>
        <p><span class="actor">${data.actorName}</span> replied to your comment.</p>
        ${data.commentText ? `<p><em>"${data.commentText}"</em></p>` : ''}
        <a href="${data.appUrl}/${data.contentType}s" class="cta-button">View reply</a>
      </div>
    `, data),
    text: `${data.actorName} replied to your comment on ${data.appName}. View reply: ${data.appUrl}/${data.contentType}s`
  }),

  CONTENT_PAYMENT: (data: TemplateData): EmailTemplate => ({
    subject: `💰 You received ${data.amount} ${data.token} for your ${data.contentType}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>💰 Payment received!</h2>
        <p><span class="actor">${data.actorName}</span> paid <strong>${data.amount} ${data.token}</strong> to access your ${data.contentType}:</p>
        <p class="content-title">"${data.contentTitle}"</p>
        <p>Your quality content is earning you tokens. Keep creating!</p>
        <a href="${data.appUrl}/earnings" class="cta-button">View earnings</a>
      </div>
    `, data),
    text: `${data.actorName} paid ${data.amount} ${data.token} to access your ${data.contentType} "${data.contentTitle}" on ${data.appName}. View earnings: ${data.appUrl}/earnings`
  }),

  USER_MENTIONED: (data: TemplateData): EmailTemplate => ({
    subject: `${data.actorName} mentioned you on ${data.appName}`,
    html: baseHtmlTemplate(`
      <div class="notification-content">
        <h2>@️ You were mentioned!</h2>
        <p><span class="actor">${data.actorName}</span> mentioned you in a ${data.contentType}.</p>
        <a href="${data.appUrl}/${data.contentType}s" class="cta-button">See mention</a>
      </div>
    `, data),
    text: `${data.actorName} mentioned you in a ${data.contentType} on ${data.appName}. See mention: ${data.appUrl}/${data.contentType}s`
  })
};

// Generate email template for a notification type
export function generateEmailTemplate(
  notificationType: string,
  templateData: TemplateData
): EmailTemplate | null {
  const generator = emailTemplateGenerators[notificationType as keyof typeof emailTemplateGenerators];
  if (!generator) {
    console.warn(`No email template generator found for notification type: ${notificationType}`);
    return null;
  }
  
  return generator(templateData);
}

// Batch notification email template
export function generateBatchEmailTemplate(
  notifications: Array<{
    type: string;
    actorName?: string;
    contentTitle?: string;
    contentType?: string;
  }>,
  data: TemplateData
): EmailTemplate {
  const notificationCount = notifications.length;
  const groupedByType = notifications.reduce((acc, notif) => {
    acc[notif.type] = (acc[notif.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summaryItems = Object.entries(groupedByType).map(([type, count]) => {
    const typeConfig = NOTIFICATION_TYPES[type];
    return `${count} ${typeConfig?.name || type}${count > 1 ? 's' : ''}`;
  });

  const subject = `You have ${notificationCount} new notification${notificationCount > 1 ? 's' : ''} on ${data.appName}`;

  const notificationsList = notifications.slice(0, 5).map(notif => {
    const typeConfig = NOTIFICATION_TYPES[notif.type];
    return `<li>${typeConfig?.name || notif.type}${notif.actorName ? ` from ${notif.actorName}` : ''}${notif.contentTitle ? ` on "${notif.contentTitle}"` : ''}</li>`;
  }).join('');

  const html = baseHtmlTemplate(`
    <div class="notification-content">
      <h2>📬 You have ${notificationCount} new notification${notificationCount > 1 ? 's' : ''}</h2>
      <p>Here's a summary of your recent activity:</p>
      <ul>
        ${notificationsList}
        ${notifications.length > 5 ? `<li><em>...and ${notifications.length - 5} more</em></li>` : ''}
      </ul>
      <p><strong>Summary:</strong> ${summaryItems.join(', ')}</p>
      <a href="${data.appUrl}/notifications" class="cta-button">View all notifications</a>
    </div>
  `, data);

  const text = `You have ${notificationCount} new notifications on ${data.appName}. Summary: ${summaryItems.join(', ')}. View all: ${data.appUrl}/notifications`;

  return { subject, html, text };
}

// Validate template data
export function validateTemplateData(data: Partial<TemplateData>): TemplateData {
  return {
    recipientName: data.recipientName || 'User',
    actorName: data.actorName || 'Someone',
    actorUsername: data.actorUsername || 'user',
    contentTitle: data.contentTitle || 'content',
    contentType: data.contentType || 'content',
    amount: data.amount || '0',
    token: data.token || 'tokens',
    commentText: data.commentText || '',
    appName: data.appName || 'Ambrosia',
    appUrl: data.appUrl || 'https://oathstone.cloud',
    unsubscribeUrl: data.unsubscribeUrl || 'https://oathstone.cloud/unsubscribe',
    notificationSettingsUrl: data.notificationSettingsUrl || 'https://oathstone.cloud/settings/notifications'
  };
}