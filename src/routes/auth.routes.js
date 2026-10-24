const express = require('express');
const { handle } = require('./http-error');

/** Routes đăng nhập (E1). Mở cho mọi người, các route khác phải qua middleware authenticate. */
module.exports = function authRoutes(authService) {
  const router = express.Router();

  router.post('/auth/login', handle(async (req, res) => {
    res.json(await authService.login(req.body));
  }));

  return router;
};
