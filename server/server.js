import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { protect } from './middleware/auth.js';
import testRouter from './routes/test.js';
import indexRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startReminderJobs } from './jobs/reminderScheduler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MessKhata API is running' });
});

app.use('/api/test', testRouter);
app.use('/api', indexRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    startReminderJobs();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

export default app;
