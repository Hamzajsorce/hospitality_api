const hospitalityOptionRepository = require('../repositories/hospitalityOptionRepository');
const { AppError } = require('../utils/AppError');

async function getOptions(type) {
  await hospitalityOptionRepository.seedDefaultOptions();
  return hospitalityOptionRepository.findOptions(type);
}

async function listOptions(params = {}) {
  await hospitalityOptionRepository.seedDefaultOptions();
  return hospitalityOptionRepository.findAllOptions({
    type: params.type,
    search: params.search,
  });
}

async function saveOption(data = {}) {
  if (!['type', 'item'].includes(data.type)) throw new AppError('Option type is invalid');
  if (!data.name) throw new AppError('Option name is required');

  return hospitalityOptionRepository.upsertOption({
    objectId: data.objectId,
    type: data.type,
    name: String(data.name).trim(),
    sortOrder: Number(data.sortOrder || 100),
    isActive: data.isActive !== false,
  });
}

async function deleteOption(optionId) {
  if (!optionId) throw new AppError('optionId is required');
  return hospitalityOptionRepository.deleteOption(optionId);
}

module.exports = {
  getOptions,
  listOptions,
  saveOption,
  deleteOption,
};
