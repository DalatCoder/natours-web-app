const path = require('path');

const pug = require('pug');
const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `'Trong Hieu 👻' <${process.env.EMAIL_FROM}>`;
  }

  createTransport() {
    if (process.env.NODE_ENV === 'development') {
      return nodemailer.createTransport({
        host: process.env.MAIL_SERVICE_HOST,
        port: process.env.MAIL_SERVICE_HOST,
        auth: {
          user: process.env.MAIL_SERVICE_USERNAME,
          pass: process.env.MAIL_SERVICE_PASSWORD
        }
      });
    }
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }
  }

  async send(template, subject) {
    // 1) Render HTML base on Pug template
    const html = pug.renderFile(
      path.join(__dirname, '../views/emails', `${template}.pug`),
      {
        firstName: this.firstName,
        url: this.url,
        subject
      }
    );

    // 2) Define mail options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html)
    };

    // 3) Create a transport and actually send email
    await this.createTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'resetPassword',
      'Your password reset token (only valid for 10 minutes)'
    );
  }
};
