
const express = require('express');
const router  = express.Router();

const { getExploreCustomers, getCustomer, addCustomer, editCustomer, deleteCustomer } = require('../controller/customers');

router.get('/explore', getExploreCustomers)
router.get('/:customerId', getCustomer)

router.route('/')
    .post(addCustomer)
    .patch(editCustomer)    
    .delete(deleteCustomer);

module.exports = router;