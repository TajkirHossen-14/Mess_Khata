import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import morgan from 'morgan'
import connectDB from './config/db.js'
import { protect } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

app.use('/api', routes)

// Temporary test route - REMOVE IN PRODUCTION
app.get('/api/test-auth', protect, (req, res) => {
  res.json({ success: true, data: req.user })
})

// Centralized error handling - must be last
app.use(errorHandler)

const PORT = process.env.PORT || 5000

async function start() {
  try {
    await connectDB()
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()