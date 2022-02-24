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
const Matches = require('../models/Matches');

connectDB("mongodb://127.0.0.1:27017/"+database)

const MatchStatus = {
    INACTIVE: 0,
    WAITING: 1,
    CONFIRMED: 2
}

router.use(cors());

/**
 * Get List of customers
 * -> Load customers in chunks
 * -> Dont load customers that already have a match with current customer 
 */
 router.get('/explore', async (req, res, next) => {
    let token = SessionService.getBearerToken(req);    

    SessionService.checkSession(token, next, async (customer) => {
        console.log(customer._id)
        Customers.find({
            _id: {
                $ne: customer._id,
            }
        }, [
            '_id',
            'id',
            'title',
            'description',
            'profileImageUrl',
            'characteristics',
            'searchingFor',
        ])
        .populate({
                path: 'matches',
                select: '_id status',
                match: 
                {
                    $or: [
                    {
                        actions: {
                            customerId: customer._id,
                            action: 1
                        },
                        status: MatchStatus.WAITING
                    }, 
                    {
                        actions: {
                            customerId: customer._id,
                            action: 0
                        },
                        status: MatchStatus.WAITING
                    }, 
                    {
                        "actions.customerId": customer._id,
                        status: MatchStatus.CONFIRMED
                    }
                    ]
                }
            }
        )
        .exec(function(err, customers) {
            for (let i = customers.length - 1; i >= 0; i--) {
                if (customers[i].matches.length > 0) {
                    customers.splice(i, 1);
                }
            }
            if (err) return  next(err)
            return res.json(customers);
        });
    });
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
        SessionService.checkSession(customerId, next);
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
            res.json({success: true, message: 'added_customer'});
        })
        .catch(err => {
            console.log(err);
            next('customer_already_exists')
        });
    })
    /**
     * Edit customer profile
     */
    .patch((req, res, next) => {
        let token = req.body.accessToken;

        SessionService.checkSession(token, next)
        let patch = req.body;

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
        SessionService.checkSession(token, next)

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