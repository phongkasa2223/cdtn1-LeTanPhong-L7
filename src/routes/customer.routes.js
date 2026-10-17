const express = require('express');
const { handle } = require('./http-error');

/** Lớp API – CRUD hồ sơ khách hàng. Không có quy tắc nghiệp vụ ở đây. */
module.exports = function customerRoutes(customerService) {
  const router = express.Router();

  // E9 (FR7): ?phone= tra cứu theo SĐT; không có phone thì liệt kê có phân trang.
  router.get('/customers', handle(async (req, res) => {
    if (req.query.phone !== undefined) {
      res.json({ data: await customerService.findByPhone(req.query.phone) });
      return;
    }
    res.json(await customerService.list({ page: req.query.page, size: req.query.size }));
  }));

  router.get('/customers/:code', handle(async (req, res) => {
    res.json({ data: await customerService.getDto(req.params.code) });
  }));

  router.post('/customers', handle(async (req, res) => {
    const created = await customerService.create(req.body);
    res.status(201).location(`/api/customers/${created.customerId}`).json({ data: created });
  }));

  router.put('/customers/:code', handle(async (req, res) => {
    res.json({ data: await customerService.update(req.params.code, req.body) });
  }));

  // Không có DELETE: BR5 (QT-13) cấm xóa vật lý hồ sơ khách hàng; hồ sơ trùng chỉ được gộp (UC5).

  return router;
};
