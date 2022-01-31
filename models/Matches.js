const mongoose = require("mongoose");
const Double   = require('@mongoosejs/double');
const { ObjectId } = require("bson");

const Schema      = mongoose.Schema;
var MatchesSchema = new Schema({ 
    customers: [
        { 
            type: ObjectId,
            ref: 'Customers',
        }
    ],
    actions: [ 
        {
            customerId: ObjectId,
            action: Number
        }
    ],
    status: Number,
    notification: Boolean,
    date: Date
});

var Matches = mongoose.model("Matches", MatchesSchema)

module.exports = Matches; 