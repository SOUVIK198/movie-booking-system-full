const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_SALT_ROUNDS = '4'; // faster hashing in tests
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.SEAT_LOCK_TTL_SECONDS = '2'; // short TTL to test expiry quickly

// mongodb-memory-server auto-detects the host OS to pick a matching prebuilt
// mongod binary (e.g. "ubuntu2204"). On newer/rolling distros (Ubuntu 24.04+,
// or minimal containers) MongoDB hasn't published a binary for that exact
// codename/version combo, which fails with a 403 from their download server.
// Forcing the generic "debian11" build sidesteps this — it's glibc-compatible
// with virtually every modern Linux distro and is the standard workaround.
// Override via MONGOMS_DISTRO/MONGOMS_VERSION env vars if your CI needs something else.
process.env.MONGOMS_DISTRO = process.env.MONGOMS_DISTRO || 'debian-11';
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '6.0.29';

let replSet;

// Transactions (used by bookingController) require a replica set, so we spin
// up a single-node in-memory replica set rather than a standalone mongod.
beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
}, 60000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (replSet) await replSet.stop();
});