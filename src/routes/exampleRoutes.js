const express = require('express');
const exampleService = require('../services/exampleService');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await exampleService.getList(req.query);
    res.json(ok(result.data, 'Examples loaded', result.meta));
  } catch (error) {
    res.status(error.status || 400).json(fail(error));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await exampleService.getById(req.params.id);
    res.json(ok(item, 'Example loaded'));
  } catch (error) {
    res.status(error.status || 400).json(fail(error));
  }
});

module.exports = router;
