const { AppError } = require('../utils/AppError');
const { applyOrder } = require('../utils/queryHelpers');

const REQUEST_CLASS = 'HospitalityRequest';
const LOG_CLASS = 'HospitalityLog';

function toJSON(object) {
  return object ? object.toJSON() : null;
}

function setFields(object, data) {
  Object.entries(data).forEach(([key, value]) => object.set(key, value));
}

function getPointerName(pointer) {
  if (!pointer) return '';
  if (typeof pointer === 'string') return pointer;
  if (pointer.get) return pointer.get('name') || '';
  if (pointer.__type === 'Pointer') return '';
  return pointer.name || '';
}

function serializeRequestItem(item = {}) {
  if (item?.get) {
    const option = item.get('option');
    return {
      optionId: item.get('optionId') || option?.id || option?.objectId,
      name: item.get('name') || getPointerName(option),
      quantity: item.get('quantity') || 1,
    };
  }

  return {
    optionId: item.optionId || item.option?.objectId,
    name: item.name || getPointerName(item.option),
    quantity: item.quantity || 1,
  };
}

function serializeRequest(request) {
  if (!request) return null;

  const data = toJSON(request);
  const typeOptionPointer = request.get('hospitalityTypeOption');
  const legacyType = request.get('hospitalityType');
  const hospitalityTypeName =
    request.get('hospitalityTypeName') ||
    getPointerName(typeOptionPointer) ||
    (typeof legacyType === 'string' ? legacyType : '');

  data.hospitalityTypeId =
    request.get('hospitalityTypeId') ||
    typeOptionPointer?.id ||
    typeOptionPointer?.objectId ||
    data.hospitalityTypeOption?.objectId;
  data.hospitalityTypeName = hospitalityTypeName;
  data.hospitalityType = hospitalityTypeName;
  data.items = (request.get('items') || []).map(serializeRequestItem);
  data.itemOptionIds = request.get('itemOptionIds') || data.items.map((item) => item.optionId).filter(Boolean);

  return data;
}

function applyRequestFilters(query, filters = {}) {
  if (filters.status) query.equalTo('status', filters.status);
  if (filters.statuses?.length) query.containedIn('status', filters.statuses);
  if (filters.roomNumber) query.contains('roomNumberSearch', String(filters.roomNumber).toLowerCase());
  if (filters.userId) query.equalTo('createdByUserId', filters.userId);
  if (filters.groupId) query.equalTo('groupId', filters.groupId);
  if (filters.hospitalityTypeId) query.equalTo('hospitalityTypeId', filters.hospitalityTypeId);
  if (filters.itemOptionId) query.contains('itemOptionIds', filters.itemOptionId);

  if (filters.fromDate) {
    query.greaterThanOrEqualTo('requestDate', new Date(filters.fromDate));
  }

  if (filters.toDate) {
    const toDate = new Date(filters.toDate);
    toDate.setHours(23, 59, 59, 999);
    query.lessThanOrEqualTo('requestDate', toDate);
  }
}

async function findRequests(options = {}) {
  const query = new Parse.Query(REQUEST_CLASS);
  query.limit(options.limit);
  query.skip(options.skip);
  applyRequestFilters(query, options);
  applyOrder(query, options.orderBy || '-createdAt');

  const [items, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  return {
    data: items.map(serializeRequest),
    meta: {
      total,
      limit: options.limit,
      skip: options.skip,
      page: Math.floor(options.skip / options.limit) + 1,
    },
  };
}

async function getRequest(objectId) {
  const query = new Parse.Query(REQUEST_CLASS);
  try {
    return await query.get(objectId, { useMasterKey: true });
  } catch {
    throw new AppError('Hospitality request was not found', 404);
  }
}

async function findRequestById(objectId) {
  return serializeRequest(await getRequest(objectId));
}

async function createRequest(data) {
  const Request = Parse.Object.extend(REQUEST_CLASS);
  const request = new Request();
  setFields(request, data);
  const saved = await request.save(null, { useMasterKey: true });
  return serializeRequest(saved);
}

async function createRequests(rows = []) {
  const Request = Parse.Object.extend(REQUEST_CLASS);
  const requests = rows.map((data) => {
    const request = new Request();
    setFields(request, data);
    return request;
  });

  const saved = await Parse.Object.saveAll(requests, { useMasterKey: true });
  return saved.map(serializeRequest);
}

async function updateRequest(objectId, data) {
  const request = await getRequest(objectId);
  setFields(request, data);
  const saved = await request.save(null, { useMasterKey: true });
  return serializeRequest(saved);
}

async function createLog(data) {
  const Log = Parse.Object.extend(LOG_CLASS);
  const log = new Log();
  setFields(log, data);
  const saved = await log.save(null, { useMasterKey: true });
  return toJSON(saved);
}

async function findLogs(requestId) {
  const query = new Parse.Query(LOG_CLASS);
  query.equalTo('requestId', requestId);
  query.ascending('createdAt');
  const logs = await query.find({ useMasterKey: true });
  return logs.map(toJSON);
}

module.exports = {
  REQUEST_CLASS,
  LOG_CLASS,
  serializeRequest,
  findRequests,
  findRequestById,
  createRequest,
  createRequests,
  updateRequest,
  createLog,
  findLogs,
};
