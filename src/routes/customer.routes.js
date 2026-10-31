const express = require('express');
const { handle } = require('./http-error');
const { requireRole } = require('../middleware/auth');

/** Routes khách hàng: chỉ nhận HTTP, không có nghiệp vụ. */
module.exports = function customerRoutes(customerService) {
  const router = express.Router();

  // E9: có ?phone= thì tra theo SĐT, không thì liệt kê có phân trang.
  router.get('/customers', handle(async (req, res) => {
    if (req.query.phone !== undefined) {
      res.json({ data: await customerService.findByPhone(req.query.phone, req.user) });
      return;
    }
    res.json(await customerService.list({ page: req.query.page, size: req.query.size }, req.user));
  }));

  router.get('/customers/:code', handle(async (req, res) => {
    res.json({ data: await customerService.getDto(req.params.code, req.user) });
  }));

  router.post('/customers', requireRole('DATA_STAFF'), handle(async (req, res) => {
    const created = await customerService.create(req.body, req.user);
    res.status(201).location(`/api/customers/${created.customerId}`).json({ data: created });
  }));

  router.put('/customers/:code', requireRole('DATA_STAFF'), handle(async (req, res) => {
    res.json({ data: await customerService.update(req.params.code, req.body, req.user) });
  }));

  // Xóa MỀM (BR5 chỉ cấm xóa vật lý): hồ sơ vẫn còn trong bảng, chỉ đánh dấu deleted_at.
  router.delete('/customers/:code', requireRole('DATA_STAFF'), handle(async (req, res) => {
    await customerService.remove(req.params.code);
    res.status(204).end();
  }));

  return router;
};
