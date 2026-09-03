import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import { authRoutes } from './routes/authRoutes';
import { customerRoutes } from './routes/customerRoutes';
import { productRoutes } from './routes/productRoutes';
import { challanRoutes } from './routes/challanRoutes';
import { invoiceRoutes } from './routes/invoiceRoutes';
import { dashboardRoutes } from './routes/dashboardRoutes';

export const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Central error handler
app.use(errorHandler);