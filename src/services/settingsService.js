const settingsRepository = require('../repositories/settingsRepository');
const TelegramNotifier = require('../utils/telegramNotifier');
const { AppError } = require('../utils/AppError');
const { ROLES, ROLE_LABELS } = require('../constants/hospitality');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAMOTTOKEN;
const LEGACY_CHAT_IDS = readChatIds(process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAMCHATID);
const ROLE_ENV_KEYS = {
  [ROLES.ADMIN]: ['TELEGRAM_ADMIN_CHAT_ID', 'TELEGRAM_ADMIN_CHAT_IDS'],
  [ROLES.REQUESTER]: ['TELEGRAM_REQUEST_USER_CHAT_ID', 'TELEGRAM_REQUEST_USER_CHAT_IDS'],
  [ROLES.FNB]: ['TELEGRAM_FNB_CHAT_ID', 'TELEGRAM_FNB_CHAT_IDS'],
  [ROLES.ACCOUNTANT]: ['TELEGRAM_ACCOUNTANT_CHAT_ID', 'TELEGRAM_ACCOUNTANT_CHAT_IDS'],
  [ROLES.MANAGEMENT]: ['TELEGRAM_MANAGEMENT_CHAT_ID', 'TELEGRAM_MANAGEMENT_CHAT_IDS'],
};

function readChatIds(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function envGroupsForRole(role) {
  return (ROLE_ENV_KEYS[role] || []).flatMap((key) => readChatIds(process.env[key]));
}

function normalizeTelegramGroup(data = {}) {
  const role = String(data.role || '').trim();
  const chatId = String(data.chatId || '').trim();
  const label = String(data.label || ROLE_LABELS[role] || role || '').trim();
  const sortOrder = Number(data.sortOrder || 100);

  if (!Object.values(ROLES).includes(role)) {
    throw new AppError('Telegram group role is invalid');
  }
  if (!chatId) throw new AppError('Telegram group chat id is required');
  if (!label) throw new AppError('Telegram group label is required');

  return {
    objectId: data.objectId,
    role,
    chatId,
    label,
    isActive: data.isActive !== false,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
  };
}

async function seedTelegramGroupsFromEnv() {
  const total = await settingsRepository.countTelegramGroups();
  if (total > 0) return false;

  const rows = [];
  Object.values(ROLES).forEach((role) => {
    envGroupsForRole(role).forEach((chatId, index) => {
      rows.push({
        role,
        chatId,
        label: `${ROLE_LABELS[role]} Telegram`,
        sortOrder: index + 1,
        isActive: true,
      });
    });
  });

  LEGACY_CHAT_IDS.forEach((chatId, index) => {
    rows.push({
      role: ROLES.ADMIN,
      chatId,
      label: 'Admin Telegram',
      sortOrder: index + 1,
      isActive: true,
    });
  });

  const uniqueRows = rows.filter(
    (row, index, list) =>
      list.findIndex((item) => item.role === row.role && item.chatId === row.chatId) === index
  );

  for (const row of uniqueRows) {
    await settingsRepository.saveTelegramGroup(row);
  }

  return uniqueRows.length > 0;
}

async function listTelegramGroups() {
  await seedTelegramGroupsFromEnv();
  return settingsRepository.findTelegramGroups();
}

async function getActiveTelegramGroupsForRole(role) {
  await seedTelegramGroupsFromEnv();
  const groups = await settingsRepository.findTelegramGroups({ role, activeOnly: true });
  if (groups.length) return groups;

  const envGroups = envGroupsForRole(role).map((chatId) => ({ role, chatId, label: ROLE_LABELS[role] || role }));
  if (envGroups.length) return envGroups;

  return LEGACY_CHAT_IDS.map((chatId) => ({ role, chatId, label: 'Telegram' }));
}

async function saveTelegramGroup(data) {
  const clean = normalizeTelegramGroup(data);
  const existing = await settingsRepository.findTelegramGroupByRoleAndChatId(clean.role, clean.chatId);
  if (existing && existing.id !== clean.objectId) {
    throw new AppError('This Telegram chat id is already configured for this role');
  }
  return settingsRepository.saveTelegramGroup(clean);
}

async function deleteTelegramGroup(groupId) {
  if (!groupId) throw new AppError('Telegram group id is required');
  return settingsRepository.deleteTelegramGroup(groupId);
}

async function testTelegramGroup(groupId) {
  if (!TELEGRAM_TOKEN) throw new AppError('Telegram bot token is not configured');
  const group = await settingsRepository.getTelegramGroupById(groupId);
  const notifier = new TelegramNotifier(TELEGRAM_TOKEN, group.get('chatId'));
  await notifier.send(notifier.buildMessage('Telegram test', `Test message for ${group.get('label')}`));
  return { sent: true };
}

module.exports = {
  listTelegramGroups,
  getActiveTelegramGroupsForRole,
  saveTelegramGroup,
  deleteTelegramGroup,
  testTelegramGroup,
};
