# Testing Guide

This guide covers testing strategies, tools, and best practices for the Resume Builder application.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Types](#test-types)
- [Testing Tools](#testing-tools)
- [Frontend Testing](#frontend-testing)
- [Backend Testing](#backend-testing)
- [Database Testing](#database-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Test Automation](#test-automation)
- [Code Coverage](#code-coverage)
- [Best Practices](#best-practices)

## Testing Strategy

### Testing Pyramid

```
     /\
    /  \    E2E Tests (Few)
   /____\   
  /      \  Integration Tests (Some)
 /________\ 
/          \ Unit Tests (Many)
```

- **Unit Tests (70%)**: Fast, isolated tests for individual functions/components
- **Integration Tests (20%)**: Test interactions between components/services
- **E2E Tests (10%)**: Full user journey testing

### Test Coverage Goals

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user flows covered

## Test Types

### Unit Tests
- Test individual functions, components, and modules
- Fast execution and easy debugging
- Mock external dependencies

### Integration Tests
- Test component interactions
- API endpoint testing
- Database operations

### End-to-End Tests
- Test complete user workflows
- Browser automation
- Real environment testing

### Performance Tests
- Load testing
- Stress testing
- Memory usage testing

### Security Tests
- Authentication testing
- Authorization testing
- Input validation testing

## Testing Tools

### Frontend Testing Stack
- **Jest**: JavaScript testing framework
- **React Testing Library**: React component testing
- **MSW (Mock Service Worker)**: API mocking
- **Cypress**: End-to-end testing
- **Playwright**: Cross-browser testing

### Backend Testing Stack
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP testing
- **Sinon**: Mocking and stubbing
- **Mocha**: Alternative testing framework
- **Chai**: Assertion library

### Database Testing
- **Jest**: Test runner
- **pg-mem**: In-memory PostgreSQL for testing
- **Factory Girl**: Test data generation
- **Faker**: Fake data generation

## Frontend Testing

### Component Testing

```typescript
// UserProfile.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile Component', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('renders user information correctly', () => {
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('handles edit button click', () => {
    const mockOnEdit = jest.fn();
    render(<UserProfile user={mockUser} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

### Hook Testing

```typescript
// useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth Hook', () => {
  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### API Mocking with MSW

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
          token: 'fake-jwt-token',
        },
      })
    );
  }),

  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        success: true,
        data: { id, name: 'John Doe', email: 'john@example.com' },
      })
    );
  }),
];
```

### Setting up MSW

```typescript
// setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Backend Testing

### Controller Testing

```typescript
// authController.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { AuthService } from '../src/services/AuthService';

jest.mock('../src/services/AuthService');

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockToken = 'fake-jwt-token';
      
      (AuthService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.token).toBe(mockToken);
    });

    it('should return error for invalid credentials', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### Service Testing

```typescript
// AuthService.test.ts
import { AuthService } from './AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { PasswordUtils } from '../utils/PasswordUtils';
import { JWTUtils } from '../utils/JWTUtils';

