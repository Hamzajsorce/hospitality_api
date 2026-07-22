const routes = [];

function register(entry) {
  routes.push({
    method: entry.method.toLowerCase(),
    path: entry.path,
    tags: entry.tags || ['REST'],
    summary: entry.summary || `${entry.method.toUpperCase()} ${entry.path}`,
    description: entry.description || '',
    parameters: entry.parameters || [],
    requestBody: entry.requestBody || null,
    responses: entry.responses || null,
  });
}

function getAll() {
  return routes;
}

module.exports = {
  register,
  getAll,
};
