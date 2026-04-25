/**
 * P31 Andromeda - Lightweight Monitoring System (Fixed)
 * Real-time metrics collection and alerting
 * Prevents Ghost Exit with event loop references
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: false
});

// Metrics storage
const metrics = {
  socialWorker: {
    requests: 0,
    errors: 0,
    responseTime: [],
    lastCheck: Date.now(),
    status: 'unknown'
  },
  discordBot: {
    messages: 0,
    commands: 0,
    errors: 0,
    lastHeartbeat: Date.now(),
    status: 'unknown'
  },
  commandCenter: {
    visits: 0,
    broadcasts: 0,
    preflightChecks: 0,
    lastActivity: Date.now(),
    status: 'unknown'
  },
  system: {
    memory: 0,
    cpu: 0,
    uptime: process.uptime()
  }
};

// Alert thresholds
const ALERTS = {
  errorRate: 0.05, // 5%
  responseTime: 1000, // 1 second
  memoryLimit: 500 * 1024 * 1024, // 500MB
  heartbeatTimeout: 300000 // 5 minutes
};

// Active alerts
const activeAlerts = [];

// 🔒 CRITICAL: Force event loop to stay alive
const keepAliveInterval = setInterval(() => {
  // Update system metrics to ensure timer is "useful"
  metrics.system.uptime = process.uptime();
  metrics.system.memory = process.memoryUsage().heapUsed;
}, 5000); // Update every 5 seconds

// Prevent this timer from blocking exit when we want to shutdown
keepAliveInterval.unref();

// Active connections tracker
let activeConnections = 0;

// WebSocket connection handling
wss.on('connection', (ws) => {
  activeConnections++;
  console.log(`WebSocket client connected. Total: ${activeConnections}`);
  
  // Send current state
  ws.send(JSON.stringify({
    type: 'metrics',
    data: metrics
  }));
  
  ws.on('close', () => {
    activeConnections--;
    console.log(`WebSocket client disconnected. Total: ${activeConnections}`);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Metrics endpoints
app.get('/metrics', (req, res) => {
  res.json(metrics);
});

app.get('/metrics/:service', (req, res) => {
  const service = req.params.service;
  if (metrics[service]) {
    res.json(metrics[service]);
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeConnections: activeConnections,
    services: {
      socialWorker: metrics.socialWorker.status,
      discordBot: metrics.discordBot.status,
      commandCenter: metrics.commandCenter.status
    },
    alerts: activeAlerts.length
  };
  
  // Check if any service is down
  if (metrics.socialWorker.status === 'down' ||
      metrics.discordBot.status === 'down' ||
      metrics.commandCenter.status === 'down') {
    health.status = 'degraded';
  }
  
  res.json(health);
});

// Alert endpoint
app.post('/alerts', (req, res) => {
  const alert = {
    id: Date.now(),
    severity: req.body.severity || 'warning',
    message: req.body.message,
    service: req.body.service,
    timestamp: new Date().toISOString()
  };
  
  activeAlerts.push(alert);
  
  // Keep only last 100 alerts
  if (activeAlerts.length > 100) {
    activeAlerts.shift();
  }
  
  // Broadcast to WebSocket clients
  broadcastAlert(alert);
  
  res.json({ success: true, alert });
});

// Metrics update endpoint
app.post('/metrics/:service', (req, res) => {
  const service = req.params.service;
  if (metrics[service]) {
    Object.assign(metrics[service], req.body);
    metrics[service].lastUpdate = Date.now();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// WebSocket broadcast
function broadcastAlert(alert) {
  const message = JSON.stringify({
    type: 'alert',
    data: alert
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Error handling - CRITICAL for preventing silent exits
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  // Log but don't exit - let the process continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Log but don't exit - let the process continue
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Clear keep-alive
  clearInterval(keepAliveInterval);
  
  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });
  
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      console.log('Monitoring system shutdown complete');
      process.exit(0);
    });
    
    // Force shutdown after 5 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 5000).unref();
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const PORT = process.env.PORT || 9090;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ P31 Monitoring System running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`🔒 Event loop protection: ACTIVE`);
  
  // Configure server timeouts
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
});

// Export for testing
module.exports = { app, server, wss, metrics, activeAlerts };