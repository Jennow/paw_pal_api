const express                     = require('express');
const { login, logout, validate } = require('../controller/oauth');

let router                        = express.Router();

router.post('/token', login);
router.post('/logout', logout);
router.get('/:token/validate', validate)

module.exports = router;