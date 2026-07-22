const { AppError } = require('../utils/AppError');
const { ROLES } = require('../constants/hospitality');

const ALLOWED_ROLES = Object.values(ROLES);

function validateUserData(data = {}, options = {}) {
  const clean = {};
  const isUpdate = Boolean(options.isUpdate);

  if (!isUpdate && !data.username) {
    throw new AppError('Username is required');
  }

  if (data.username !== undefined) {
    clean.username = String(data.username).trim();
    if (clean.username.length < 3) {
      throw new AppError('Username must contain at least 3 characters');
    }
  }

  if (!isUpdate && !data.password) {
    throw new AppError('Password is required');
  }

  if (data.password !== undefined && data.password !== '') {
    clean.password = String(data.password);
    if (clean.password.length < 6) {
      throw new AppError('Password must contain at least 6 characters');
    }
  }

  if (data.email !== undefined) {
    clean.email = String(data.email || '').trim();
    if (clean.email && !clean.email.includes('@')) {
      throw new AppError('Email is invalid');
    }
  }

  if (data.name !== undefined) {
    clean.name = String(data.name || '').trim();
  }

  if (!isUpdate && !data.role) {
    throw new AppError('Role is required');
  }

  if (data.role !== undefined) {
    clean.role = String(data.role).trim();
    if (!ALLOWED_ROLES.includes(clean.role)) {
      throw new AppError('Role is invalid');
    }
  }

  return clean;
}

module.exports = { validateUserData };
