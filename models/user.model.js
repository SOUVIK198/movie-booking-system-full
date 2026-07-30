const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // this already creates the index; no need for a separate schema.index() call
      lowercase: true,
      trim: true,
      match: [/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never return password by default
    },
    phone: {
      type: String,
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      url: String,
      publicId: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    refreshTokens: [{ type: String, select: false }],
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  return jwtTimestamp < changedTimestamp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);