export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message)
  
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  
  res.status(statusCode).json({
    success: false,
    message
  })
}