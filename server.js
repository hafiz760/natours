const mongoose = require('mongoose');
mongoose.set('debug', false);
const dotenv = require('dotenv');
process.on('uncaughtException', err=>{
  console.log(err.name,err.message)
  console.log('UNHANDLED REJECTION SERVER SHUTTING DOWN!')
    process.exit(1)
})
dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
process.on('unhandledRejection', err=>{
  console.log(err.name,err.message)
  console.log('UNHANDLED REJECTION SERVER SHUTTING DOWN!')
  server.close(()=>{
    process.exit(1)
  })
})
