function paramsToSchema(parameters = {}) {
  const properties = {};
  const required = [];

  Object.entries(parameters).forEach(([key, def]) => {
    properties[key] = def.schema || def;
    if (def.required) required.push(key);
  });

  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
  };
}

module.exports = { paramsToSchema };
