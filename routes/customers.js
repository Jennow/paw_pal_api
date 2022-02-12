require('dotenv').config()
const cors      = require('cors')

const express = require('express');
let router    = express.Router();
const crypto  = require('crypto')

const connectDB = require("../models/db");
const mongoose  = require('mongoose');
const database  = "paw_pal"
const Customers = require("../models/Customers");

const SessionService = require("../services/session.service");

connectDB("mongodb://127.0.0.1:27017/"+database)

router.use(cors());
/**
 * Add new Customer
 */
router.post('/', (req, res, next) => {
    let customerData      = req.body;
    customerData.password = crypto.createHash('md5')
                                  .update(process.env.PASSWORD_HASH + req.body.password)
                                  .digest('hex')
    
    Customers.create(req.body).then((customer) => {
        if (customer == {}) {
            throw 'customer_already_exists'
        }
        mongoose.disconnect();
        res.json(customer);
    })
    .catch(err => {
        return next(err);
    });
});

/**
 * Get List of customers
 * -> Load customers in chunks
 * -> Dont load customers that already have a match with current customer 
 */
 router.get('/explore', (req, res, next) => {
    // TODO !!!
})

router.route('/:customerId')
/**
 *  Get Customerprofile
 *  Own profile is returned by passing authToken as customerId
 *  If numeric id is passed -> only return public information
 */
    .get((req, res, next) => {
        let customerId = req.params.customerId;
        let where      = {
            accessToken: customerId
        }
        let blackListColumns = {};

        if (!isNaN(customerId)) {
            where = {
                id: customerId
            }
            blackListColumns = {
                __v: false,
                password: false,
                accessToken: false,
                sessionExpiryDate: false,
            }
        } else {
            SessionService.checkSession(customerId).catch(next);
        }
        Customers.findOne(where, blackListColumns, (err, customer) => {
            if (err) return next(err);
            if (!customer) {
                return next('not_found')
            }
            res.json(customer);
        });
    })
    /**
     * Edit customer profile
     */
    .patch((req, res, next) => {
        let token = req.params.customerId;
        SessionService.checkSession(token).catch(next);
        let patch = req.body;

        Customers.updateOne(
            {
                accessToken: token
            },
            patch,
            {
                upsert: true,
                new: true,
            }, (err, result) => {
                if (err) { return  next(err)}
                res.json({success: true, message: 'updated_customer'});
            }
        );  
    })    
    .delete((req, res, next) => {
        let token = req.params.customerId;
        SessionService.checkSession(token).catch(next);

        Customers.deleteOne(
            {
                accessToken: token
            }, (err, result) => {
                if (err) { return  next(err)}
                res.json({success: true, message: 'deleted_customer'});
            }
        );  
    });

module.exports = router;