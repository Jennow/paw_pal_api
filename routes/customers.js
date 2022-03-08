
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');

const { getExploreCustomers, getCustomer, addCustomer, editCustomer, deleteCustomer } = require('../controller/customers');

router.get('/explore', getExploreCustomers)
router.get('/:customerId', getCustomer)

router.route('/')
    .post(
        body('email').isEmail(),
        body('password').isString().notEmpty(),
        body('description').isString().notEmpty(),
        body('status').isInt(),
        body('title').isString().notEmpty(),
        addCustomer
    )
    .patch(editCustomer)    
    .delete(deleteCustomer);

module.exports = router;