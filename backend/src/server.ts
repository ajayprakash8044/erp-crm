import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` Mini ERP + CRM API Server running!`);
  console.log(` Listening on port: ${config.port} (0.0.0.0)`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Health check: http://localhost:${config.port}/health`);
  console.log(`=========================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});