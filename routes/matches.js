const express  = require('express');
let router     = express.Router();
const { body } = require('express-validator');

const { postMatch, getMatches, getMessages, postMessage, patchMatch } = require('../controller/matches');

router.route('/')
    .post(
        body('matchedCustomerObjectId').isString().notEmpty(),
        body('action').isInt().notEmpty(),
        postMatch
    )
    .get(getMatches)

router.route('/:matchId')
    .patch(
        body('status').isInt().notEmpty(),
        patchMatch
    )


router.route('/:matchId/messages')
    .post(
        body('message').isString().notEmpty(),
        postMessage
    )
    .get(getMessages)

module.exports = router;