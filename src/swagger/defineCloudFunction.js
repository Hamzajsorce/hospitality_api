const cloudRegistry = require('./registries/cloudFunctions');

function defineCloudFunction(name, handler, meta = {}) {
  cloudRegistry.register(name, meta);
  Parse.Cloud.define(name, handler);
}

module.exports = { defineCloudFunction };
