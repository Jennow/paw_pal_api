const mongoose     = require("mongoose");
const Double       = require('@mongoosejs/double');
var AutoIncrement  = require('mongoose-sequence')(mongoose);
const { ObjectId } = require("bson");

const Schema        = mongoose.Schema;


/**
 * For location to work, a 2dsphere index needs to be created in the mongodb
 */
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
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
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
    deviceTokens: [String],
    searchingFor: [String],
    profileImageUrl: String,
    characteristics: [String],
    accessToken: String,
    sessionExpiryDate: Date,
});

CustomersSchema.plugin(AutoIncrement, {id:'id_seq',inc_field: 'id'});
CustomersSchema.index({ location : "2dsphere" });

var Customers  = mongoose.model("Customers", CustomersSchema)
module.exports = Customers; 