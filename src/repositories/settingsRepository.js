const { AppError } = require('../utils/AppError');

const SETTINGS_CLASS = 'Settings';
const TELEGRAM_GROUP_TYPE = 'telegram_group';

function toJSON(object) {
  if (!object) return null;
  const data = object.toJSON();
  delete data.ACL;
  return data;
}

function setPrivateAcl(object) {
  const acl = new Parse.ACL();
  object.setACL(acl);
}

async function findTelegramGroups(options = {}) {
  const query = new Parse.Query(SETTINGS_CLASS);
  query.equalTo('type', TELEGRAM_GROUP_TYPE);
  if (options.role) query.equalTo('role', options.role);
  if (options.activeOnly) query.equalTo('isActive', true);
  query.ascending('role');
  query.ascending('sortOrder');
  query.ascending('label');
  const groups = await query.find({ useMasterKey: true });
  return groups.map(toJSON);
}

async function countTelegramGroups() {
  const query = new Parse.Query(SETTINGS_CLASS);
  query.equalTo('type', TELEGRAM_GROUP_TYPE);
  return query.count({ useMasterKey: true });
}

async function getTelegramGroupById(objectId) {
  const query = new Parse.Query(SETTINGS_CLASS);
  try {
    const group = await query.get(objectId, { useMasterKey: true });
    if (group.get('type') !== TELEGRAM_GROUP_TYPE) throw new Error('Wrong setting type');
    return group;
  } catch {
    throw new AppError('Telegram group setting was not found', 404);
  }
}

async function findTelegramGroupByRoleAndChatId(role, chatId) {
  const query = new Parse.Query(SETTINGS_CLASS);
  query.equalTo('type', TELEGRAM_GROUP_TYPE);
  query.equalTo('role', role);
  query.equalTo('chatId', chatId);
  return query.first({ useMasterKey: true });
}

async function saveTelegramGroup(data) {
  const Setting = Parse.Object.extend(SETTINGS_CLASS);
  const group = data.objectId ? await getTelegramGroupById(data.objectId) : new Setting();

  group.set('type', TELEGRAM_GROUP_TYPE);
  group.set('role', data.role);
  group.set('label', data.label);
  group.set('chatId', data.chatId);
  group.set('isActive', data.isActive !== false);
  group.set('sortOrder', data.sortOrder || 100);
  setPrivateAcl(group);

  const saved = await group.save(null, { useMasterKey: true });
  return toJSON(saved);
}

async function deleteTelegramGroup(objectId) {
  const group = await getTelegramGroupById(objectId);
  const data = toJSON(group);
  await group.destroy({ useMasterKey: true });
  return data;
}

module.exports = {
  SETTINGS_CLASS,
  TELEGRAM_GROUP_TYPE,
  findTelegramGroups,
  countTelegramGroups,
  findTelegramGroupByRoleAndChatId,
  getTelegramGroupById,
  saveTelegramGroup,
  deleteTelegramGroup,
};
