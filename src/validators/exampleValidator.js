const { AppError } = require('../utils/AppError');

function validateExampleData(data = {}, options = {}) {
  const clean = {};

  if (!options.partial && !data.title) {
    throw new AppError('Title is required');
  }

  if (data.title !== undefined) {
    clean.title = String(data.title).trim();
    if (clean.title.length < 2) {
      throw new AppError('Title must contain at least 2 characters');
    }
  }

  if (data.description !== undefined) {
    clean.description = String(data.description || '').trim();
  }

  if (data.isActive !== undefined) {
    clean.isActive = Boolean(data.isActive);
  }

  return clean;
}

module.exports = { validateExampleData };
