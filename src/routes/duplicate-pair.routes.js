const express = require('express');
const { handle } = require('./http-error');
const { requireRole } = require('../middleware/auth');

/** Routes cặp nghi trùng (E4, E5, E6): chỉ nhận HTTP, không có nghiệp vụ. Chỉ nhân viên dữ liệu được quyết định. */
module.exports = function duplicatePairRoutes(duplicateService) {
  const router = express.Router();

  router.get('/duplicate-pairs', handle(async (req, res) => {
    res.json(await duplicateService.list(req.query, req.user));
  }));

  router.get('/duplicate-pairs/:pairId', handle(async (req, res) => {
    res.json(await duplicateService.get(req.params.pairId, req.user));
  }));

  router.post('/duplicate-pairs/:pairId/decision', requireRole('DATA_STAFF'), handle(async (req, res) => {
    res.json(await duplicateService.decide(req.params.pairId, req.body, req.user));
  }));

  return router;
};
