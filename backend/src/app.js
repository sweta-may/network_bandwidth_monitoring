const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const healthRoutes = require('./routes/healthRoutes');
const hostRoutes = require('./routes/hostRoutes');
const recordRoutes = require('./routes/recordRoutes');
const alertRoutes = require('./routes/alertRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
const configuredOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, health checks, server-to-server)
    if (!origin) return callback(null, true);

    // If wildcard configured, reflect the origin to allow credentials
    if (configuredOrigins.includes('*')) return callback(null, true);

    // Exact match in configured origins
    if (configuredOrigins.includes(origin)) return callback(null, true);

    // Automatically allow any Vercel deployment (preview and production)
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);

    // Automatically allow any Render deployment
    if (/\.onrender\.com$/.test(origin)) return callback(null, true);

    // Automatically allow local development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Permissive fallback for academic/prototype deployment
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.LOG_LEVEL || 'dev'));
}

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/simulation', simulationRoutes);

// Serve frontend static build if available
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  // Root fallback route
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Network Bandwidth Usage Monitoring and Threshold Alert API is running.',
      documentation: '/api/health'
    });
  });
}

// Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
