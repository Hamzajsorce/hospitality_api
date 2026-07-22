function registerExampleJobs() {
  Parse.Cloud.job('rebuildExampleSearchFields', async (request) => {
    const query = new Parse.Query('ExampleItem');
    query.limit(1000);

    const items = await query.find({ useMasterKey: true });
    items.forEach((item) => {
      item.set('titleSearch', String(item.get('title') || '').toLowerCase());
    });

    await Parse.Object.saveAll(items, { useMasterKey: true });
    request.message(`Updated ${items.length} example items`);
  });
}

module.exports = { registerExampleJobs };
