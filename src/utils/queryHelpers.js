function applyOrder(query, orderBy = '-createdAt') {
  if (orderBy.startsWith('-')) {
    query.descending(orderBy.slice(1));
  } else {
    query.ascending(orderBy);
  }
}

module.exports = { applyOrder };
