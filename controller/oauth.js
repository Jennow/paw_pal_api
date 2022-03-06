const crypto  = require('crypto')

const Customers      = require("../models/Customers");
const SessionService = require("../services/session.service");

/**
 * Login Customer
 * saves an accessToken and an expirydate to the customer
 * if refreshToken is passed -> Find customer with token and refresh session
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const login = (req, res, next) => {    
    const { refreshToken, email, location, deviceToken } = req.body;
    let { password }                        = req.body;
    var filter;

    if (req.body.refreshToken) {
        filter = {
            accessToken: refreshToken
        }
    } else {
        password = crypto.createHash('md5')
        .update(process.env.PASSWORD_HASH + password)
        .digest('hex');

        filter = {
            email: email,
            password: password
        }
    }

    let now = new Date();

    Customers.findOne(filter, (err, customer) => {        
        if (err) return next(err) 
        if (!customer) return next({'message': 'customer_not_found', status: 401});
        const deviceTokens = customer.deviceTokens ? customer.deviceTokens : [];
        
        if (deviceToken) {
            index = deviceTokens.indexOf(deviceToken);
            if (index === -1) {
                deviceTokens.push(deviceToken.token);
            }
        }

        let accessToken = crypto.createHash('md5')
            .update(now.getTime() + process.env.SESSION_TOKEN_HASH + customer.id)
            .digest('hex');

        let sessionExpiryDate = new Date(now.getTime() + process.env.SESSION_TTL*1000);
   
        let updateObject = {
            accessToken: accessToken,
            sessionExpiryDate: sessionExpiryDate,
            deviceTokens: deviceTokens,
        };

        if (location) {
            updateObject.location = { type: "Point", coordinates: [location.lng, location.lat] }
        }

        Customers.findOneAndUpdate(
            {
                id: customer.id
            }, 
            updateObject,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }, (err, result) => {
                if (err) return next(err);
                res.json(result);
            }
        );  
    });
}

/**
 * Logout customer
 * removes accessToken and expiryDate from customer
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const logout = (req, res, next) => {
    const { token, deviceToken } = req.body;

    Customers.findOne({
        accessToken: token,
    }, (err, customer) => {
        if (err) { next(err) }
        if (!customer) {
            return next('invalid_session');
        }

        SessionService.clearSession(token, (err, result) => {   
            if (err) return next(err);
            
            const deviceTokens = customer.deviceTokens ? customer.deviceTokens : [];
            if (deviceToken) {
                index = deviceTokens.indexOf(deviceToken);
                if (index !== -1) {
                    deviceTokens.splice(index, 1);
                }
            }

            Customers.updateOne({'_id': customer._id}, {
                deviceTokens: deviceTokens,
                accessToken: '',
                sessionExpiryDate: null,
            }, (err, response) => {
                if (err) {
                    return next(err);
                }
                return res.json({success: true, message:'logged_out'}); return;
            })
        })
        .catch(next);
    }).clone().catch(next);
}

/**
 * Checks if the customer is still logged in 
 * -> Token needs to be equal to the one of the customer
 * -> session expiry date of the customer has to be in the future
 * -> Else the customer session is cleared  * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const validate = (req, res, next) => {
    const { token } = req.params;
    SessionService.checkSession(token, next, () => {
        res.json({'success': true, 'message': 'session_valid'});
    })
}

module.exports = {
    login,
    logout, 
    validate
}