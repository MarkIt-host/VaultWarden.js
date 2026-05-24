# Contributing to Vaultwarden Client

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript 5.3+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vaultwarden.js.git
cd vaultwarden.js

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Project Structure

```
src/
├── cache/          # Caching system (LRU, EntityCache)
├── client/         # Main client and VaultwardenClient
├── errors/         # Error classes
├── managers/       # Manager classes (CipherManager, FolderManager, etc.)
├── rest/           # REST client for HTTP communication
├── structures/     # Data structures (LoginCipher, FolderStructure, etc.)
├── types/          # TypeScript type definitions
└── utils/          # Utilities (Collection, crypto, etc.)

examples/           # Usage examples
tests/              # Test files (Vitest)
docs/               # Documentation
```

## Coding Standards

### TypeScript

- Use strict mode
- Enable `exactOptionalPropertyTypes`
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public methods
- Document all public APIs with JSDoc

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- No trailing semicolons
- Maximum line length: 100 characters

### Naming Conventions

- PascalCase for classes and interfaces
- camelCase for methods, properties, and variables
- UPPER_SNAKE_CASE for constants
- Private methods prefixed with `_`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Writing Tests

- Place test files next to source files with `.test.ts` suffix
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule.js';

describe('myFunction', () => {
  it('should return correct result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b feature/my-feature`)
3. **Make your changes** following coding standards
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Run tests** and ensure they pass
7. **Commit** with clear, descriptive messages
8. **Push** to your fork
9. **Open a Pull Request** with a clear description

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process, dependencies, etc.

Example:
```
feat(ciphers): add support for custom fields

- Add fields property to LoginCipher
- Update encryption utils to handle custom fields
- Add tests for custom field encryption
```

## Reporting Issues

### Bug Reports

Please include:
- **Node.js version**
- **Package version**
- **Description** of the bug
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Error messages** (full stack trace if available)

### Feature Requests

Please include:
- **Description** of the feature
- **Use case** - why is this needed?
- **Proposed API** (if applicable)
- **Examples** of how it would be used

## Security Issues

**Do not** open public issues for security vulnerabilities.

Instead, email security concerns to: security@example.com

## Questions?

- Check the [API Documentation](./docs/API.md)
- Review [examples/](./examples/)
- Open a [Discussion](https://github.com/yourusername/vaultwarden.js/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
