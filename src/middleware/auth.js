const { AppError } = require('../utils/AppError');
const { getUserRole } = require('../utils/role');

function requireUser(request) {
  if (!request.user) {
    throw new AppError('Authentication required', 401);
  }

  return request.user;
}

function requireRole(request, allowedRoles = []) {
  const user = requireUser(request);
  const role = getUserRole(user);

  if (!allowedRoles.includes(role)) {
    throw new AppError('You are not authorized to do this action', 403);
  }

  return user;
}

module.exports = {
  requireUser,
  requireRole,
};
