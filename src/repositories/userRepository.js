const { AppError } = require('../utils/AppError');
const { getUserRole, resolveRolePointer } = require('../utils/role');

function serializeUser(user) {
  if (!user) return null;

  const data = user.toJSON();
  delete data.ACL;
  delete data.sessionToken;
  data.role = getUserRole(user);
  return data;
}

async function applyUserFields(user, data) {
  if (data.email !== undefined) user.set('email', data.email || undefined);
  if (data.name !== undefined) user.set('name', data.name || undefined);
  if (data.roleNumber) user.set('roleNumber', String(data.roleNumber));
  if (data.role) {
    user.set('role', await resolveRolePointer(data.role));
  }
}

function buildUserQuery(filters = {}) {
  if (filters.search) {
    const search = String(filters.search).trim();
    const usernameQuery = new Parse.Query(Parse.User);
    usernameQuery.contains('username', search);
    const emailQuery = new Parse.Query(Parse.User);
    emailQuery.contains('email', search);
    const nameQuery = new Parse.Query(Parse.User);
    nameQuery.contains('name', search);
    return Parse.Query.or(usernameQuery, emailQuery, nameQuery);
  }

  return new Parse.Query(Parse.User);
}

async function findUsers(options = {}) {
  const query = buildUserQuery(options);
  query.limit(options.limit);
  query.skip(options.skip);
  query.descending('createdAt');

  const [users, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  return {
    data: users.map(serializeUser),
    meta: {
      total,
      limit: options.limit,
      skip: options.skip,
      page: Math.floor(options.skip / options.limit) + 1,
    },
  };
}

async function getUserById(userId) {
  const query = new Parse.Query(Parse.User);
  try {
    return await query.get(userId, { useMasterKey: true });
  } catch {
    throw new AppError('User was not found', 404);
  }
}

async function findUserById(userId) {
  return serializeUser(await getUserById(userId));
}

async function findUserByUsername(username) {
  const query = new Parse.Query(Parse.User);
  query.equalTo('username', username);
  return query.first({ useMasterKey: true });
}

async function createUser(data) {
  const existing = await findUserByUsername(data.username);
  if (existing) {
    throw new AppError('Username already exists');
  }

  const user = new Parse.User();
  user.set('username', data.username);
  user.set('password', data.password);
  await applyUserFields(user, data);

  const saved = await user.save(null, { useMasterKey: true });
  return serializeUser(saved);
}

async function updateUser(userId, data) {
  const user = await getUserById(userId);

  if (data.username && data.username !== user.get('username')) {
    const existing = await findUserByUsername(data.username);
    if (existing && existing.id !== userId) {
      throw new AppError('Username already exists');
    }
    user.set('username', data.username);
  }

  if (data.password) user.set('password', data.password);
  await applyUserFields(user, data);

  const saved = await user.save(null, { useMasterKey: true });
  return serializeUser(saved);
}

async function findUsersByRole(role) {
  const rolePointer = await resolveRolePointer(role);
  if (!rolePointer) return [];

  const query = new Parse.Query(Parse.User);
  query.equalTo('role', rolePointer);
  query.limit(1000);
  const users = await query.find({ useMasterKey: true });
  return users.map(serializeUser);
}

module.exports = {
  findUsers,
  findUserById,
  findUsersByRole,
  createUser,
  updateUser,
};
