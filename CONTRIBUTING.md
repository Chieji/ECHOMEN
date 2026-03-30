# Contributing to ECHOMEN

First off, thank you for considering contributing to ECHOMEN! 🎉

This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Making Changes](#making-changes)
5. [Submitting Changes](#submitting-changes)
6. [Coding Standards](#coding-standards)
7. [Testing](#testing)
8. [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please read and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md).

### Expected Behavior

- Be respectful and inclusive
- Welcome different perspectives and experiences
- Focus on constructive criticism
- Respect confidentiality

### Unacceptable Behavior

- Harassment or discrimination
- Offensive language or personal attacks
- Spam or self-promotion
- Sharing confidential information

---

## Getting Started

### 1. Fork the Repository

Click the **Fork** button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/ECHOMEN.git
cd ECHOMEN
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/Chieji/ECHOMEN.git
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/add-new-plugin`
- `fix/rate-limit-bug`
- `docs/update-readme`
- `test/add-integration-tests`

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Install development dependencies
npm install --save-dev

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Environment Setup

Create `.env.local` for local development:

```bash
ECHO_API_URL=http://localhost:3001
ECHO_API_KEY=dev-key-12345
LOG_LEVEL=debug
```

---

## Making Changes

### Code Style

We follow these conventions:

#### TypeScript

```typescript
// Use const by default
const value = 'example';

// Use meaningful names
const getUserById = async (id: string) => {
  // Implementation
};

// Add JSDoc comments
/**
 * Get user by ID
 * @param id User ID
 * @returns User object or null
 */
const getUserById = async (id: string): Promise<User | null> => {
  // Implementation
};
```

#### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Classes/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts` or `PascalCase.ts` for classes

#### Formatting

```bash
# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Commit Messages

Write clear, descriptive commit messages:

```
feat: Add GitHub plugin for repository management

- Implement listRepos tool
- Implement createIssue tool
- Add comprehensive tests
- Update documentation

Fixes #123
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/dependency changes

---

## Submitting Changes

### 1. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create a Pull Request

1. Go to your fork on GitHub
2. Click **New Pull Request**
3. Select your branch
4. Fill in the PR template:

```markdown
## Description
Brief description of your changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
Describe how you tested your changes

## Checklist
- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings generated
```

### 4. Respond to Feedback

- Be open to suggestions
- Make requested changes
- Push updates to your branch

---

## Coding Standards

### TypeScript Best Practices

```typescript
// ✓ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  } catch (error) {
    console.error('Failed to get user:', error);
    throw error;
  }
};

// ✗ Avoid
function getUser(id) {
  return fetch(`/api/users/${id}`).then(r => r.json());
}
```

### Error Handling

```typescript
// ✓ Good
try {
  const result = await executeOperation();
  return { success: true, data: result };
} catch (error: any) {
  logger.error('Operation failed', { error: error.message });
  return { success: false, error: error.message };
}

// ✗ Avoid
const result = await executeOperation(); // No error handling
```

### Security

```typescript
// ✓ Good - Validate input
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✓ Good - Use parameterized queries
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ✗ Avoid - SQL injection risk
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✗ Avoid - Storing secrets in code
const API_KEY = 'sk-1234567890';
```

---

## Testing

### Writing Tests

```typescript
describe('User Service', () => {
  describe('getUser', () => {
    it('should return user by ID', async () => {
      const user = await getUser('123');
      expect(user.id).toBe('123');
    });

    it('should throw error for invalid ID', async () => {
      await expect(getUser('invalid')).rejects.toThrow();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test -- path/to/test.ts
```

### Coverage Requirements

- Minimum 80% code coverage
- All public APIs must have tests
- Critical paths must have tests

---

## Documentation

### README Updates

Update `README.md` if you:
- Add new features
- Change configuration
- Modify installation steps

### API Documentation

Document new endpoints:

```typescript
/**
 * Get user by ID
 * 
 * @route GET /api/users/:id
 * @param {string} id - User ID
 * @returns {User} User object
 * @throws {Error} If user not found
 * 
 * @example
 * GET /api/users/123
 * Response: { id: '123', name: 'John', email: 'john@example.com' }
 */
```

### Plugin Documentation

If creating a plugin, include:

```markdown
# My Plugin

Description of what the plugin does.

## Installation

```bash
npm install @echoctl/my-plugin
```

## Usage

```typescript
import { myPlugin } from '@echoctl/my-plugin';
```

## Tools

- `my-plugin:tool1` - Description
- `my-plugin:tool2` - Description

## Configuration

```bash
export MY_PLUGIN_API_KEY=your_key
```
```

---

## Review Process

### What We Look For

1. **Code Quality**
   - Follows style guidelines
   - Well-tested
   - Properly documented

2. **Functionality**
   - Solves the stated problem
   - No breaking changes
   - Backward compatible

3. **Performance**
   - No significant performance regression
   - Efficient algorithms
   - Proper caching/optimization

4. **Security**
   - No security vulnerabilities
   - Proper input validation
   - Secure error handling

### Timeline

- Initial review: 24-48 hours
- Feedback response: 24 hours
- Final approval: After all feedback addressed

---

## Recognition

Contributors will be recognized in:

- `CONTRIBUTORS.md` file
- Release notes
- GitHub contributors page

---

## Questions?

- **GitHub Issues**: [Ask a question](https://github.com/Chieji/ECHOMEN/issues)
- **Discussions**: [Join the discussion](https://github.com/Chieji/ECHOMEN/discussions)
- **Email**: contribute@echomen.dev

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to ECHOMEN! 🚀**
