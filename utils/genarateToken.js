const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Signs a JWT for the user, sets it as an httpOnly cookie (defense against XSS
 * token theft) AND returns it in the JSON body (so mobile/non-cookie clients
 * can use Bearer auth too), then sends the response.
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;
  user.refreshTokens = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

module.exports = { signToken, createSendToken };