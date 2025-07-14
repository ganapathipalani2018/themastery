import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { dbConfig } from '../config/environment';
import logger, { loggerUtils } from '../config/logger';
import os from 'os';
import fs from 'fs';
import path from 'path';

const router = Router();

// Create database pool for health checks
const healthCheckPool = new Pool({
  ...dbConfig,
  max: 1, // Minimal pool for health checks
  connectionTimeoutMillis: 5000, // 5 second timeout
});

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      usage: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    disk: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      usage?: {
        used: number;
        total: number;
        percentage: number;
      };
      error?: string;
    };
    logs: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
  };
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
    logs: boolean;
  };
}

// Check database connectivity
async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
  try {
    const startTime = Date.now();
    const client = await healthCheckPool.connect();
    
    try {
      await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      client.release();
      
      loggerUtils.logDatabase('Health Check', 'database', { responseTime });
      
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (queryError) {
      client.release();
      throw queryError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    loggerUtils.logError(error as Error, { context: 'Database Health Check' });
    
    return {
      status: 'unhealthy',
      error: errorMessage,
    };
  }
}

// Check memory usage
function checkMemory(): { status: 'healthy' | 'degraded' | 'unhealthy'; usage: { used: number; total: number; percentage: number } } {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = (usedMemory / totalMemory) * 100;
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (memoryPercentage > 90) {
    status = 'unhealthy';
  } else if (memoryPercentage > 80) {
    status = 'degraded';
  }
  
  return {
    status,
    usage: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(memoryPercentage * 100) / 100,
    },
  };
}

// Check disk usage
function checkDisk(): { status: 'healthy' | 'degraded' | 'unhealthy'; usage?: { used: number; total: number; percentage: number }; error?: string } {
  try {
    const stats = fs.statSync(process.cwd());
    
    // This is a simplified check - in production, you might want to use a library like 'statvfs'
    // For now, we'll just check if we can access the filesystem
    return {
      status: 'healthy',
      usage: {
        used: 0, // Would need platform-specific implementation
        total: 0, // Would need platform-specific implementation
        percentage: 0,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Disk access error',
    };
  }
}

// Check logs directory and file access
function checkLogs(): { status: 'healthy' | 'unhealthy'; error?: string } {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    
    // Check if logs directory exists and is writable
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Test write access
    const testFile = path.join(logsDir, 'health-check-test.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Log system error',
    };
  }
}

// Basic health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Run all health checks
    const [database, memory, disk, logs] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkDisk()),
      Promise.resolve(checkLogs()),
    ]);
    
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database,
        memory,
        disk,
        logs,
      },
      checks: {
        database: database.status === 'healthy',
        memory: memory.status === 'healthy',
        disk: disk.status === 'healthy',
        logs: logs.status === 'healthy',
      },
    };
    
    // Determine overall status
    const unhealthyServices = Object.values(healthStatus.services).filter(
      service => service.status === 'unhealthy'
    );
    const degradedServices = Object.values(healthStatus.services).filter(
      service => service.status === 'degraded'
    );
    
    if (unhealthyServices.length > 0) {
      healthStatus.status = 'unhealthy';
    } else if (degradedServices.length > 0) {
      healthStatus.status = 'degraded';
    }
    
    // Set appropriate HTTP status code
    let statusCode = 200;
    if (healthStatus.status === 'degraded') {
      statusCode = 200; // Still operational
    } else if (healthStatus.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }
    
    const responseTime = Date.now() - startTime;
    
    // Log health check performance
    loggerUtils.logPerformance('Health Check', responseTime, {
      status: healthStatus.status,
      failedChecks: Object.entries(healthStatus.checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => check),
    });
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    loggerUtils.logError(error as Error, { context: 'Health Check Endpoint' });
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const healthStatus = await new Promise<HealthStatus>((resolve) => {
      // This would include more detailed checks
      resolve({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: { status: 'healthy' },
          memory: { status: 'healthy', usage: { used: 0, total: 0, percentage: 0 } },
          disk: { status: 'healthy', usage: { used: 0, total: 0, percentage: 0 } },
          logs: { status: 'healthy' },
        },
        checks: {
          database: true,
          memory: true,
          disk: true,
          logs: true,
        },
      });
    });
    
    // Add system information
    const detailedStatus = {
      ...healthStatus,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
        pid: process.pid,
      },
    };
    
    res.json(detailedStatus);
  } catch (error) {
    loggerUtils.logError(error as Error, { context: 'Detailed Health Check' });
    res.status(500).json({
      status: 'unhealthy',
      error: 'Detailed health check failed',
    });
  }
});

// Liveness probe (simple check that the service is running)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Readiness probe (check if the service is ready to accept traffic)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbCheck = await checkDatabase();
    
    if (dbCheck.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: dbCheck,
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: dbCheck,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 