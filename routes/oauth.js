require('dotenv').config()
const cors      = require('cors')

const express = require('express');
let router    = express.Router();
const crypto  = require('crypto')

const connectDB = require("../models/db");
const database  = "paw_pal"
const Customers = require("../models/Customers");
const SessionService = require("../services/session.service");

connectDB("mongodb://127.0.0.1:27017/"+database)

router.use(cors());

/**
 * Login Customer
 * saves an accessToken and an expirydate to the customer
 * if refreshToken is passed -> Find customer with token and refresh session
 */
router.post('/token', (req, res, next) => {

    var filter;
    if (req.body.refreshToken) {
        filter = {
            accessToken: req.body.refreshToken
        }
    } else {
        let password = crypto.createHash('md5')
        .update(process.env.PASSWORD_HASH + req.body.password)
        .digest('hex');

        filter = {
            email: req.body.email,
            password: password
        }
    }

    let deviceToken = req.body.deviceToken;
    let now = new Date();

    Customers.findOne(filter, (err, customer) => {        
        if (err) return next(err) 
        if (!customer) return next({'message': 'customer_not_found', status: 401});
    
        console.log(customer);
        console.log(deviceToken);
        const deviceTokens = customer.deviceTokens ? customer.deviceTokens : [];
        
        if (deviceToken) {
            index = deviceTokens.indexOf(deviceToken);
            console.log(index);
            if (index === -1) {
                deviceTokens.push(deviceToken.token);
            }
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
                deviceTokens: deviceTokens
            },{
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }, (err, result) => {
                if (err) return next(err);
                res.json(result);
            }
        );  
    });
});

/**
 * Logout customer
 * removes accessToken and expiryDate from customer
 */
router.post('/logout', (req, res, next) => {
    let token       = req.body.token;
    let deviceToken = req.body.deviceToken

    Customers.findOne({
        accessToken: token,
    }, (err, customer) => {
        console.log(customer);
        if (err) { next(err) }
        if (!customer) {
            return next('invalid_session');
        }

        SessionService.clearSession(token, (err, result) => {   
            if (err) {
               return next(err);
            }

            const deviceTokens = customer.deviceTokens ? customer.deviceTokens : [];
            if (deviceToken) {
                index = deviceTokens.indexOf(deviceToken);
                if (index !== -1) {
                    deviceTokens.splice(index, 1);
                }
            }

            Customers.updateOne({'_id': customer._id}, {
                deviceTokens: deviceTokens,
                accessToken: '',
                sessionExpiryDate: null,
            }, (err, response) => {

                console.log(response)
                if (err) {
                    return next(err);
                }
                return res.json({success: true, message:'logged_out'}); return;
            })
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
    SessionService.checkSession(token, next, () => {
        res.json({'success': true, 'message': 'session_valid'});
    })
})

module.exports = router;