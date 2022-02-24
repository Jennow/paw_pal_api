const Customers = require("../models/Customers");

const SessionService = {
    /**
     * Checks if session of customer token is still valid. If not -> Clears session and throws error
     * @param {String} token 
     * @param {Function} callback 
     * @throws Error
     */
    checkSession: async function (token, next, callback = null) {
        Customers.findOne({
            accessToken: token,
        }, (err, customer) => {
            if (err) return next(err);
            if (!customer) {
                return next('invalid_session');
            }
            let now = new Date();
            if (now > customer.sessionExpiryDate) {
                this.clearSession(token, (err, result) => {
                    if (err) return next(err);
                    return next('invalid_session');
                })
                .catch((err) => {
                    return next(err);
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
    },
    getBearerToken(req) {
        return req.get('authorization').replace('Bearer ', '');
    }
}

module.exports = SessionService; 
