"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordStrength = exports.verifyPassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const environment_1 = require("../config/environment");
/**
 * Hash a plain text password
 */
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt_1.default.genSalt(environment_1.securityConfig.bcryptSaltRounds);
        const hashedPassword = await bcrypt_1.default.hash(password, salt);
        return hashedPassword;
    }
    catch (error) {
        throw new Error('Error hashing password');
    }
};
exports.hashPassword = hashPassword;
/**
 * Verify a plain text password against a hashed password
 */
const verifyPassword = async (password, hashedPassword) => {
    try {
        return await bcrypt_1.default.compare(password, hashedPassword);
    }
    catch (error) {
        throw new Error('Error verifying password');
    }
};
exports.verifyPassword = verifyPassword;
/**
 * Validate password strength
 */
const validatePasswordStrength = (password) => {
    const errors = [];
    // Minimum length check
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    // Maximum length check
    if (password.length > 128) {
        errors.push('Password must be less than 128 characters long');
    }
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    // Check for at least one number
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    // Check for common patterns to avoid
    const commonPatterns = [
        /(.)\1{2,}/, // Three or more consecutive identical characters
        /123456|654321|abcdef|qwerty|password/i, // Common sequences
    ];
    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            errors.push('Password contains common patterns and is not secure');
            break;
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
