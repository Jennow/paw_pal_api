require('dotenv').config()

const express    = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const nodemailer = require('nodemailer')

const transport = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
    user: process.env.SMTP_AUTH_EMAIL,
    pass: process.env.SMTP_TO_PASSWORD,
    },
}

const transporter = nodemailer.createTransport(transport)
  transporter.verify((error, success) => {
  if (error) {
      console.error(error)
  } else {
      console.log('Ready to send mail!')
  }
})

var corsOptions = {
  origin: true,
  optionsSuccessStatus: 200
}
   
router.post('/', (req, res) => {
  const { customer } = req;

  const mail = {
    from: customer.email,
    to: process.env.SMTP_TO_EMAIL,
    subject: 'PawPal Melde Anfrage von ' + customer._id,
    text: `
      Melde Anfrage von ${customer.title} (${customer.email}):
      Folgender Nutzer scheint sich unangebracht zu verhalten. Bitte prüfen, ob er gesperrt werden muss.
      "${req.body.name}"
      ${req.body.message}`,
    }
    transporter.sendMail(mail, (err, data) => {
        if (err) {
            res.json({
              success: false,
              status: 'fail',
            })
        } else {
            res.json({
              success: true,
              status: 'success',
            })
        }
    })
});


module.exports = router;