const mongoose = require("mongoose");
const Double   = require('@mongoosejs/double');
const { ObjectId } = require("bson");

const Schema     = mongoose.Schema;
var MatchesSchema = new Schema({ 
    id: Number,
    customer1: ObjectId,
    customer2: ObjectId,
    status: Number,
    date: Date
});

var Matches = mongoose.model("Matches", MatchesSchema)

module.exports = Matches; 