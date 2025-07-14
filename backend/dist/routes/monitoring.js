"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const logger_1 = __importDefault(require("../config/logger"));
const os_1 = __importDefault(require("os"));
const router = (0, express_1.Router)();
// Simple mock functions for logger utilities (would be implemented in a real system)
const mockLoggerUtils = {
    async getRecentLogs(limit, level) {
        return Promise.resolve([
            {
                timestamp: new Date().toISOString(),
                level,
                message: `Sample ${level} log entry`,
                service: 'resume-builder-backend',
            },
        ]);
    },
    async getErrorStatistics(hours) {
        return Promise.resolve({
            totalErrors: 0,
            errorsByType: {},
            errorTrends: [],
            timeframe: `${hours} hours`,
        });
    },
    async getPerformanceMetrics(hours) {
        return Promise.resolve({
            averageResponseTime: 150,
            requestCount: 1000,
            slowestEndpoints: [],
            errorRate: 0.01,
            throughput: 10.5,
            timeframe: `${hours} hours`,
        });
    },
};
// Apply authentication middleware to all monitoring routes
router.use(auth_1.authenticateToken);
// Get system metrics
router.get('/metrics', async (req, res) => {
    try {
        await Promise.resolve(); // Ensure async function has await
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            system: {
                platform: os_1.default.platform(),
                arch: os_1.default.arch(),
                nodeVersion: process.version,
                cpuUsage: process.cpuUsage(),
                memoryUsage: process.memoryUsage(),
                loadAverage: os_1.default.loadavg(),
                freeMemory: os_1.default.freemem(),
                totalMemory: os_1.default.totalmem(),
                cpus: os_1.default.cpus().length,
            },
            process: {
                pid: process.pid,
                ppid: process.ppid,
                cwd: process.cwd(),
                execPath: process.execPath,
                version: process.version,
                versions: process.versions,
                env: process.env.NODE_ENV,
                uptime: process.uptime(),
            },
            performance: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                resourceUsage: process.resourceUsage ? process.resourceUsage() : null,
            },
        };
        res.json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get system metrics', { error });
        res.status(500).json({
            success: false,
            error: 'METRICS_ERROR',
            message: 'Failed to retrieve system metrics',
        });
    }
});
// Get application logs (last 100 entries)
router.get('/logs', async (req, res) => {
    try {
        const logLevel = req.query.level || 'info';
        const limit = parseInt(req.query.limit, 10) || 100;
        // Get recent logs from the logger
        const logs = await mockLoggerUtils.getRecentLogs(limit, logLevel);
        res.json({
            success: true,
            data: {
                logs,
                total: logs.length,
                level: logLevel,
                limit,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get application logs', { error });
        res.status(500).json({
            success: false,
            error: 'LOGS_ERROR',
            message: 'Failed to retrieve application logs',
        });
    }
});
// Get error statistics
router.get('/errors', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours, 10) || 24;
        // Get error statistics from the logger
        const errorStats = await mockLoggerUtils.getErrorStatistics(hours);
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, errorStats), { timeframe: `${hours} hours` }),
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get error statistics', { error });
        res.status(500).json({
            success: false,
            error: 'ERROR_STATS_ERROR',
            message: 'Failed to retrieve error statistics',
        });
    }
});
// Get performance metrics
router.get('/performance', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours, 10) || 24;
        // Get performance metrics from the logger
        const performanceMetrics = await mockLoggerUtils.getPerformanceMetrics(hours);
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, performanceMetrics), { timeframe: `${hours} hours` }),
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get performance metrics', { error });
        res.status(500).json({
            success: false,
            error: 'PERFORMANCE_ERROR',
            message: 'Failed to retrieve performance metrics',
        });
    }
});
// Get monitoring dashboard overview
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        // Get system overview
        const systemOverview = {
            timestamp: now.toISOString(),
            uptime: process.uptime(),
            memory: {
                used: process.memoryUsage(),
                system: {
                    free: os_1.default.freemem(),
                    total: os_1.default.totalmem(),
                },
            },
            cpu: {
                usage: process.cpuUsage(),
                loadAverage: os_1.default.loadavg(),
                cores: os_1.default.cpus().length,
            },
            environment: process.env.NODE_ENV,
            nodeVersion: process.version,
        };
        // Get recent activity
        const recentActivity = await mockLoggerUtils.getRecentLogs(50, 'info');
        const recentErrors = await mockLoggerUtils.getRecentLogs(20, 'error');
        const errorStats = await mockLoggerUtils.getErrorStatistics(24);
        const performanceMetrics = await mockLoggerUtils.getPerformanceMetrics(24);
        res.json({
            success: true,
            data: {
                overview: systemOverview,
                activity: {
                    recent: recentActivity,
                    errors: recentErrors,
                },
                statistics: {
                    errors: errorStats,
                    performance: performanceMetrics,
                },
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get dashboard data', { error });
        res.status(500).json({
            success: false,
            error: 'DASHBOARD_ERROR',
            message: 'Failed to retrieve dashboard data',
        });
    }
});
// Configure alerts (placeholder - would integrate with external alerting systems)
router.post('/alerts', async (req, res) => {
    var _a;
    try {
        await Promise.resolve(); // Ensure async function has await
        const { type, condition, threshold, contact } = req.body;
        // Placeholder for alert configuration
        // In a real implementation, this would integrate with systems like:
        // - PagerDuty
        // - Slack
        // - Email notifications
        // - SMS alerts
        logger_1.default.info('Alert configured', {
            type,
            condition,
            threshold,
            contact,
            configuredBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
        });
        res.json({
            success: true,
            message: 'Alert configuration saved',
            data: {
                alertId: `alert_${Date.now()}`,
                type,
                condition,
                threshold,
                contact,
                status: 'active',
                createdAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to configure alert', { error });
        res.status(500).json({
            success: false,
            error: 'ALERT_CONFIG_ERROR',
            message: 'Failed to configure alert',
        });
    }
});
exports.default = router;
