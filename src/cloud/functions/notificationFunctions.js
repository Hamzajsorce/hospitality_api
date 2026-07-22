const notificationService = require('../../services/notificationService');
const { requireUser } = require('../../middleware/auth');
const { ok, fail } = require('../../utils/response');
const { defineCloudFunction } = require('../../swagger/defineCloudFunction');

function registerNotificationFunctions() {
  defineCloudFunction(
    'getNotificationList',
    async (request) => {
      try {
        requireUser(request);
        const result = await notificationService.listForUser(request.params, request.user);
        return ok(result.data, 'Notifications loaded', result.meta);
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Notifications'],
      summary: 'List notifications for the current user',
      parameters: {
        limit: { schema: { type: 'integer' } },
        skip: { schema: { type: 'integer' } },
        isRead: { schema: { type: 'boolean' } },
      },
    }
  );

  defineCloudFunction(
    'getUnreadNotificationCount',
    async (request) => {
      try {
        requireUser(request);
        const result = await notificationService.getUnreadCount(request.user);
        return ok(result, 'Unread count loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Notifications'],
      summary: 'Get unread notification count for the current user',
    }
  );

  defineCloudFunction(
    'markNotificationRead',
    async (request) => {
      try {
        requireUser(request);
        const notification = await notificationService.markRead(
          request.params.notificationId,
          request.user
        );
        return ok(notification, 'Notification marked as read');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Notifications'],
      summary: 'Mark a single notification as read',
      parameters: {
        notificationId: { required: true, schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'markAllNotificationsRead',
    async (request) => {
      try {
        requireUser(request);
        const result = await notificationService.markAllRead(request.user);
        return ok(result, 'All notifications marked as read');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read for the current user',
    }
  );
}

module.exports = { registerNotificationFunctions };
