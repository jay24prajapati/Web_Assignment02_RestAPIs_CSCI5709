const mongoose = require('mongoose');
const moment = require('moment');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    trim: true,
  },
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cuisine: {
    type: String,
    trim: true,
  },
  openingHours: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  closingHours: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function (value) {
        const opening = moment(this.openingHours, 'HH:mm');
        const closing = moment(value, 'HH:mm');
        return closing.isAfter(opening);
      },
      message: 'Closing hours must be after opening hours',
    },
  },
  slotDuration: {
    type: Number,
    required: true,
    enum: [30, 60, 90, 120],
    default: 60,
  },
  menu: [menuItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);