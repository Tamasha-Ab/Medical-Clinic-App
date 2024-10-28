const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Patient = require('../models/patient'); // Import the Patient model
const router = express.Router();

// Middleware to verify JWT tokens
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user; // Save user info for use in other routes
    next();
  });
};

// Registration endpoint
router.post('/register', async (req, res) => {
  const { fullname, gender, phone, email, nic, address, username, password } = req.body;

  // Validate the request body
  if (!fullname || !gender || !phone || !email || !nic || !address || !username || !password) {
    return res.status(400).send('All fields are required');
  }

  // Validate phone number (must be exactly 10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).send('Phone number must be exactly 10 digits');
  }

  // Validate NIC (must be a string with a maximum length of 12 characters)
  if (nic.length > 12) {
    return res.status(400).send('NIC must be less than 13 characters');
  }

  // Check if the username already exists
  try {
    const existingPatient = await Patient.findOne({ username });
    if (existingPatient) {
      return res.status(400).send('Username already exists');
    }

    // Create a new patient
    const newPatient = new Patient({
      fullname,
      gender,
      phone,
      email,
      nic,
      address,
      username,
      password, // Password will be hashed in the patient model's pre-save hook
    });

    // Hash the password before saving
    console.log('Password before hashing:', password);
    newPatient.password = await bcrypt.hash(password, 10);
    console.log('Password after hashing (to be saved in DB):', newPatient.password);


    await newPatient.save();
    res.status(201).send('Patient registered successfully');
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).send('Error registering patient: ' + error.message);
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password }); 

  try {
    // Find the patient by username
    const patient = await Patient.findOne({ username });
    if (!patient) {
      console.log('Invalid login attempt: User not found.'); // Log if user not found
      return res.status(400).send('Invalid username or password.');
    }

    console.log('Patient found:', patient); // Log patient found
    console.log('Hashed Password from DB:', patient.password); // Log stored hash

    // Validate the password
    const validPassword = await bcrypt.compare(password, patient.password);
    console.log('Comparing with Plain Password:', password); // Log the input password
    console.log('Password Comparison Result:', validPassword); // Log the result of the comparison

    if (!validPassword) {
      console.log('Invalid login attempt: Incorrect password.'); // Log invalid password
      return res.status(400).send('Invalid username or password.');
    }

    // Generate a JWT token
    const token = jwt.sign({ _id: patient._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    console.log('Generated JWT Token:', token); // Log generated token

    // Send the token back to the client
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Server error');
  }
});

// Example of a protected route
router.get('/protected', authenticateToken, (req, res) => {
  res.send('This is a protected patient route. User ID: ' + req.user._id);
});

module.exports = router;
