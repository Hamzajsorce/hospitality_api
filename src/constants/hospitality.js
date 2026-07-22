const ROLES = {
  REQUESTER: 'request_user',
  ADMIN: 'admin',
  FNB: 'fnb',
  ACCOUNTANT: 'accountant',
  MANAGEMENT: 'management',
};

const STATUS = {
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING_DELIVERY: 'Pending Delivery',
  DELIVERED: 'Delivered',
  DELIVERY_CANCELED: 'Delivery Cancelled',
};

const ROLE_LABELS = {
  [ROLES.REQUESTER]: 'Request User',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.FNB]: 'F&B Manager',
  [ROLES.ACCOUNTANT]: 'Accountant',
  [ROLES.MANAGEMENT]: 'Management',
};

module.exports = {
  ROLES,
  STATUS,
  ROLE_LABELS,
};
