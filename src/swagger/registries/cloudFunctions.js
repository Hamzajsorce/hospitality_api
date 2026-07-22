const functions = new Map();

function register(name, meta = {}) {
  functions.set(name, {
    name,
    tags: meta.tags || ['Cloud Functions'],
    summary: meta.summary || name,
    description: meta.description || '',
    roles: meta.roles || null,
    authRequired: meta.authRequired !== false,
    parameters: meta.parameters || {},
    requestExample: meta.requestExample || null,
    responses: meta.responses || null,
  });
}

function getAll() {
  return Array.from(functions.values());
}

module.exports = {
  register,
  getAll,
};
