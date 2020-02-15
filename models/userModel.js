const crypto = require('crypto');

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Please tell us your name']
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      required: [true, 'Please provide your email'],
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
      type: String,
      default: 'default.jpg'
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 5,
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function(val) {
          return val === this.password;
        },
        message: 'Password confirm is not correct'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpiredTime: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Encrypt user password
userSchema.pre('save', async function(next) {
  // If the password is not changed, then continue
  if (!this.isModified('password')) return next();

  try {
    // Hash user password with bcrypt
    this.password = await bcrypt.hash(this.password, 12);

    // Delete passwordConfirm fields, no need to persist it in database
    this.passwordConfirm = undefined;
    next();
  } catch (err) {
    next(err);
  }
});

// Auto set passwordChangedAt property if password changed
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  // There are sometimes that the JWT is created before the passwordChangedAt is set
  // So we substract its time to 1s, so that the JWT is valid
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.isCorrectPassword = async function(candidatePass, userPass) {
  // Cannot use this.password because password select property is false
  // If exception, throw it to caller to handle
  return await bcrypt.compare(candidatePass, userPass);
};

userSchema.methods.isChangedPasswordAfterJWTIsIssued = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return passwordChangedTimestamp > JWTTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // The password reset token will expire in 10 minutes
  this.passwordResetTokenExpiredTime = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
