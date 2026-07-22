const { ROLES } = require('../constants/hospitality');

const ROLE_NUMBER_MAP = {
  1: ROLES.ADMIN,
  2: ROLES.REQUESTER,
  3: ROLES.FNB,
  4: ROLES.ACCOUNTANT,
  5: ROLES.MANAGEMENT,
};

const ROLE_TO_NUMBER = Object.entries(ROLE_NUMBER_MAP).reduce((acc, [number, role]) => {
  acc[role] = number;
  return acc;
}, {});

function mapRoleNumber(roleNumber) {
  if (roleNumber == null || roleNumber === '') return undefined;
  return ROLE_NUMBER_MAP[String(roleNumber)] || String(roleNumber);
}

function mapRoleToNumber(role) {
  if (!role) return undefined;
  return ROLE_TO_NUMBER[role] || role;
}

function getUserRole(user) {
  if (!user) return undefined;

  const role = user.get('role');
  if (typeof role === 'string') return role;
  if (role?.get) {
    const name = role.get('name');
    if (name) return name;
  }

  return mapRoleNumber(user.get('roleNumber'));
}

async function resolveRolePointer(roleSlug) {
  if (!roleSlug) return undefined;

  const query = new Parse.Query(Parse.Role);
  query.equalTo('name', roleSlug);
  let role = await query.first({ useMasterKey: true });

  if (!role) {
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    role = new Parse.Role(roleSlug, acl);
    await role.save(null, { useMasterKey: true });
  }

  return role;
}

module.exports = {
  getUserRole,
  mapRoleToNumber,
  resolveRolePointer,
};