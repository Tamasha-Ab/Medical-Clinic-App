const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  fullname: String,
  gender: String,
  phone: String,
  email: String,
  nic: String,
  address: String,
  username: String,
  password: String,
});

module.exports = mongoose.model('Patient', patientSchema);
