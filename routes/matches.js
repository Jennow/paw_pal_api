const express = require('express');
let router    = express.Router();

const { postMatch, getMatches, getMessages, postMessage } = require('../controller/matches');

router.route('/')
    .post(postMatch)
    .get(getMatches)


router.route('/:matchId/messages')
    .post(postMessage)
    .get(getMessages)

module.exports = router;