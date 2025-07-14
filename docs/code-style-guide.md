# Code Style Guide

This document outlines the coding standards and conventions for the Resume Builder project.

## Table of Contents

- [General Principles](#general-principles)
- [TypeScript/JavaScript](#typescriptjavascript)
- [React/Next.js](#reactnextjs)
- [Node.js/Express](#nodejsexpress)
- [CSS/Tailwind](#csstailwind)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Code Formatting](#code-formatting)
- [Comments and Documentation](#comments-and-documentation)

## General Principles

### Code Quality
- Write clean, readable, and maintainable code
- Follow the DRY (Don't Repeat Yourself) principle
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Prefer composition over inheritance

### Error Handling
- Always handle errors appropriately
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Log errors with proper context

## TypeScript/JavaScript

### Type Definitions
```typescript
// ✅ Good: Use explicit types
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// ❌ Bad: Using any
const user: any = getUserData();

// ✅ Good: Use proper typing
const user: User = getUserData();
```

### Functions
```typescript
// ✅ Good: Use arrow functions for simple operations
const calculateTotal = (items: Item[]): number => 
  items.reduce((sum, item) => sum + item.price, 0);

// ✅ Good: Use function declarations for complex logic
function processUserData(userData: RawUserData): User {
  // Complex processing logic
  return processedUser;
}
```

### Async/Await
```typescript
// ✅ Good: Use async/await instead of promises
async function fetchUserData(id: string): Promise<User> {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user data', { id, error });
    throw new Error('User data fetch failed');
  }
}

// ❌ Bad: Using .then() chains
function fetchUserData(id: string): Promise<User> {
  return api.get(`/users/${id}`)
    .then(response => response.data)
    .catch(error => {
      throw new Error('User data fetch failed');
    });
}
```

## React/Next.js

### Component Structure
```typescript
// ✅ Good: Functional components with TypeScript
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
};
```

### Hooks
```typescript
// ✅ Good: Custom hooks for reusable logic
const useUserData = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);
  
  return { user, loading };
};
```

### State Management
```typescript
// ✅ Good: Use useReducer for complex state
interface ResumeState {
  sections: ResumeSection[];
  isLoading: boolean;
  error: string | null;
}

const resumeReducer = (state: ResumeState, action: ResumeAction): ResumeState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SECTIONS':
      return { ...state, sections: action.payload, isLoading: false };
    default:
      return state;
  }
};
```

## Node.js/Express

### Route Structure
```typescript
// ✅ Good: Separate route handlers
export const authRoutes = Router();

authRoutes.post('/login', validateLoginInput, authController.login);
authRoutes.post('/register', validateRegisterInput, authController.register);
authRoutes.post('/refresh', authController.refreshToken);
```

### Controllers
```typescript
// ✅ Good: Async controllers with proper error handling
export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};
```

### Error Handling
```typescript
// ✅ Good: Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Good: Error middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Request error', { error, path: req.path });
  
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: { message: error.message, field: error.field }
    });
  }
  
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' }
  });
};
```

## CSS/Tailwind

### Class Organization
```tsx
// ✅ Good: Logical grouping of classes
<div className="
  flex flex-col items-center justify-center
  w-full h-screen
  bg-gray-100 dark:bg-gray-900
  p-4 md:p-8
">
  <h1 className="
    text-2xl md:text-4xl font-bold
    text-gray-800 dark:text-white
    mb-4
  ">
    Title
  </h1>
</div>
```

### Component-Specific Styles
```tsx
// ✅ Good: Use CSS modules for complex styles
import styles from './UserProfile.module.css';

const UserProfile = () => (
  <div className={`${styles.container} bg-white rounded-lg shadow-md`}>
    {/* Component content */}
  </div>
);
```

## File Organization

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI elements
│   └── forms/           # Form components
├── pages/               # Next.js pages
├── hooks/               # Custom React hooks
├── services/            # API and business logic
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

### Component Files
```
components/
├── UserProfile/
│   ├── index.ts         # Export file
│   ├── UserProfile.tsx  # Main component
│   ├── UserProfile.test.tsx
│   └── UserProfile.module.css
```

## Naming Conventions

### Files and Directories
- Use PascalCase for component files: `UserProfile.tsx`
- Use camelCase for utility files: `dateUtils.ts`
- Use kebab-case for directories: `user-profile/`

### Variables and Functions
```typescript
// ✅ Good: Descriptive names
const getUserById = (id: string): Promise<User> => { ... };
const isUserAuthenticated = (user: User): boolean => { ... };

// ❌ Bad: Unclear names
const get = (id: string) => { ... };
const check = (user: User) => { ... };
```

### Constants
```typescript
// ✅ Good: UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.resumebuilder.com';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

## Code Formatting

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### ESLint Rules
- Use `@typescript-eslint/recommended`
- Enable `react-hooks/exhaustive-deps`
- Use `import/order` for organized imports

## Comments and Documentation

### JSDoc Comments
```typescript
/**
 * Validates user input data
 * @param userData - Raw user data from form
 * @returns Validated user object
 * @throws ValidationError when data is invalid
 */
export function validateUserData(userData: RawUserData): User {
  // Implementation
}
```

### Inline Comments
```typescript
// ✅ Good: Explain why, not what
const delay = 100; // Debounce delay to prevent excessive API calls

// ❌ Bad: Stating the obvious
const delay = 100; // Set delay to 100
```

### TODO Comments
```typescript
// TODO: Implement caching for user data
// FIXME: Handle edge case when user has no email
// NOTE: This function will be deprecated in v2.0
```

## Testing Standards

### Unit Tests
```typescript
describe('UserService', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });
    
    it('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
```

### Integration Tests
```typescript
describe('Auth API', () => {
  it('should login user with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## Best Practices

### Performance
- Use React.memo for expensive components
- Implement proper loading states
- Use lazy loading for large components
- Optimize database queries

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Sanitize user data

### Accessibility
- Use semantic HTML
- Implement proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers

## Tools and Setup

### Required Tools
- ESLint with TypeScript support
- Prettier for code formatting
- Husky for pre-commit hooks
- Jest for testing

### VS Code Extensions
- TypeScript Hero
- ESLint
- Prettier
- Auto Rename Tag
- Bracket Pair Colorizer

This style guide should be followed consistently across the project to maintain code quality and readability. 