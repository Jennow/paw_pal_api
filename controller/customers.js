const Customers = require("../models/Customers");
const crypto  = require('crypto')
const { validationResult } = require('express-validator');

const defaultLimit = 10;

const MatchStatus = {
    INACTIVE: 0,
    WAITING: 1,
    CONFIRMED: 2
}

/**
 * Get List of customers
 * -> Load customers in chunks
 * -> Dont load customers that already have a match with current customer 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const getExploreCustomers = (req, res, next) =>  {
    const { customer }       = req;
    const { last_id, limit } = req.query;
    let options              = {};

    // if (limit) {
    //     options.limit = limit
    // } else {
    //     options.limit = defaultLimit;
    // }

    let where = {
        _id: {
            $ne: customer._id,
        }
    }

    // If customer allows location -> Only show other customers that allow location and are closer than 10km    
    if (customer.location && Object.keys(customer.location).length === 0) {
        where.location = { $near:{ $geometry: customer.location, $maxDistance: 10000 }};
    }
    
    if (last_id) {
        where.id = {$gt: parseInt(last_id)}
    }

    console.log(where);
    
    Customers.find(where, 
    [
        '_id',
        'id',
        'title',
        'description',
        'profileImageUrl',
        'characteristics',
        'searchingFor',
        'location'
    ], options)
    .populate(
        {
            path: 'matches',
            select: '_id status customers actions',
            match: 
            {
                $or: [
                {
                    actions: {
                        customerId: customer._id,
                        action: 1
                    },
                    status: MatchStatus.WAITING
                }, 
                {
                    customers: customer._id,
                    status: MatchStatus.INACTIVE
                }, 
                {
                    customers: customer._id,
                    status: MatchStatus.CONFIRMED
                }
                ]
            }
        }
    )
    .exec(function(err, customers) {
        if (err) return next(err);
        for (let i = customers.length - 1; i >= 0; i--) {
            if (customers[i].matches.length > 0) {
                customers.splice(i, 1);
            }
        }
        if (err) return  next(err)
        return res.json(customers);
    });
}

/**
 *  Get single Customerprofile
 *  Either numeric (id) 
 *  or alphanumeric (accessToken) (deprecated -> has to be removed from app)
 *  Blacklist comlumns if requested profile is not equal to logged in profile
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const getCustomer = (req, res, next) => {
    const { customerId } = req.params;
    console.log(customerId);
    const customer       = req;
    let blackListColumns = {};

    let where      = {
        accessToken: customerId
    }

    if (!isNaN(customerId)) {
        where = {
            id: customerId
        }
    }

    if (customer.id !== customerId && customer.accessToken !== customerId) {
        blackListColumns = {
            __v: false,
            password: false,
            accessToken: false,
            sessionExpiryDate: false,
        }
    }

    Customers.findOne(where, blackListColumns, (err, customer) => {
        if (err) return next(err);
        if (!customer) return next({'message': 'not_found', status: 404});

        console.log(customer)
        return res.json(customer);
    });
}

/**
 * Add new Customer
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const addCustomer = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next({ status:400, errors: errors.array() });
    }

    let customerData      = req.body;
    customerData.password = crypto.createHash('md5')
                                .update(process.env.PASSWORD_HASH + req.body.password)
                                .digest('hex')
    
    Customers.create(req.body).then((customer) => {
        res.json({success: true, message: 'added_customer'});
    })
    .catch(err => {
        next({
            messgae: 'customer_already_exists',
            code: 400
        })
    });
}

/**
 * Edit customer profile
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const editCustomer = (req, res, next) => {
    let patch = req.body;

    if (req.body.password) {
        patch.password = crypto.createHash('md5')
        .update(process.env.PASSWORD_HASH + req.body.password)
        .digest('hex')
    } else {
        delete patch.password;
    }

    Customers.updateOne(
        {
            accessToken: token
        },
        patch,
        {
            upsert: true,
            new: true,
        }, (err, result) => {
            if (err) { return  next(err)}
            res.json({success: true, message: 'updated_customer'});
        }
    );  
}

/**
 * Delete customer profile
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const deleteCustomer = (req, res, next) => {
    Customers.deleteOne(
        {
            accessToken: token
        }, (err, result) => {
            if (err) { return  next(err)}
            res.json({success: true, message: 'deleted_customer'});
        }
    );  
}


module.exports = {
    getExploreCustomers,
    getCustomer,
    addCustomer,
    editCustomer, 
    deleteCustomer,
}