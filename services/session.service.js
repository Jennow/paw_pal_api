const Customers = require("../models/Customers");

const SessionService = {
    /**
     * Checks if session of customer token is still valid. If not -> Clears session and throws error
     * @param {String} token 
     * @param {Function} callback 
     */
    checkSession: async function (token, callback = null) {
        Customers.findOne({
            accessToken: token,
        }, (err, customer) => {
            if (err) throw err;
            if (!customer) {
                throw new Error('invalid_session');
            }
            let now = new Date();
            if (now > customer.sessionExpiryDate) {
                this.clearSession(token, (err, result) => {
                    if (err) throw err;
                    throw new Error('invalid_session');
                })
                .catch((err) => {
                    throw err;
                });
            } else {
                if (callback) {
                    callback(customer);
                }
                return;
            }
        }).clone()
    },

    /**
     * Clears session parameters from customer document
     * @param {String} token 
     * @param {Function} callback 
     */
    clearSession: async function(token, callback) {
        Customers.updateOne(
            {
                accessToken: token
            },
            {
                accessToken: null,
                sessionExpiryDate: null,
            },{
                upsert: false,
                new: false,
            }, (err, result) => {
                callback(err, result);
            }
        )
        .clone()
    }
}

module.exports = SessionService; 