jest.mock('../repositories/UserRepository');
jest.mock('../utils/PasswordUtils');
jest.mock('../utils/JWTUtils');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return user and token for valid credentials', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed' };
      const mockToken = 'fake-jwt-token';

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);
      (JWTUtils.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await AuthService.login('test@example.com', 'password');

      expect(result).toEqual({
        user: { id: '1', email: 'test@example.com' },
        token: mockToken,
      });
    });

    it('should throw error for invalid password', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed' };

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Middleware Testing

```typescript
// auth.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth';
import { JWTUtils } from '../utils/JWTUtils';

jest.mock('../utils/JWTUtils');

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = { 
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should call next for valid token', () => {
    const mockPayload = { userId: '1', email: 'test@example.com' };
    req.headers = { authorization: 'Bearer valid-token' };
    
    (JWTUtils.verify as jest.Mock).mockReturnValue(mockPayload);

    authMiddleware(req as Request, res as Response, next);

    expect(req.user).toEqual(mockPayload);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 for missing token', () => {
    authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Access token required' },
    });
  });
});
```

## Database Testing

### Repository Testing

```typescript
// UserRepository.test.ts
import { UserRepository } from './UserRepository';
import { DatabaseConnection } from '../db';

describe('UserRepository', () => {
  let db: DatabaseConnection;

  beforeAll(async () => {
    db = await DatabaseConnection.connect(':memory:');
    await db.migrate();
  });

  afterAll(async () => {
    await db.close();
  });

  afterEach(async () => {
    await db.raw('DELETE FROM users');
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
      };

      const user = await UserRepository.create(userData);

      expect(user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
      };

      await UserRepository.create(userData);
      const user = await UserRepository.findByEmail('test@example.com');

      expect(user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return null for non-existent email', async () => {
      const user = await UserRepository.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });
});
```

### Factory Pattern for Test Data

```typescript
// factories/userFactory.ts
import { faker } from '@faker-js/faker';

export const userFactory = {
  build: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: faker.internet.password(),
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),

  create: async (overrides = {}) => {
    const userData = userFactory.build(overrides);
    return await UserRepository.create(userData);
  },
};
```

## Integration Testing

### API Integration Tests

```typescript
// integration/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { DatabaseConnection } from '../src/db';
import { userFactory } from '../factories/userFactory';

describe('Auth Integration', () => {
  let db: DatabaseConnection;

  beforeAll(async () => {
    db = await DatabaseConnection.connect();
    await db.migrate();
  });

  afterAll(async () => {
    await db.close();
  });

  afterEach(async () => {
    await db.raw('DELETE FROM users');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      const user = await userFactory.create({
        email: 'test@example.com',
        password: 'hashed-password',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
    });
  });
});
```

## End-to-End Testing

### Cypress Tests

```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login with valid credentials', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('contain', 'test@example.com');
  });

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();

    cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
  });

  it('should navigate to registration page', () => {
    cy.get('[data-testid="register-link"]').click();
    cy.url().should('include', '/register');
  });
});
```

### Playwright Tests

```typescript
// tests/e2e/resume-builder.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Resume Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Assume user is logged in
  });

  test('should create a new resume', async ({ page }) => {
    await page.click('[data-testid="create-resume-button"]');
    await page.fill('[data-testid="resume-title"]', 'My Software Engineer Resume');
    await page.click('[data-testid="save-button"]');

    await expect(page.locator('[data-testid="resume-title"]')).toContainText(
      'My Software Engineer Resume'
    );
  });

  test('should add work experience', async ({ page }) => {
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="company-name"]', 'Tech Corp');
    await page.fill('[data-testid="job-title"]', 'Software Engineer');
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2023-12-31');
    await page.click('[data-testid="save-experience"]');

    await expect(page.locator('[data-testid="experience-item"]')).toContainText(
      'Tech Corp'
    );
  });
});
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"

scenarios:
  - name: "Login and create resume"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            json: "$.data.token"
            as: "token"
      - post:
          url: "/api/resumes"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            title: "Test Resume"
            content: "Resume content"
```

### Memory and CPU Testing

```typescript
// performance/memory.test.ts
import { performance } from 'perf_hooks';
import { AuthService } from '../src/services/AuthService';

describe('Performance Tests', () => {
  it('should handle 1000 login requests efficiently', async () => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const promises = Array(1000).fill(null).map(() =>
      AuthService.login('test@example.com', 'password123')
    );

    await Promise.all(promises);

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    expect(endMemory - startMemory).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
```

## Security Testing

### Authentication Testing

```typescript
// security/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('Security - Authentication', () => {
  it('should reject requests without token', async () => {
    const response = await request(app).get('/api/protected-route');
    expect(response.status).toBe(401);
  });

  it('should reject malformed tokens', async () => {
    const response = await request(app)
      .get('/api/protected-route')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });

  it('should reject expired tokens', async () => {
    const expiredToken = 'expired-jwt-token';
    const response = await request(app)
      .get('/api/protected-route')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
  });
});
```

### Input Validation Testing

```typescript
// security/validation.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('Security - Input Validation', () => {
  it('should reject SQL injection attempts', async () => {
    const sqlInjection = "'; DROP TABLE users; --";
    const response = await request(app)
      .post('/api/users')
      .send({ name: sqlInjection });
    
    expect(response.status).toBe(400);
  });

  it('should reject XSS attempts', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/users')
      .send({ name: xssPayload });
    
    expect(response.status).toBe(400);
  });
});
```

## Test Automation

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
```

## Code Coverage

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/index.{js,ts}',
  ],
};
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Best Practices

### General Testing Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test user-facing functionality

2. **Write Descriptive Test Names**
   ```typescript
   // ✅ Good
   it('should return user profile when valid token is provided', () => {});
   
   // ❌ Bad
   it('should work', () => {});
   ```

3. **Use the AAA Pattern**
   - **Arrange**: Set up test data
   - **Act**: Execute the code under test
   - **Assert**: Verify the results

4. **Keep Tests Independent**
   - Each test should run in isolation
   - No shared state between tests

5. **Mock External Dependencies**
   ```typescript
   // ✅ Good
   jest.mock('../services/EmailService');
   
   // ❌ Bad - Testing actual email service
   await EmailService.sendEmail();
   ```

### Test Data Management

```typescript
// Use factories for consistent test data
const user = userFactory.build({
  email: 'specific@example.com',
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  // Clear database
});
```

### Error Testing

```typescript
// Test error scenarios
it('should handle network errors gracefully', async () => {
  jest.spyOn(api, 'get').mockRejectedValue(new Error('Network error'));
  
  await expect(UserService.getUser('123')).rejects.toThrow('Network error');
});
```

### Async Testing

```typescript
// Use async/await for async tests
it('should fetch user data', async () => {
  const user = await UserService.getUser('123');
  expect(user).toBeDefined();
});
```

This comprehensive testing guide provides the foundation for maintaining high code quality and reliability in the Resume Builder application. 