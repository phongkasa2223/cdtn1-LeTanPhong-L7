const express = require('express');
const { handle } = require('./http-error');
const { requireRole } = require('../middleware/auth');

/** Routes tài khoản (E12–E16): chỉ Quản lý dữ liệu được dùng; chỉ nhận HTTP, không có nghiệp vụ. */
module.exports = function userRoutes(userService) {
  const router = express.Router();
  router.use('/users', requireRole('DATA_MANAGER'));

  router.get('/users', handle(async (req, res) => {
    res.json(await userService.list(req.query));
  }));

  router.get('/users/:id', handle(async (req, res) => {
    res.json({ data: await userService.get(req.params.id) });
  }));

  router.post('/users', handle(async (req, res) => {
    const created = await userService.create(req.body);
    res.status(201).location(`/api/users/${created.userId}`).json({ data: created });
  }));

  router.put('/users/:id', handle(async (req, res) => {
    res.json({ data: await userService.update(req.params.id, req.body) });
  }));

  router.delete('/users/:id', handle(async (req, res) => {
    await userService.remove(req.params.id, req.user);
    res.status(204).end();
  }));

  return router;
};
