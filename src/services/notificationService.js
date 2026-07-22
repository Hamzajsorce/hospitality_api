const notificationRepository = require('../repositories/notificationRepository');
const userRepository = require('../repositories/userRepository');
const { AppError } = require('../utils/AppError');
const TelegramNotifier = require('../utils/telegramNotifier');

const telegramToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAMOTTOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAMCHATID;
const telegramNotifier = new TelegramNotifier(telegramToken, telegramChatId);

console.info('NotificationService Telegram configuration loaded.', telegramNotifier.getConfigSummary());

function ensureOwnNotification(notification, user) {
  if (notification.targetUserId !== user.id) {
    throw new AppError('You are not authorized to access this notification', 403);
  }
}

function buildTelegramNotificationMessage(notification) {
  return telegramNotifier.buildMessage(notification.title, notification.text);
}

async function listForUser(params = {}, user) {
  const limit = Math.min(Number(params.limit || 20), 100);
  const skip = Number(params.skip || 0);
  const filters = {
    limit,
    skip,
    targetUserId: user.id,
    orderBy: params.orderBy || '-createdAt',
  };

  if (params.isRead !== undefined && params.isRead !== null) {
    filters.isRead = params.isRead === true || params.isRead === 'true';
  }

  return notificationRepository.findNotifications(filters);
}

async function getUnreadCount(user) {
  const count = await notificationRepository.countUnread(user.id);
  return { count };
}

async function markRead(notificationId, user) {
  const notification = await notificationRepository.findNotificationById(notificationId);
  ensureOwnNotification(notification, user);
  return notificationRepository.markAsRead(notificationId);
}

async function markAllRead(user) {
  const updated = await notificationRepository.markAllAsRead(user.id);
  return { updated };
}

async function createForUser(payload) {
  if (!payload.targetUserId) throw new AppError('Target user is required');
  if (!payload.title) throw new AppError('Notification title is required');
  if (!payload.text) throw new AppError('Notification text is required');

  const notification = await notificationRepository.createNotification({
    targetUserId: payload.targetUserId,
    title: String(payload.title).trim(),
    text: String(payload.text).trim(),
    moduleType: payload.moduleType || undefined,
    moduleId: payload.moduleId || undefined,
  });

  if (!payload.skipTelegram) {
    console.info('NotificationService sending Telegram notification for user notification.', {
      notificationId: notification.objectId,
      targetUserId: payload.targetUserId,
      moduleType: notification.moduleType,
      moduleId: notification.moduleId,
    });
    await telegramNotifier.send(buildTelegramNotificationMessage(notification));
  }

  return notification;
}

async function createForUsers(userIds = [], payload) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const results = [];

  for (const targetUserId of uniqueIds) {
    results.push(
      await createForUser({
        ...payload,
        targetUserId,
        skipTelegram: true,
      })
    );
  }

  if (uniqueIds.length && payload.title && payload.text) {
    console.info('NotificationService sending Telegram notification for role/user group.', {
      recipients: uniqueIds.length,
      moduleType: payload.moduleType,
      moduleId: payload.moduleId,
    });
    await telegramNotifier.send(telegramNotifier.buildMessage(payload.title, payload.text));
  } else {
    console.warn('NotificationService skipped Telegram group notification.', {
      recipients: uniqueIds.length,
      hasTitle: Boolean(payload.title),
      hasText: Boolean(payload.text),
    });
  }

  return results;
}

async function createForRole(role, payload) {
  const users = await userRepository.findUsersByRole(role);
  return createForUsers(
    users.map((user) => user.objectId),
    payload
  );
}

module.exports = {
  listForUser,
  getUnreadCount,
  markRead,
  markAllRead,
  createForUser,
  createForUsers,
  createForRole,
};
