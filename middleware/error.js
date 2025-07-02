const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Handle MongoDB CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // Default to 500 for unhandled errors
  res.status(500).json({ message: 'Server error' });
};

module.exports = errorHandler;