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
 * Get List of customers
 * -> Load customers in chunks
 * -> Dont load customers that already have a match with current customer 
 */
 router.get('/explore', (req, res, next) => {
    // TODO !!!
})

/**
 *  Get own Customerprofile
 *  If numeric id is passed -> only return public information
 */
router.get('/:customerId', (req, res, next) => {
    let customerId = req.params.customerId;

    console.log(customerId);
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
        try {
            SessionService.checkSession(customerId).catch(next);
        } catch(err) {
            next(err);
        }
    }
    Customers.findOne(where, blackListColumns, (err, customer) => {
        if (err) return next(err);
        if (!customer) {
            return next('not_found')
        }
        res.json(customer);
    });
})

router.route('/')
    /**
     * Add new Customer
     */
    .post((req, res, next) => {
        let customerData      = req.body;
        customerData.password = crypto.createHash('md5')
                                    .update(process.env.PASSWORD_HASH + req.body.password)
                                    .digest('hex')
        
        Customers.create(req.body).then((customer) => {
            if (customer == {}) {
                throw 'customer_already_exists'
            }
            mongoose.disconnect();
            res.json({success: true, message: 'added_customer'});
        })
        .catch(err => {
            return next(err);
        });
    })
    /**
     * Edit customer profile
     */
    .patch((req, res, next) => {
        let token = req.body.accessToken;
        try {
            SessionService.checkSession(token).catch(next);
        } catch(err) {
            next(err);
        }        let patch = req.body;

        if (req.body.password) {
            patch.password = crypto.createHash('md5')
            .update(process.env.PASSWORD_HASH + req.body.password)
            .digest('hex')
        } else {
            delete patch.password;
        }

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
        let token = req.body.customerId;
        try {
            SessionService.checkSession(token).catch(next);
        } catch(err) {
            next(err);
        }
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