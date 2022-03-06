const SessionService = require("../services/session.service");

const bearerTokenAuth = (req, res, next) => {
    let token = SessionService.getBearerToken(req);    

    if (req.ignoreAuth) {
        return next();
    }
    
    SessionService.checkSession(token, next, (customer) => {
        req.customer = customer;
        next();
    });
}

module.exports = bearerTokenAuth;
