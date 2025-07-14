# Contributing to Resume Builder

Thank you for considering contributing to Resume Builder! This document outlines the process for contributing to the project and helps ensure a smooth collaboration experience.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (recommended)
- Git
- Basic knowledge of TypeScript, React, and Express.js

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Clone your fork
   git clone https://github.com/yourusername/resumebuilder.git
   cd resumebuilder
   ```

2. **Set up the development environment**
   ```bash
   # Using Docker (recommended)
   make build
   make up
   
   # Or manually
   npm install
   cd backend && npm install
   ```

3. **Verify the setup**
   ```bash
   # Check if all services are running
   curl http://localhost:3000  # Frontend
   curl http://localhost:3001/health  # Backend
   ```

## Development Workflow

### Branch Strategy

We use a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Critical production fixes

### Creating a Feature Branch

```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# ... make changes ...

# Commit your changes
git add .
git commit -m "feat: add new feature description"

# Push your branch
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Build process or auxiliary tool changes

**Examples:**
```bash
feat(auth): add OAuth2 Google integration
fix(resume): resolve template rendering issue
docs(api): update authentication endpoints
test(auth): add unit tests for login flow
```

## Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature-name
   git rebase develop
   ```

2. **Run tests and linting**
   ```bash
   # Frontend
   npm run lint
   npm run type-check
   npm test
   
   # Backend
   cd backend
   npm run lint
   npm run type-check
   npm test
   ```

3. **Create Pull Request**
   - Use the provided PR template
   - Include a clear description of changes
   - Reference any related issues
   - Add screenshots for UI changes
   - Ensure CI checks pass

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested this change in the browser

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer functional programming patterns
- Use async/await over Promises where possible

### React Components

```typescript
// ✅ Good - Functional component with proper typing
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  // Component implementation
};

// ❌ Avoid - Class components for new code
class UserProfile extends React.Component {
  // Avoid for new components
}
```

### Backend Code

```typescript
// ✅ Good - Proper error handling and typing
export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const user = await userRepository.findById(id);
    return user;
  } catch (error) {
    logger.error('Failed to get user by ID', { id, error });
    throw new AppError('User not found', 404);
  }
};

// ❌ Avoid - Unhandled errors and poor typing
export const getUserById = async (id) => {
  const user = await userRepository.findById(id);
  return user;
};
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use CSS modules for component-specific styles
- Maintain consistent spacing and colors

```tsx
// ✅ Good - Tailwind classes with responsive design
<div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md sm:max-w-lg">
  <h1 className="text-2xl font-bold text-gray-900 mb-4">Title</h1>
</div>

// ❌ Avoid - Inline styles
<div style={{ width: '100%', padding: '24px', backgroundColor: 'white' }}>
  <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Title</h1>
</div>
```

## Testing Guidelines

### Unit Tests

- Write tests for all new features
- Test both happy path and error cases
- Use descriptive test names
- Mock external dependencies

```typescript
// ✅ Good test structure
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', name: 'Test User' };
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
    });

    it('should throw error for duplicate email', async () => {
      // Test error case
    });
  });
});
```

### Integration Tests

- Test API endpoints end-to-end
- Use test database
- Clean up after each test

### Frontend Tests

- Test component rendering
- Test user interactions
- Test hooks and utilities

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Include usage examples

```typescript
/**
 * Generates a resume PDF from template and user data
 * @param template - The resume template to use
 * @param userData - User's resume data
 * @param options - PDF generation options
 * @returns Promise that resolves to PDF buffer
 * @throws {ValidationError} When template or userData is invalid
 * @example
 * ```typescript
 * const pdf = await generateResumePDF(template, userData, { format: 'A4' });
 * ```
 */
export async function generateResumePDF(
  template: ResumeTemplate,
  userData: UserResumeData,
  options: PDFOptions = {}
): Promise<Buffer> {
  // Implementation
}
```

### API Documentation

- Update API documentation for new endpoints
- Include request/response examples
- Document error responses

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Bug Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, browser, Node.js version
6. **Screenshots**: If applicable
7. **Additional Context**: Any other relevant information

### Bug Report Template

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Browser: [e.g. Chrome, Safari, Firefox]
 - Version: [e.g. 22]
 - Node.js Version: [e.g. 18.17.0]

**Additional Context**
Add any other context about the problem here.
```

## Feature Requests

### Before Submitting a Feature Request

1. Check if the feature already exists
2. Search existing issues and discussions
3. Consider if it fits the project's scope
4. Think about implementation complexity

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation Ideas**
If you have thoughts on how this could be implemented, please share them.
```

## Getting Help

If you need help with contributing:

1. Check the [documentation](../README.md)
2. Search existing [issues](https://github.com/yourusername/resumebuilder/issues)
3. Join our [Discord community](https://discord.gg/resumebuilder)
4. Open a discussion on [GitHub Discussions](https://github.com/yourusername/resumebuilder/discussions)

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Special contributor badges

Thank you for contributing to Resume Builder! 🎉 