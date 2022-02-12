const PORT      = 8002;
const express   = require('express');
const cors      = require('cors')
const cache     = require('memory-cache');
const config    = require('./config');
const customers = require('./routes/customers');
const oauth     = require('./routes/oauth');
const matches   = require('./routes/matches');

var app         = express();
app.use(express.json());
app.use('/customers', customers);
app.use('/oauth', oauth);
app.use('/matches', matches);

app.use((err, req, res, next) => {
    if (err.status) {
        return res.status(err.status).send({ error: err });
    }
    return res.status(500).send({ error: err });
})

var corsOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    preflightContinue: false,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
   
app.use(cors(corsOptions));

let memCache = new cache.Cache();

var cacheRequest = (duration) => {
  return (req, res, next) => {
      let key = '__express__' + req.originalUrl || req.url;
      let cachedBody = memCache.get(key);

      if (cachedBody) {
          res.send(cachedBody);
          return;
      } else {
          res.sendResponse = res.send;
          res.send = (body) => {
              memCache.put(key, body, duration * 1000);
              res.sendResponse(body);
          }
          next();
      }
  }
}

app.get('/', cacheRequest(config.cacheTTL), (req, res) => {
  res.json(  
  {
      'title': 'Welcome to the PawPal API.',
      'description': '',
      'routes': [
          'POST  /customers',
          'PATCH /customers/{id}',
          'POST  /customers/login',
          'POST  /customers/logout',
          'GET   /customers/{id}',
          'POST  /matches',
          'GET   /matches',
          'GET   /matches/{id}',
          'POST  /messages',
          'GET   /messages',
          'GET   /messages/{id}',
      ]
  });
});

var cacheRequest = (duration) => {
    return (req, res, next) => {
        let key = '__express__' + req.originalUrl || req.url;
        let cachedBody = memCache.get(key);

        if (cachedBody) {
            res.send(cachedBody);
            return;
        } else {
            res.sendResponse = res.send;
            res.send = (body) => {
                memCache.put(key, body, duration * 1000);
                res.sendResponse(body);
            }
            next();
        }
    }
}

app.listen(PORT, () => console.log(`server running on port ${PORT}`));
