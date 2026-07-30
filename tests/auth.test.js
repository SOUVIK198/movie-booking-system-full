const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Auth API', () => {
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password1',
  };

  test('POST /api/v1/auth/register creates a new user and returns a token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.password).toBeUndefined();

    const dbUser = await User.findOne({ email: validUser.email }).select('+password');
    expect(dbUser.password).not.toBe(validUser.password); // must be hashed
  });

  test('POST /api/v1/auth/register rejects duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/register rejects weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'weak@example.com', password: 'short' });

    expect(res.statusCode).toBe(400);
  });

  test('POST /api/v1/auth/login succeeds with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/v1/auth/login fails with wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1' });

    expect(res.statusCode).toBe(401);
  });

  test('GET /api/v1/auth/me requires authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/v1/auth/me returns current user with valid token', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = registerRes.body.token;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });
});