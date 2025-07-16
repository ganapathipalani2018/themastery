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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidSessionToken = exports.calculateSessionExpiration = exports.isNewDevice = exports.getDeviceFingerprint = exports.formatDeviceInfo = exports.areLocationsSuspicious = exports.generateSessionToken = exports.mapDeviceType = exports.getLocationFromIp = exports.getClientIp = exports.extractDeviceInfo = void 0;
const ua_parser_js_1 = require("ua-parser-js");
const geoip = __importStar(require("geoip-lite"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Extract device information from request
 */
const extractDeviceInfo = (req) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const parser = new ua_parser_js_1.UAParser(userAgent);
        // Parse user agent
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();
        // Get IP address
        const ip = (0, exports.getClientIp)(req);
        // Get location from IP
        const location = (0, exports.getLocationFromIp)(ip);
        const deviceInfo = {
            device_type: (0, exports.mapDeviceType)(device.type),
            browser: browser.name,
            browser_version: browser.version,
            operating_system: os.name,
            os_version: os.version,
            ip_address: ip,
            location: location.location,
            country_code: location.country_code
        };
        logger_1.default.debug('Device info extracted:', deviceInfo);
        return deviceInfo;
    }
    catch (error) {
        logger_1.default.error('Error extracting device info:', error);
        return {
            ip_address: (0, exports.getClientIp)(req)
        };
    }
};
exports.extractDeviceInfo = extractDeviceInfo;
/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
    // Check for forwarded IP first (for proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return forwardedIps.split(',')[0].trim();
    }
    // Check other common headers
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    const clientIp = req.headers['x-client-ip'];
    if (clientIp) {
        return Array.isArray(clientIp) ? clientIp[0] : clientIp;
    }
    // Fall back to remote address
    return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
};
exports.getClientIp = getClientIp;
/**
 * Get location information from IP address
 */
const getLocationFromIp = (ip) => {
    try {
        // Skip private/local IPs
        if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('::1')) {
            return { location: 'Local', country_code: 'XX' };
        }
        const geo = geoip.lookup(ip);
        if (geo) {
            const location = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
            return {
                location: location || geo.country,
                country_code: geo.country
            };
        }
        return { location: 'Unknown', country_code: 'XX' };
    }
    catch (error) {
        logger_1.default.error('Error getting location from IP:', error);
        return { location: 'Unknown', country_code: 'XX' };
    }
};
exports.getLocationFromIp = getLocationFromIp;
/**
 * Map device type from ua-parser to consistent format
 */
const mapDeviceType = (deviceType) => {
    if (!deviceType)
        return 'desktop';
    switch (deviceType.toLowerCase()) {
        case 'mobile':
            return 'mobile';
        case 'tablet':
            return 'tablet';
        case 'smarttv':
            return 'tv';
        case 'wearable':
            return 'wearable';
        case 'embedded':
            return 'embedded';
        default:
            return 'desktop';
    }
};
exports.mapDeviceType = mapDeviceType;
/**
 * Generate a unique session token
 */
const generateSessionToken = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
};
exports.generateSessionToken = generateSessionToken;
/**
 * Check if two locations are suspiciously different
 */
const areLocationsSuspicious = (location1, location2) => {
    if (!location1 || !location2)
        return false;
    // Extract country codes from location strings
    const country1 = location1.split(', ').pop();
    const country2 = location2.split(', ').pop();
    // If countries are different, it's suspicious
    return country1 !== country2;
};
exports.areLocationsSuspicious = areLocationsSuspicious;
/**
 * Format device information for display
 */
const formatDeviceInfo = (deviceInfo) => {
    const parts = [];
    if (deviceInfo.browser) {
        const browserInfo = deviceInfo.browser_version
            ? `${deviceInfo.browser} ${deviceInfo.browser_version}`
            : deviceInfo.browser;
        parts.push(browserInfo);
    }
    if (deviceInfo.operating_system) {
        const osInfo = deviceInfo.os_version
            ? `${deviceInfo.operating_system} ${deviceInfo.os_version}`
            : deviceInfo.operating_system;
        parts.push(osInfo);
    }
    if (deviceInfo.device_type && deviceInfo.device_type !== 'desktop') {
        parts.push(deviceInfo.device_type);
    }
    return parts.join(' on ') || 'Unknown device';
};
exports.formatDeviceInfo = formatDeviceInfo;
/**
 * Get device fingerprint for identification
 */
const getDeviceFingerprint = (deviceInfo) => {
    const parts = [
        deviceInfo.browser,
        deviceInfo.browser_version,
        deviceInfo.operating_system,
        deviceInfo.os_version,
        deviceInfo.device_type
    ].filter(Boolean);
    return parts.join('|');
};
exports.getDeviceFingerprint = getDeviceFingerprint;
/**
 * Check if session is from a new device
 */
const isNewDevice = (currentFingerprint, knownFingerprints) => {
    return !knownFingerprints.includes(currentFingerprint);
};
exports.isNewDevice = isNewDevice;
/**
 * Calculate session expiration time
 */
const calculateSessionExpiration = (days = 30) => {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + days);
    return expiration;
};
exports.calculateSessionExpiration = calculateSessionExpiration;
/**
 * Validate session token format
 */
const isValidSessionToken = (token) => {
    // Check basic format: timestamp-random
    const parts = token.split('-');
    if (parts.length !== 2)
        return false;
    // Check if first part is a valid timestamp
    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp) || timestamp <= 0)
        return false;
    // Check if second part has reasonable length
    const random = parts[1];
    if (random.length < 8)
        return false;
    return true;
};
exports.isValidSessionToken = isValidSessionToken;
