const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['customer', 'owner', 'admin'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role === 'owner' ? false : true;
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);