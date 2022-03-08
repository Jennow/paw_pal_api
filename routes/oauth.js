const express                     = require('express');
const { login, logout, validate } = require('../controller/oauth');
const { body } = require('express-validator');

let router                        = express.Router();

router.post('/token', 
    body('email').isEmail(),
    body('password').isString(),
    login);
router.post('/logout', logout);
router.get('/:token/validate', validate)

module.exports = router;