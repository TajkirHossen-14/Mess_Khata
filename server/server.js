import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MessKhata API is running' });
});
app.use('/api', apiRoutes);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`MessKhata API listening on port ${port}`));
};

startServer();
