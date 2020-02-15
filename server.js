const mongoose = require('mongoose');
const dotenv = require('dotenv');
const chalk = require('chalk');

process.on('uncaughtException', err => {
  console.error(err);
  console.log('UNCAUGHT REJECTION! 💥 Shutting down...');

  // exit 0 when everything is OK
  // exit 1 when there is exception
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

const port = process.env.PORT || 3000;

const DB_CONNECTION = process.env.DB_CONNECTION.replace(
  'USER',
  process.env.DB_USER
).replace('<PASSWORD>', process.env.DB_PASS);

mongoose
  .connect(DB_CONNECTION, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log(`DB connection ${chalk.green('successful!')}`))
  .catch(() => {
    console.log(chalk.red('DB connection fail! Shutting down...'));
    process.exit(1);
  });

const server = app.listen(port, () => {
  console.log(`Server is running at port: ${chalk.green(port)}...`);
});

process.on('unhandledRejection', err => {
  console.error(err);
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  server.close(() => {
    // exit 0 when everything is OK
    // exit 1 when there is exception
    process.exit(1);
  });
});
