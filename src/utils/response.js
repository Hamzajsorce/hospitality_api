function ok(data = null, message = 'Success', meta = null) {
  return {
    code: 1,
    message,
    data,
    meta,
  };
}

function fail(error) {
  return {
    code: error.code || 0,
    message: error.message || error.error || 'Something went wrong',
  };
}

module.exports = {
  ok,
  fail,
};
