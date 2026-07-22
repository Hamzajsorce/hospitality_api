const { AppError } = require('../utils/AppError');
const { applyOrder } = require('../utils/queryHelpers');

const CLASS_NAME = 'ExampleItem';

function toJSON(object) {
  return object ? object.toJSON() : null;
}

async function findList(options = {}) {
  const query = new Parse.Query(CLASS_NAME);
  query.limit(options.limit);
  query.skip(options.skip);

  if (options.search) {
    query.contains('titleSearch', String(options.search).toLowerCase());
  }

  if (options.isActive !== undefined && options.isActive !== '') {
    query.equalTo('isActive', options.isActive === true || options.isActive === 'true');
  }

  applyOrder(query, options.orderBy);

  const [items, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  return {
    data: items.map(toJSON),
    meta: {
      total,
      limit: options.limit,
      skip: options.skip,
      page: Math.floor(options.skip / options.limit) + 1,
    },
  };
}

async function findById(objectId) {
  const query = new Parse.Query(CLASS_NAME);
  try {
    const item = await query.get(objectId, { useMasterKey: true });
    return toJSON(item);
  } catch {
    throw new AppError('Example item was not found', 404);
  }
}

async function create(data) {
  const ExampleItem = Parse.Object.extend(CLASS_NAME);
  const item = new ExampleItem();
  Object.entries(data).forEach(([key, value]) => item.set(key, value));
  const saved = await item.save(null, { useMasterKey: true });
  return toJSON(saved);
}

async function update(objectId, data) {
  const query = new Parse.Query(CLASS_NAME);
  const item = await query.get(objectId, { useMasterKey: true });
  Object.entries(data).forEach(([key, value]) => item.set(key, value));
  const saved = await item.save(null, { useMasterKey: true });
  return toJSON(saved);
}

async function remove(objectId) {
  const query = new Parse.Query(CLASS_NAME);
  const item = await query.get(objectId, { useMasterKey: true });
  await item.destroy({ useMasterKey: true });
  return true;
}

module.exports = {
  findList,
  findById,
  create,
  update,
  remove,
};
