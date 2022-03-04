require('dotenv').config()
const cors    = require('cors')
const express = require('express');
let router    = express.Router();

const connectDB = require("../models/db");
const mongoose  = require('mongoose');
const database  = "paw_pal"
const Matches   = require("../models/Matches");
const Messages  = require("../models/Messages");
var FCM         = require('fcm-node');
var serverKey   = process.env.FCM_SERVER_KEY;
var fcm         = new FCM(serverKey);


const SessionService = require("../services/session.service");
const Customers = require('../models/Customers');

connectDB("mongodb://127.0.0.1:27017/"+database)

const Status = {
    INACTIVE: 0,
    ACTIVE: 1
}

const MatchStatus = {
    INACTIVE: 0,
    WAITING: 1,
    CONFIRMED: 2
}

const MatchActionType = {
    NO: 0,
    YES: 1
}

router.use(cors());

router.route('/')
    .post(async (req, res, next) => {
        let token = SessionService.getBearerToken(req);    

        let matchedCustomerObjectId = mongoose.Types.ObjectId(req.body.matchedCustomerObjectId);
        let action = req.body.action;

        if (!matchedCustomerObjectId) return next('matchedCustomerObjectId is required');
        if (action !== 1 && action !== 0)return next('action is required');

        await SessionService.checkSession(token, next, (customer) => {
            Matches.findOne({
                "customers": { 
                    $all:  [customer._id, matchedCustomerObjectId]
                }
            }, (err, match) => {
                if (err) return next(err)
    
                if (match) {
                    if (match.status === MatchStatus.CONFIRMED) {
                        return next('action_not_allowed')
                    }
    
                    let newStatus = action === MatchActionType.YES ? MatchStatus.CONFIRMED : MatchStatus.INACTIVE;
                    let matchedCustomerAction = match.actions.find(c => c.customerId.equals(matchedCustomerObjectId)).action;

                    // Match is waiting for response of the different customer
                    if (matchedCustomerAction === null) {
                        return next('action_not_allowed_for_current_customer');
                    }

                    let updatedMatchActions = [
                        {
                            customerId: customer._id,
                            action: action,
                        },
                        {
                            customerId: matchedCustomerObjectId,
                            action: matchedCustomerAction,
                        }
                    ]
    
                    Matches.updateOne(
                        {
                            _id: match._id
                        },
                        {
                            status: newStatus,
                            actions: updatedMatchActions,
                        }, (err, result) => {
                            if (err) return next(err)
                            if (!result) return next ('match_not_found')

                            if (newStatus === MatchStatus.CONFIRMED) {
                                customer.deviceTokens.forEach(deviceToken => {
                                    let matchedCustomerDeviceToken = deviceToken; 
                                    let message = {
                                        to: matchedCustomerDeviceToken,
                                        notification: {
                                            title: 'Match bestätigt',
                                            body: 'Jemand hat dein Match bestätigt. Ihr könnt euch jetzt Nachrichten schreiben!'
                                        },
                                    };
        
                                    fcm.send(message, (err, response) => {
                                        if (err) {
                                        return next(err);
                                        } 
                                    })
                                });
                                return res.json({success: true, message: 'match_confirmed'})

                            } else {
                                return res.json({success: true, message: 'match_updated'})
                            }
                        })
                } else {
            // If not -> Create new match with status "waiting" or "rejected" dependng on the choice of the customer
                    let newStatus = action === MatchActionType.YES ? MatchStatus.WAITING : MatchStatus.INACTIVE;
                   
                    Matches.create({
                        actions: [
                            {
                                customerId:  customer._id,
                                action: action,
                            },
                            {
                                customerId: matchedCustomerObjectId,
                                action: null,
                            },
                        ],
                        customers: [
                            customer._id,
                            matchedCustomerObjectId
                        ],
                        status: newStatus,
                        date: new Date()
                    }, (err, result) => {
                        console.log(result);
                        if (err) return next(err)
                        addMatchToCustomer(matchedCustomerObjectId, result._id)
                        .then(() => {
                            addMatchToCustomer(customer._id, result._id);
                        })                       
                        res.json({success: true, messgae: 'match_created'})
                    })
                }
            })
        })
    })
    .get((req, res, next) => {
        let token = SessionService.getBearerToken(req);    

        SessionService.checkSession(token, next, (customer) => {
            Matches.find({
                customers: customer._id,
                status: MatchStatus.CONFIRMED
            })
            .populate({
                path: 'customers',
                select: 'title profileImageUrl',
                match: {
                    _id: {
                        $ne: customer._id,
                    }
                }
            }
            )
            .exec(function(err, matches) {
                if (err) return  next(err)
                return res.json(matches);
            });
        })
    })

    async function addMatchToCustomer(customerId, match) {
        return Customers.findByIdAndUpdate(
            customerId,
            { $push: { matches: match._id } },
            { new: true, useFindAndModify: false }
        );
    };


router.route('/:matchId/messages')
    /**
     * Send message to a specific match
     */
    .post((req, res, next) => {
        let matchId = req.params.matchId;
        let token   = SessionService.getBearerToken(req);    
        let message = req.body.message;

        if (!message)return next('message is required');

        SessionService.checkSession(token, next, (customer) => {
            Messages.create({
                message: message,
                match: mongoose.Types.ObjectId(matchId),
                status: Status.ACTIVE,
                date: new Date(),
                sentByCustomer: customer._id
            }, (err, response) => {
                if (err) return  next(err)

                let matchedCustomerDeviceToken = process.env.FCM_TEST_DEVICE_TOKEN; // TODO: Use device token of customer
                let message = {
                    to: matchedCustomerDeviceToken,
                    notification: {
                        title: 'Neue Nachricht',
                        body: 'Jemand hat dir eine Nachricht geschrieben'
                    },
                };

                fcm.send(message, (err, response) => {
                    if (err) {
                        return next(err);
                    } 
                    return res.json({success: true, message: 'message_sent'});
                })

            });
        })
    })
    /**
     * Get messages for a selected match
     */
    .get((req, res, next) => {
        let matchId = req.params.matchId;
        let token   = SessionService.getBearerToken(req);    
        SessionService.checkSession(token, next, (customer) => {
            Messages.find({
                match: mongoose.Types.ObjectId(matchId),
                status: Status.ACTIVE,
            })
            .sort([['date', 1]])
            .exec((err, response) => {
                if (err) return  next(err)
                return res.json({response});
            });
        })
    })

module.exports = router;