require('dotenv').config()
const express = require('express');
let router    = express.Router();
const crypto  = require('crypto')

const connectDB = require("../models/db");
const mongoose  = require('mongoose');
const database  = "paw_pal"
const Customers = require("../models/Customers");

connectDB("mongodb://127.0.0.1:27017/"+database)

const Status = {
    INACTIVE: 0,
    ACTIVE: 1
}

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
 * Login Customer
 * saves an accessToken and an expirydate to the customer
 */
router.post('/login', (req, res, next) => {
    let password = crypto.createHash('md5')
            .update(process.env.PASSWORD_HASH + req.body.password)
            .digest('hex');
    let now = new Date();

    Customers.findOne({
        email: req.body.email,
        password: password
    }, (err, customer) => {
        if (err) {
            next(err) 
            return;
        }

        let accessToken = crypto.createHash('md5')
            .update(now.getTime() + process.env.SESSION_TOKEN_HASH + customer.id)
            .digest('hex');

        let sessionExpiryDate = new Date(now.getTime() + process.env.SESSION_TTL*1000);
   
        Customers.findOneAndUpdate(
            {
                id: customer.id
            },
            {
                accessToken: accessToken,
                sessionExpiryDate: sessionExpiryDate,
            },{
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }, (err, result) => {
                if (err) {
                    next(err) 
                    return;
                }
                mongoose.disconnect();
                res.json(result);
            }
        );  
    });
});

/**
 * Logout customer
 * removes accessToken and expiryDate from customer
 */
router.post('/:token/logout', (req, res, next) => {
    let token = req.params.token;

    Customers.findOne({
        accessToken: token,
    }, (err, customer) => {
        if (err) { next(err) }

        if (!customer) {
            next('invalid_session'); return;
        }
        clearSession(token, (err, result) => {
            if (err) {
                next(err); return;
            }
            res.json({success: true, message:'logged_out'}); return;
        })
        .catch(next);
    }).clone().catch(next);
});

/**
 * Checks if the customer is still logged in 
 * -> Token needs to be equal to the one of the customer
 * -> session expiry date of the customer has to be in the future
 * -> Else the customer session is cleared 
 */
router.get('/:token/validate', (req, res, next) => {
    let token = req.params.token;
    checkSession(token, () => {
        res.json({'success': true, 'message': 'session_valid'});
    }).catch(next);
})

/**
 * Get List of customers
 * -> Load customers in chunks
 * -> Dont load customers that already have a match with current customer 
 */
 router.get('/:token/explore', (req, res, next) => {

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
                _id: false,
                password: false,
                accessToken: false,
                sessionExpiryDate: false,
            }
        } else {
            checkSession(customerId).catch(next);
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
        checkSession(token).catch(next);
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
        checkSession(token).catch(next);

        Customers.deleteOne(
            {
                accessToken: token
            }, (err, result) => {
                if (err) { return  next(err)}
                res.json({success: true, message: 'deleted_customer'});
            }
        );  
    });


router.route('/:token/matches')
    .post((req, res, next) => {
        // Check if match with person already exists
        // If exists -> Change status to "active" or "rejected" depending if customer klicked yes or no
        // If not -> Create new match with status "waiting" or "rejected" dependng on the choice of the customer
    })
    .get((req, res, next) => {
        // Get list of matches with status "active"
    })
    .patch((req, res, next) => {
        // Only allowed to change match status
    })

router.route('/:token/messages/:matchId')
    .post((req, res, next) => {
        // Add message 
        // sender    -> Customer of token
        // recipient -> Other Customer of match (matchId)
        // required: message text
    })
    .get((req, res, next) => {
        // Get list of messages 
        // Sort by date
        // Add parameter depending on who sent the message or just use sentByCustomer in frontend
    })

/**
 * Checks if session of customer token is still valid. If not -> Clears session and throws error
 * @param {String} token 
 * @param {Function} callback 
 */
async function checkSession(token, callback = null) {
    Customers.findOne({
        accessToken: token,
    }, (err, customer) => {
        if (err) throw err;
        if (!customer) {
            throw new Error('invalid_session');
        }
        let now = new Date();
        if (now > customer.sessionExpiryDate) {
            clearSession(token, (err, result) => {
                if (err) throw err;
                throw new Error('invalid_session');
            })
            .catch((err) => {
                throw err;
            });
        } else {
            
            if (callback) {
                callback();
            }
            return;
        }
    }).clone()
}


/**
 * Clears session parameters from customer document
 * @param {String} token 
 * @param {Function} callback 
 */
async function clearSession(token, callback) {
    Customers.updateOne(
        {
            accessToken: token
        },
        {
            accessToken: null,
            sessionExpiryDate: null,
        },{
            upsert: false,
            new: false,
        }, (err, result) => {
            callback(err, result);
        }
    )
    .clone()
}

module.exports = router;