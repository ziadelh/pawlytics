const nodemailer = require('nodemailer');

// SMTP credentials come from the environment (see .env.example).
// If they are not set, welcome emails are skipped instead of crashing signup.
const { EMAIL_USER, EMAIL_PASS } = process.env;

const transporter = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    })
  : null;

function sendWelcomeEmail(to, name) {
    if (!transporter) {
      console.warn('EMAIL_USER / EMAIL_PASS not set - skipping welcome email');
      return;
    }

    const mailOptions = {
    from: `"Pawlytics WebApp" <${EMAIL_USER}>`,
    to: to,
    subject: '🐾 Welcome to Pawlytics — Your Pet’s New Best Friend!',
    html: `<p>Hi ${name},<br><br>
            Welcome to <strong>Pawlytics</strong> – your personalized pet health assistant! 🐾<br><br>
            With Pawlytics, you can:<br>
            • Track your pet’s medical history<br>
            • Get smart health recommendations<br>
            • Receive appointment alerts & more!<br><br>
            Dive in and explore your dashboard today.<br><br>
            Best regards,<br>
            <strong>The Pawlytics Team</strong></p>`
    };


  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err.message);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

module.exports = sendWelcomeEmail;