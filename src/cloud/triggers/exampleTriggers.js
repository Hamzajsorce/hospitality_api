function registerExampleTriggers() {
  Parse.Cloud.beforeSave('ExampleItem', (request) => {
    const object = request.object;

    if (!object.get('slug') && object.get('title')) {
      object.set('slug', object.get('title').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }

    if (object.dirty('title')) {
      object.set('titleSearch', String(object.get('title') || '').toLowerCase());
    }
  });
}

module.exports = { registerExampleTriggers };
