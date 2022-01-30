const mongoose = require("mongoose");
const Double   = require('@mongoosejs/double');
const { ObjectId } = require("bson");

const Schema     = mongoose.Schema;
var MessagesSchema = new Schema({ 
    id: Number,
    match: ObjectId,
    status: Number,
    date: Date,
    message: String,
    sentByCustomer: ObjectId,
    recipientCustomer: ObjectId,
});

var Messages = mongoose.model("Messages", MessagesSchema)

module.exports = Messages; 