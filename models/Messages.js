const mongoose = require("mongoose");
const Double   = require('@mongoosejs/double');
const { ObjectId } = require("bson");

const Schema     = mongoose.Schema;
var MessagesSchema = new Schema({ 
    match: {
        type: ObjectId,
        ref: 'Matches',
    },
    status: Number,
    date: Date,
    message: {
        type: String,
        required: true,
    },
    sentByCustomer: {
        type: ObjectId,
        ref: 'Customers',
    },
});

var Messages = mongoose.model("Messages", MessagesSchema)

module.exports = Messages; 