const { AppError } = require('../utils/AppError');
const { applyOrder } = require('../utils/queryHelpers');

const NOTIFICATION_CLASS = 'Notification';

function toJSON(object) {
  return object ? object.toJSON() : null;
}

function serializeNotification(notification) {
  if (!notification) return null;

  const data = toJSON(notification);
  const targetUserPointer = notification.get('targetUser');
  data.targetUserId =
    notification.get('targetUserId') ||
    targetUserPointer?.id ||
    targetUserPointer?.objectId ||
    data.targetUser?.objectId;

  return data;
}

function buildTargetUserAcl(targetUserId) {
  const acl = new Parse.ACL();
  acl.setReadAccess(targetUserId, true);
  acl.setWriteAccess(targetUserId, true);
  return acl;
}

function applyNotificationFilters(query, filters = {}) {
  if (filters.targetUserId) query.equalTo('targetUserId', filters.targetUserId);
  if (filters.isRead !== undefined && filters.isRead !== null) {
    query.equalTo('isRead', Boolean(filters.isRead));
  }
}

async function getNotification(objectId) {
  const query = new Parse.Query(NOTIFICATION_CLASS);
  try {
    return await query.get(objectId, { useMasterKey: true });
  } catch {
    throw new AppError('Notification was not found', 404);
  }
}

async function findNotificationById(objectId) {
  return serializeNotification(await getNotification(objectId));
}

async function findNotifications(options = {}) {
  const query = new Parse.Query(NOTIFICATION_CLASS);
  query.limit(options.limit);
  query.skip(options.skip);
  applyNotificationFilters(query, options);
  applyOrder(query, options.orderBy || '-createdAt');

  const [items, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  return {
    data: items.map(serializeNotification),
    meta: {
      total,
      limit: options.limit,
      skip: options.skip,
      page: Math.floor(options.skip / options.limit) + 1,
    },
  };
}

async function countUnread(targetUserId) {
  const query = new Parse.Query(NOTIFICATION_CLASS);
  query.equalTo('targetUserId', targetUserId);
  query.equalTo('isRead', false);
  return query.count({ useMasterKey: true });
}

async function createNotification(data) {
  const Notification = Parse.Object.extend(NOTIFICATION_CLASS);
  const notification = new Notification();

  notification.set('title', data.title);
  notification.set('text', data.text);
  notification.set('targetUserId', data.targetUserId);
  notification.set('isRead', false);

  if (data.targetUser) {
    notification.set('targetUser', data.targetUser);
  } else {
    const userPointer = Parse.User.createWithoutData(data.targetUserId);
    notification.set('targetUser', userPointer);
  }

  if (data.moduleType) notification.set('moduleType', data.moduleType);
  if (data.moduleId) notification.set('moduleId', data.moduleId);

  notification.setACL(buildTargetUserAcl(data.targetUserId));

  const saved = await notification.save(null, { useMasterKey: true });
  return serializeNotification(saved);
}

async function markAsRead(objectId) {
  const notification = await getNotification(objectId);
  notification.set('isRead', true);
  notification.set('readAt', new Date());
  const saved = await notification.save(null, { useMasterKey: true });
  return serializeNotification(saved);
}

async function markAllAsRead(targetUserId) {
  const query = new Parse.Query(NOTIFICATION_CLASS);
  query.equalTo('targetUserId', targetUserId);
  query.equalTo('isRead', false);
  query.limit(1000);

  const notifications = await query.find({ useMasterKey: true });
  const readAt = new Date();

  await Promise.all(
    notifications.map((notification) => {
      notification.set('isRead', true);
      notification.set('readAt', readAt);
      return notification.save(null, { useMasterKey: true });
    })
  );

  return notifications.length;
}

module.exports = {
  NOTIFICATION_CLASS,
  serializeNotification,
  findNotifications,
  findNotificationById,
  countUnread,
  createNotification,
  markAsRead,
  markAllAsRead,
};
