// Backend Jest setup file
const { Pool } = require('pg');

// Mock database connection
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock bcrypt for password hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' }),
  decode: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' }),
}));

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

// Setup global test database
let testDb;

beforeAll(async () => {
  // Initialize test database connection
  testDb = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'test_resumebuilder',
    user: process.env.DB_USER || 'test_user',
    password: process.env.DB_PASSWORD || 'test_password',
  });
});

afterAll(async () => {
  // Close test database connection
  if (testDb) {
    await testDb.end();
  }
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testDb = testDb;

// Helper function to create test user data
global.createTestUser = () => ({
  id: 1,
  email: 'test@example.com',
  password: 'hashed_password',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Helper function to create test resume data
global.createTestResume = () => ({
  id: 1,
  userId: 1,
  title: 'Test Resume',
  content: JSON.stringify({
    personalInfo: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    },
    experience: [],
    education: [],
    skills: [],
  }),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Mock Express request object
global.mockRequest = (options = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...options,
});

// Mock Express response object
global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Next function for middleware testing
global.mockNext = () => jest.fn();

// Error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in test:', reason);
});

// Increase timeout for database operations
jest.setTimeout(30000); 