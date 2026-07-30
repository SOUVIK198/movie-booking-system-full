const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Screen = require('../models/Screen');
const Seat = require('../models/Seat');
const Show = require('../models/Show');

/** Helper: registers a user and returns { token, user }. */
const registerUser = async (email) => {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Tester', email, password: 'Password1' });
  return { token: res.body.token, user: res.body.data.user };
};

/** Helper: builds a movie/theatre/screen/seats/show fixture and returns showId + seatIds. */
const buildShowFixture = async () => {
  const movie = await Movie.create({
    title: 'Test Movie',
    description: 'desc',
    language: ['English'],
    genre: ['Action'],
    duration: 120,
    releaseDate: new Date(),
    status: 'now_showing',
  });

  const theatre = await Theatre.create({
    name: 'Test Theatre',
    address: { city: 'Testville' },
  });

  const screen = await Screen.create({
    theatre: theatre._id,
    name: 'Screen 1',
    screenType: '2D',
    totalSeats: 4,
    seatLayout: { rows: 1, seatsPerRow: 4 },
  });

  const seats = await Seat.insertMany([
    { screen: screen._id, row: 'A', seatNumber: 1, seatType: 'regular' },
    { screen: screen._id, row: 'A', seatNumber: 2, seatType: 'regular' },
    { screen: screen._id, row: 'A', seatNumber: 3, seatType: 'regular' },
    { screen: screen._id, row: 'A', seatNumber: 4, seatType: 'regular' },
  ]);

  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    screen: screen._id,
    showDate: new Date(),
    startTime: '18:00',
    basePrice: 10,
    format: '2D',
    language: 'English',
    seats: seats.map((s) => ({ seat: s._id, status: 'available', version: 0 })),
  });

  return { show, seats };
};

describe('Seat locking (optimistic concurrency)', () => {
  test('locking an available seat succeeds', async () => {
    const { token } = await registerUser('locker1@example.com');
    const { show, seats } = await buildShowFixture();

    const res = await request(app)
      .post(`/api/v1/shows/${show._id}/lock-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seatIds: [String(seats[0]._id)] });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.seatIds).toEqual([String(seats[0]._id)]);
  });

  test('two users racing for the same seat: only one wins, the other gets a 409 conflict', async () => {
    const { token: tokenA } = await registerUser('userA@example.com');
    const { token: tokenB } = await registerUser('userB@example.com');
    const { show, seats } = await buildShowFixture();

    const seatId = String(seats[0]._id);

    // Fire both lock requests "concurrently"
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/v1/shows/${show._id}/lock-seats`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ seatIds: [seatId] }),
      request(app)
        .post(`/api/v1/shows/${show._id}/lock-seats`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ seatIds: [seatId] }),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort();
    // Exactly one request should succeed (200) and one should conflict (409)
    expect(statuses).toEqual([200, 409]);
  });

  test('locking an already-locked seat by a different user is rejected', async () => {
    const { token: tokenA } = await registerUser('userA2@example.com');
    const { token: tokenB } = await registerUser('userB2@example.com');
    const { show, seats } = await buildShowFixture();
    const seatId = String(seats[1]._id);

    const first = await request(app)
      .post(`/api/v1/shows/${show._id}/lock-seats`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [seatId] });
    expect(first.statusCode).toBe(200);

    const second = await request(app)
      .post(`/api/v1/shows/${show._id}/lock-seats`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ seatIds: [seatId] });
    expect(second.statusCode).toBe(409);
    expect(second.body.conflictSeats).toContain(seatId);
  });

  test('unlocking releases the seat back to available for others to lock', async () => {
    const { token: tokenA } = await registerUser('userA3@example.com');
    const { token: tokenB } = await registerUser('userB3@example.com');
    const { show, seats } = await buildShowFixture();
    const seatId = String(seats[2]._id);

    await request(app)
      .post(`/api/v1/shows/${show._id}/lock-seats`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [seatId] });

    await request(app)
      .post(`/api/v1/shows/${show._id}/unlock-seats`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [seatId] });

    const res = await request(app)
      .post(`/api/v1/shows/${show._id}/lock-seats`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ seatIds: [seatId] });

    expect(res.statusCode).toBe(200);
  });

  test('expired locks are automatically treated as available on next read', async () => {
    const { token } = await registerUser('expirer@example.com');
    const { show, seats } = await buildShowFixture();
    const seatId = String(seats[3]._id);

    await request(app)
      .post(`/api/v1/shows/${show._id}/lock-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seatIds: [seatId] });

    // SEAT_LOCK_TTL_SECONDS is set to 2 in test setup
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const seatMapRes = await request(app).get(`/api/v1/shows/${show._id}/seats`);
    const seatEntry = seatMapRes.body.data.seats.find((s) => s.seatId === seatId);

    expect(seatEntry.status).toBe('available');
  });
});