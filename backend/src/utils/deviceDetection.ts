import { Request } from 'express';
import { UAParser } from 'ua-parser-js';
import * as geoip from 'geoip-lite';
import { DeviceInfo } from '../models/Session';
import logger from '../config/logger';

/**
 * Extract device information from request
 */
export const extractDeviceInfo = (req: Request): DeviceInfo => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    
    // Parse user agent
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    
    // Get IP address
    const ip = getClientIp(req);
    
    // Get location from IP
    const location = getLocationFromIp(ip);
    
    const deviceInfo: DeviceInfo = {
      device_type: mapDeviceType(device.type),
      browser: browser.name,
      browser_version: browser.version,
      operating_system: os.name,
      os_version: os.version,
      ip_address: ip,
      location: location.location,
      country_code: location.country_code
    };
    
    logger.debug('Device info extracted:', deviceInfo);
    
    return deviceInfo;
  } catch (error) {
    logger.error('Error extracting device info:', error);
    return {
      ip_address: getClientIp(req)
    };
  }
};

/**
 * Get client IP address from request
 */
export const getClientIp = (req: Request): string => {
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

/**
 * Get location information from IP address
 */
export const getLocationFromIp = (ip: string): { location?: string; country_code?: string } => {
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
  } catch (error) {
    logger.error('Error getting location from IP:', error);
    return { location: 'Unknown', country_code: 'XX' };
  }
};

/**
 * Map device type from ua-parser to consistent format
 */
export const mapDeviceType = (deviceType?: string): string => {
  if (!deviceType) return 'desktop';
  
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

/**
 * Generate a unique session token
 */
export const generateSessionToken = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
};

/**
 * Check if two locations are suspiciously different
 */
export const areLocationsSuspicious = (location1?: string, location2?: string): boolean => {
  if (!location1 || !location2) return false;
  
  // Extract country codes from location strings
  const country1 = location1.split(', ').pop();
  const country2 = location2.split(', ').pop();
  
  // If countries are different, it's suspicious
  return country1 !== country2;
};

/**
 * Format device information for display
 */
export const formatDeviceInfo = (deviceInfo: DeviceInfo): string => {
  const parts: string[] = [];
  
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

/**
 * Get device fingerprint for identification
 */
export const getDeviceFingerprint = (deviceInfo: DeviceInfo): string => {
  const parts = [
    deviceInfo.browser,
    deviceInfo.browser_version,
    deviceInfo.operating_system,
    deviceInfo.os_version,
    deviceInfo.device_type
  ].filter(Boolean);
  
  return parts.join('|');
};

/**
 * Check if session is from a new device
 */
export const isNewDevice = (currentFingerprint: string, knownFingerprints: string[]): boolean => {
  return !knownFingerprints.includes(currentFingerprint);
};

/**
 * Calculate session expiration time
 */
export const calculateSessionExpiration = (days: number = 30): Date => {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
};

/**
 * Validate session token format
 */
export const isValidSessionToken = (token: string): boolean => {
  // Check basic format: timestamp-random
  const parts = token.split('-');
  if (parts.length !== 2) return false;
  
  // Check if first part is a valid timestamp
  const timestamp = parseInt(parts[0]);
  if (isNaN(timestamp) || timestamp <= 0) return false;
  
  // Check if second part has reasonable length
  const random = parts[1];
  if (random.length < 8) return false;
  
  return true;
}; 