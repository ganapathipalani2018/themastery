"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureMessage = exports.captureException = exports.setSentryContext = exports.setSentryUser = exports.initSentry = void 0;
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
const environment_1 = require("./environment");
const SENTRY_DSN = environment_1.config.SENTRY_DSN;
const initSentry = () => {
    if (!SENTRY_DSN) {
        console.warn('Sentry DSN not configured, skipping Sentry initialization');
        return;
    }
    Sentry.init({
        dsn: SENTRY_DSN,
        // Environment and service information
        environment: environment_1.config.NODE_ENV,
        serverName: 'resume-builder-backend',
        release: process.env.npm_package_version || '1.0.0',
        // Performance monitoring
        tracesSampleRate: environment_1.config.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: environment_1.config.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Integrations
        integrations: [
            (0, profiling_node_1.nodeProfilingIntegration)(),
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
            Sentry.postgresIntegration(),
        ],
        // Error filtering
        beforeSend(event, hint) {
            // Don't send errors in development unless explicitly enabled
            if (environment_1.config.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
                return null;
            }
            // Filter out known non-critical errors
            if (event.exception) {
                const error = hint.originalException;
                // Filter out specific error types
                if (error instanceof Error) {
                    // Skip validation errors (these are expected user errors)
                    if (error.message.includes('ValidationError') ||
                        error.message.includes('Invalid input') ||
                        error.message.includes('Bad Request')) {
                        return null;
                    }
                    // Skip authentication errors (normal part of operation)
                    if (error.message.includes('Unauthorized') ||
                        error.message.includes('Invalid token') ||
                        error.message.includes('Access denied')) {
                        return null;
                    }
                }
            }
            return event;
        },
        // Transaction filtering
        beforeSendTransaction(event) {
            var _a, _b;
            // Don't track health check requests in production
            if (environment_1.config.NODE_ENV === 'production' &&
                ((_b = (_a = event.request) === null || _a === void 0 ? void 0 : _a.url) === null || _b === void 0 ? void 0 : _b.includes('/health'))) {
                return null;
            }
            return event;
        },
    });
};
exports.initSentry = initSentry;
// Helper function to add user context to Sentry
const setSentryUser = (user) => {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
    });
};
exports.setSentryUser = setSentryUser;
// Helper function to add extra context
const setSentryContext = (key, context) => {
    Sentry.setContext(key, context);
};
exports.setSentryContext = setSentryContext;
// Helper function to capture exceptions with additional context
const captureException = (error, context) => {
    return Sentry.withScope((scope) => {
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                scope.setTag(key, value);
            });
        }
        return Sentry.captureException(error);
    });
};
exports.captureException = captureException;
// Helper function to capture messages
const captureMessage = (message, level = 'info', context) => {
    return Sentry.withScope((scope) => {
        scope.setLevel(level);
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                scope.setTag(key, value);
            });
        }
        return Sentry.captureMessage(message);
    });
};
exports.captureMessage = captureMessage;
exports.default = Sentry;
