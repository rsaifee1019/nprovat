const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX
});

exports.addSubscriber = async (email, name) => {
  try {
    const response = await mailchimp.lists.addListMember(process.env.MAILCHIMP_LIST_ID, {
      email_address: email,
      status: "subscribed",
      merge_fields: {
        NAME: name
      }
    });
    console.log(`Successfully added contact as an audience member. The contact's id is ${response.id}.`);
    return response;
  } catch (error) {
    console.error('Error adding subscriber to Mailchimp:', error);
    throw error;
  }
};

const User = require('../models/User'); // Assuming you have a User model

exports.register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    // Add member to Mailchimp list
    await mailchimp.lists.addListMember(process.env.MAILCHIMP_LIST_ID, {
      email_address: email,
      status: "subscribed",
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName
      }
    });

    // Create user in your database
    const user = new User({ email, firstName, lastName });
    await user.setPassword(password);
    await user.save();

    // Generate JWT
    const token = user.generateJWT();

    res.status(201).json({ user: user.toAuthJSON(), token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !await user.validatePassword(password)) {
      return res.status(400).json({ error: 'Email or password is invalid' });
    }

    const token = user.generateJWT();
    res.json({ user: user.toAuthJSON(), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};