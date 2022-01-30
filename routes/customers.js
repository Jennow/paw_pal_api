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

router.post('/', (req, res) => {
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
        res.json({'message': err.message, 'error': err});
    });
});

router.post('/login', (req, res) => {
    let password = crypto.createHash('md5')
            .update(process.env.PASSWORD_HASH + req.body.password)
            .digest('hex');
    let now = new Date();

    Customers.findOne({
        email: req.body.email,
        password: password
    }, (err, customer) => {
        if (err) {
            res.json(err);
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
                    res.json(err);
                    return;
                }
                mongoose.disconnect();
                res.json(result);
            }
        );  
    });
});

router.post('/:token/logout', (req, res, next) => {
    let token = req.params.token;
    Customers.findOneAndUpdate(
        {
            accessToken: token,
        },
        {
            accessToken: null,
            sessionExpiryDate: null,
        },{
            upsert: false,
            new: false,
        }, (err) => {
            if (err) {
                next(err); return;
            }
            mongoose.disconnect();
            res.json({success: true, message:'logged_out'}); return;
        }
    )
    .clone()
    .catch(next);
});

router.get('/:token/validate', (req, res, next) => {
    let token = req.params.token;

    Customers.findOne({
        accessToken: token,
    }, (err, customer) => {
        if (err) { next(err) }

        if (customer === null) {
            next('invalid_session'); return;
        }
        let now = new Date();
        if (now > customer.sessionExpiryDate)
        {
            // Session Token und expired vom Customer entfernen
            Customers.updateOne(
                {
                    id: customer.id
                },
                {
                    accessToken: null,
                    sessionExpiryDate: null,
                },{
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }, (err, result) => {
                    if (err) {
                        next(err); return;
                    }
                    next('invalid_session'); return;
                }
            )
            .clone()
            .catch(next);
        } else {a
            mongoose.disconnect();
            res.json(customer);
        }
    
    }).clone().catch(next);
})

router.route('/:customerId')
    .get((req, res) => {
        res.json({'foo': 'bar'});
    })
    .post((req, res) => {
        res.json({'foo': 'bar'});

    })
    .patch((req, res) => {
        res.json({'foo': 'bar'});
    })    
    .delete((req, res) => {
        res.json({'foo': 'bar'});
    });

module.exports = router;

// TODO: add GET POST PATCH and DELETE Requests
// -> Speziell bei GET -> wenn customerId -> weniger ausgeben als bei customerToken
// -> Alle anderen: Nur mit gültigem CustomerToken aufrufbar 