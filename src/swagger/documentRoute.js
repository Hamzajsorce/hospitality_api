const restRegistry = require('./registries/restRoutes');

function documentRoute(method, path, meta = {}) {
  restRegistry.register({ method, path, ...meta });
}

function documentedRouter(basePath, tag) {
  const attach = (method, path, meta, handler) => {
    documentRoute(method, `${basePath}${path}`, { tags: [tag], ...meta });
    return handler;
  };

  return {
    get(path, meta, handler) {
      if (typeof meta === 'function') {
        return attach('get', path, {}, meta);
      }
      return attach('get', path, meta, handler);
    },
    post(path, meta, handler) {
      if (typeof meta === 'function') {
        return attach('post', path, {}, meta);
      }
      return attach('post', path, meta, handler);
    },
    put(path, meta, handler) {
      if (typeof meta === 'function') {
        return attach('put', path, {}, meta);
      }
      return attach('put', path, meta, handler);
    },
    patch(path, meta, handler) {
      if (typeof meta === 'function') {
        return attach('patch', path, {}, meta);
      }
      return attach('patch', path, meta, handler);
    },
    delete(path, meta, handler) {
      if (typeof meta === 'function') {
        return attach('delete', path, {}, meta);
      }
      return attach('delete', path, meta, handler);
    },
  };
}

module.exports = {
  documentRoute,
  documentedRouter,
};
