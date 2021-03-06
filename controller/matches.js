const Matches   = require("../models/Matches");
const Messages  = require("../models/Messages");
const Customers = require('../models/Customers');
const mongoose  = require('mongoose');
const { validationResult } = require('express-validator');

// Firebase 
var FCM         = require('fcm-node');
var serverKey   = process.env.FCM_SERVER_KEY;
var fcm         = new FCM(serverKey);

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

/**
 * Create or confirm match with logged in customer and selected customer
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const postMatch = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next({ status:400, errors: errors.array() });
    }

    const { customer }            = req;
    const { action }              = req.body;
    const matchedCustomerObjectId = mongoose.Types.ObjectId(req.body.matchedCustomerObjectId);

    if (!matchedCustomerObjectId) return next(
        {
            code:    400,
            message: 'matchedCustomerObjectId is required'
        }
    );
    if (action !== 1 && action !== 0)return next('action is required');

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

            let newStatus             = action === MatchActionType.YES ? MatchStatus.CONFIRMED : MatchStatus.INACTIVE;
            let matchedCustomerAction = match.actions.find(
                c => c.customerId.equals(matchedCustomerObjectId)
            ).action;

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
                    if (!result) return next({'message': 'not_found', status: 404});

                    if (newStatus === MatchStatus.CONFIRMED) {
                        customer.deviceTokens.forEach(deviceToken => {
                            let message = {
                                to: deviceToken,
                                notification: {
                                    title: 'Match best??tigt',
                                    body: 'Jemand hat dein Match best??tigt. Ihr k??nnt euch jetzt Nachrichten schreiben!'
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
                }
            )
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
}

const patchMatch = (req,res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next({ status:400, errors: errors.array() });
    }

    const patch = req.body;

    const { customer } = req;
    const matchId      = mongoose.Types.ObjectId(req.params.matchId);

    Matches.updateOne(
        {
            _id: matchId,
            customers: customer._id
        },
        patch,
        {
            upsert: true,
            new: true,
        }, (err, result) => {
            if (err) { return  next(err)}
            res.json({success: true, message: 'updated_match'});
        }
    );  
}

/**
 * Get matches of current customer. Only CONFIRMED Matches are returned
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const getMatches = (req, res, next) => {
    const { customer } = req;

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
}

async function addMatchToCustomer(customerId, match) {
    return Customers.findByIdAndUpdate(
        customerId,
        { $push: { matches: match._id } },
        { new: true, useFindAndModify: false }
    );
};

/** 
 * Send message to a specific match
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const postMessage = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next({ status:400, errors: errors.array() });
    }

    const { customer } = req;
    const { matchId }  = req.params;
    const { message }  = req.body;

    Messages.create({
        message: message,
        match: mongoose.Types.ObjectId(matchId),
        status: Status.ACTIVE,
        date: new Date(),
        sentByCustomer: customer._id
    }, (err, response) => {
        if (err) return  next(err)

        customer.deviceTokens.forEach(deviceToken => {
            let message = {
                to: deviceToken,
                notification: {
                    title: 'Neue Nachricht',
                    body: 'Jemand hat dir eine Nachricht geschrieben'
                },
            };

            fcm.send(message, (err, response) => {
                if (err) {
                    return next(err);
                } 
            })
        });
        return res.json({success: true, message: 'message_sent'})
    });
}

/**
 * Get messages for a selected match
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const getMessages = (req, res, next) => {
    const { matchId }  = req.params; 
    Messages.find({
        match: mongoose.Types.ObjectId(matchId),
        status: Status.ACTIVE,
    })
    .sort([['date', 1]])
    .exec((err, response) => {
        if (err) return  next(err)
        return res.json(response);
    });
}

module.exports = {
    postMessage,
    getMessages,
    postMatch,
    getMatches,
    patchMatch
};