require('dotenv').config()
const cors    = require('cors')
const express = require('express');
let router    = express.Router();

const connectDB = require("../models/db");
const mongoose  = require('mongoose');
const database  = "paw_pal"
const Matches   = require("../models/Matches");
const Messages  = require("../models/Messages");

const SessionService = require("../services/session.service");

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
        let token = req.body.accessToken;
        let matchedCustomerObjectId = mongoose.Types.ObjectId(req.body.matchedCustomerObjectId);
        let action = req.body.action;

        if (!matchedCustomerObjectId) return next('matchedCustomerObjectId is required');
        if (!action)return next('action is required');

        await SessionService.checkSession(token, (customer) => {
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
                            return res.json({success: true, messgae: 'match_updated'})
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
                        if (err) return next(err)
                        console.log(result)
                        return res.json({success: true, messgae: 'match_created'})
                    })
                }
            })
        }).catch(next);
    })
    .get((req, res, next) => {
        let token = req.body.accessToken;

        SessionService.checkSession(token, (customer) => {
            Matches.find({
                customers: customer._id,
                // TODO: Only show confirmed matches in Matches List
                // status: MatchStatus.CONFIRMED
                // TODO: Also show profile image of other customer and last message
            })
            .populate('customers', 'title profileImageUrl')
            .exec(function(err, matches) {
                if (err) return  next(err)
                return res.json(matches);
            });
        })
        .catch(next);
    })

router.route('/:matchId/messages')
    /**
     * Send message to a specific match
     */
    .post((req, res, next) => {
        let matchId = req.params.matchId;
        let token   = req.body.accessToken;
        let message = req.body.message;

        if (!message)return next('message is required');

        SessionService.checkSession(token, (customer) => {
            Messages.create({
                message: message,
                matchId: mongoose.Types.ObjectId(matchId),
                status: Status.ACTIVE,
                date: new Date(),
                sentByCustomer: customer._id
            }, (err, response) => {
                if (err) return  next(err)
                return res.json({success: true, message: 'message_sent'});
            });
        }).catch(next);
    })
    /**
     * Get messages for a selected match
     */
    .get((req, res, next) => {
        let matchId = req.params.matchId;
        let token   = req.params.token;
        SessionService.checkSession(token, (customer) => {
            Messages.find({
                matchId: mongoose.Types.ObjectId(matchId),
                status: Status.ACTIVE,
            })
            .sort([['date', -1]])
            .exec((err, response) => {
                if (err) return  next(err)
                return res.json({response});
            });
        }).catch(next);
    })

module.exports = router;