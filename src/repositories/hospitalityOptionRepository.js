const { AppError } = require('../utils/AppError');

const OPTION_CLASS = 'HospitalityOption';
const REQUEST_CLASS = 'HospitalityRequest';

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

async function findOptions(type) {
  const query = new Parse.Query(OPTION_CLASS);
  if (type) query.equalTo('type', type);
  query.equalTo('isActive', true);
  query.ascending('sortOrder');
  query.ascending('name');
  const options = await query.find({ useMasterKey: true });
  return options.map(toJSON);
}

async function findAllOptions(filters = {}) {
  const query = new Parse.Query(OPTION_CLASS);
  if (filters.type) query.equalTo('type', filters.type);
  if (filters.search) {
    query.contains('nameSearch', String(filters.search).trim().toLowerCase());
  }
  query.ascending('type');
  query.ascending('sortOrder');
  query.ascending('name');
  const options = await query.find({ useMasterKey: true });
  return options.map(toJSON);
}

async function getOptionById(objectId) {
  const query = new Parse.Query(OPTION_CLASS);
  try {
    return await query.get(objectId, { useMasterKey: true });
  } catch {
    throw new AppError('Hospitality option was not found', 404);
  }
}

async function countOptionUsage(option) {
  if (option.type === 'type') {
    const byIdQuery = new Parse.Query(REQUEST_CLASS);
    byIdQuery.equalTo('hospitalityTypeId', option.objectId);
    const idCount = await byIdQuery.count({ useMasterKey: true });
    if (idCount > 0) return idCount;

    const pointerQuery = new Parse.Query(REQUEST_CLASS);
    const typePointer = await getOptionById(option.objectId);
    pointerQuery.equalTo('hospitalityTypeOption', typePointer);
    const pointerCount = await pointerQuery.count({ useMasterKey: true });
    if (pointerCount > 0) return pointerCount;

    const legacyQuery = new Parse.Query(REQUEST_CLASS);
    legacyQuery.equalTo('hospitalityType', option.name);
    return legacyQuery.count({ useMasterKey: true });
  }

  const query = new Parse.Query(REQUEST_CLASS);
  query.contains('itemOptionIds', option.objectId);
  const pointerCount = await query.count({ useMasterKey: true });
  if (pointerCount > 0) return pointerCount;

  const legacyQuery = new Parse.Query(REQUEST_CLASS);
  legacyQuery.limit(5000);
  const requests = await legacyQuery.find({ useMasterKey: true });
  return requests.filter((request) =>
    (request.get('items') || []).some((item) => {
      const serialized = serializeRequestItem(item);
      return serialized.name === option.name;
    })
  ).length;
}

async function deleteOption(objectId) {
  const option = await getOptionById(objectId);
  const optionData = toJSON(option);
  const usageCount = await countOptionUsage(optionData);

  if (usageCount > 0) {
    throw new AppError('This option is used in hospitality requests and cannot be deleted');
  }

  await option.destroy({ useMasterKey: true });
  return optionData;
}

async function upsertOption(data) {
  const Option = Parse.Object.extend(OPTION_CLASS);
  const option = data.objectId
    ? await new Parse.Query(OPTION_CLASS).get(data.objectId, { useMasterKey: true })
    : new Option();
  setFields(option, data);
  option.set('nameSearch', String(data.name || '').toLowerCase());
  const saved = await option.save(null, { useMasterKey: true });
  return toJSON(saved);
}

async function seedDefaultOptions() {
  const existingQuery = new Parse.Query(OPTION_CLASS);
  const total = await existingQuery.count({ useMasterKey: true });
  if (total > 0) return false;

  const defaults = [
    ['type', 'VIP', 1],
    ['type', 'VVIP', 2],
    ['type', 'Special Guest', 3],
    ['type', 'Birthday Setup', 4],
    ['item', 'Cake', 1],
    ['item', 'Chocolate', 2],
    ['item', 'Small Water', 3],
    ['item', 'Large Water', 4],
    ['item', 'Fruits', 5],
    ['item', 'Soft Drinks', 6],
  ];

  await Promise.all(
    defaults.map(([type, name, sortOrder]) => upsertOption({ type, name, sortOrder, isActive: true }))
  );
  return true;
}

module.exports = {
  OPTION_CLASS,
  findOptions,
  findAllOptions,
  getOptionById,
  countOptionUsage,
  deleteOption,
  upsertOption,
  seedDefaultOptions,
};
