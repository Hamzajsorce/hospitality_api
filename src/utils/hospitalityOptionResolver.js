const hospitalityOptionRepository = require('../repositories/hospitalityOptionRepository');
const { AppError } = require('./AppError');

const { OPTION_CLASS } = hospitalityOptionRepository;

function isObjectId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9]{10}$/.test(value);
}

async function getActiveOption(objectId, expectedType) {
  const option = await hospitalityOptionRepository.getOptionById(objectId);
  if (option.get('type') !== expectedType) {
    throw new AppError(`Invalid hospitality ${expectedType} option`);
  }
  if (option.get('isActive') === false) {
    throw new AppError(`Selected hospitality ${expectedType} is inactive`);
  }
  return option;
}

async function findOptionByName(name, expectedType) {
  const query = new Parse.Query(OPTION_CLASS);
  query.equalTo('type', expectedType);
  query.equalTo('name', String(name).trim());
  return query.first({ useMasterKey: true });
}

async function resolveTypeOption(typeRef) {
  if (!typeRef) throw new AppError('Hospitality type is required');

  if (isObjectId(typeRef) || typeRef?.objectId) {
    return getActiveOption(typeRef.objectId || typeRef, 'type');
  }

  const legacyName = String(typeRef).trim();
  const option = await findOptionByName(legacyName, 'type');
  if (!option) throw new AppError('Hospitality type is invalid');
  if (option.get('isActive') === false) throw new AppError('Hospitality type is inactive');
  return option;
}

async function resolveItemOption(item = {}) {
  const optionRef = item.optionId || item.objectId || item.option?.objectId;

  if (optionRef && isObjectId(optionRef)) {
    return getActiveOption(optionRef, 'item');
  }

  if (item.name) {
    const option = await findOptionByName(item.name, 'item');
    if (!option) throw new AppError(`Hospitality item "${item.name}" is invalid`);
    if (option.get('isActive') === false) throw new AppError(`Hospitality item "${item.name}" is inactive`);
    return option;
  }

  throw new AppError('Each hospitality item must reference a valid option');
}

async function resolveRequestItems(items = []) {
  const selectedItems = items.filter((item) => item && Number(item.quantity) > 0);
  if (!selectedItems.length) {
    throw new AppError('At least one hospitality item is required');
  }

  const resolvedItems = [];
  const itemOptionIds = [];

  for (const item of selectedItems) {
    const option = await resolveItemOption(item);
    const quantity = Number(item.quantity || 1);
    if (quantity <= 0) continue;

    resolvedItems.push({
      option,
      optionId: option.id,
      name: option.get('name'),
      quantity,
    });
    itemOptionIds.push(option.id);
  }

  if (!resolvedItems.length) {
    throw new AppError('At least one hospitality item is required');
  }

  return { items: resolvedItems, itemOptionIds };
}

module.exports = {
  resolveTypeOption,
  resolveItemOption,
  resolveRequestItems,
};
