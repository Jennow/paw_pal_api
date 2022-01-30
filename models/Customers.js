const mongoose = require("mongoose");
const Double   = require('@mongoosejs/double');

const Schema     = mongoose.Schema;
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
    searchingFor: [String],
    profileImageUrl: String,
    characteristics: [String],
    accessToken: String,
    sessionExpiryDate: Date,
});

var Customers = mongoose.model("Customers", CustomersSchema)

module.exports = Customers; 