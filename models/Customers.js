const mongoose     = require("mongoose");
const Double       = require('@mongoosejs/double');
var AutoIncrement  = require('mongoose-sequence')(mongoose);
const { ObjectId } = require("bson");

const Schema        = mongoose.Schema;
var CustomersSchema = new Schema({ 
    id: Number,
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    status: {
        type: Number,
        required: true,
    },
    location: {
        lat: Double,
        lng: Double
    },
    description: {
        type: String,
        required: true,
    },
    matches: [
        { 
            type: ObjectId,
            ref: 'Matches',
        }
    ],
    searchingFor: [String],
    profileImageUrl: String,
    characteristics: [String],
    accessToken: String,
    sessionExpiryDate: Date,
});

CustomersSchema.plugin(AutoIncrement, {id:'id_seq',inc_field: 'id'});

var Customers = mongoose.model("Customers", CustomersSchema)

module.exports = Customers; 