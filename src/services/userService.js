const userRepository = require('../repositories/userRepository');
const { validateUserData } = require('../validators/userValidator');
const { AppError } = require('../utils/AppError');
const { mapRoleToNumber } = require('../utils/role');

async function getList(params = {}) {
  const limit = Math.min(Number(params.limit || 10), 100);
  const skip = Number(params.skip || 0);

  return userRepository.findUsers({
    limit,
    skip,
    search: params.search,
  });
}

async function getById(userId) {
  if (!userId) {
    throw new AppError('userId is required');
  }

  return userRepository.findUserById(userId);
}

async function save(userData = {}, actor) {
  const isUpdate = Boolean(userData.objectId);
  const cleanData = validateUserData(userData, { isUpdate });

  if (cleanData.role) {
    cleanData.roleNumber = mapRoleToNumber(cleanData.role);
  }

  if (isUpdate) {
    if (actor?.id === userData.objectId && cleanData.role && cleanData.role !== 'admin') {
      throw new AppError('You cannot change your own admin role');
    }

    return userRepository.updateUser(userData.objectId, cleanData);
  }

  return userRepository.createUser(cleanData);
}

module.exports = {
  getList,
  getById,
  save,
};
