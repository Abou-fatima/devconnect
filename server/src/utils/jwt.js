const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

module.exports = { signToken, verifyToken };
