import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/connectDB.js';
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

//routes
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Connect to MongoDB and start the server
const startServer = async () => {
  try {
    await connectDB(); 
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server
startServer();