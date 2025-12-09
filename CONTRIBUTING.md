# Contributing to golikejs

Thank you for your interest in contributing to golikejs! We welcome contributions from the community to help improve this TypeScript implementation of selected Go standard library primitives for JavaScript and TypeScript runtimes.

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:
- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- Deno 1.40.0 or later
- Git

### Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/golikejs.git
   cd golikejs
   ```

2. Verify your setup:
   ```bash
   deno --version
   deno task test
   ```

## Development Workflow

### 1. Choose an Issue

- Check existing [issues](https://github.com/okdaichi/golikejs/issues) for good first issues
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

Create a feature branch from `main`:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Write clear, focused commits
- Follow TypeScript coding standards
- Add tests for new functionality
- Update documentation as needed

### 4. Testing

Run tests before submitting:
```bash
# Run all tests
deno task test

# Run tests with coverage
deno task test:coverage

# Run tests in watch mode
deno task test:watch
```

### 5. Code Quality

Ensure your code meets our standards:
```bash
# Format code
deno task fmt

# Check formatting
deno task fmt:check

# Run linter
deno task lint

# Type check
deno task check
```

## Coding Standards

### TypeScript Style Guide

- Follow the [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Use `deno fmt` for formatting (configured in deno.json)
- Write clear, concise function and variable names
- Add JSDoc comments for exported functions and types
- Keep functions small and focused
- Use strict TypeScript settings as defined in deno.json

### Documentation Guidelines

All exported symbols (functions, types, constants, variables) must be documented with JSDoc comments:

- **Start with a description**: Comments should begin with a clear description
- **Use complete sentences**: Write clear, grammatically correct sentences
- **Be concise but clear**: Explain what, not how (code shows how)
- **Include examples**: Where appropriate, add usage examples

Example:
```ts
/**
 * Config holds configuration options for the service.
 */
export interface Config {
  timeout: number;
}

/**
 * Creates a new Config with default values.
 */
export function newConfig(): Config {
  return {
    timeout: 30000,
  };
}
```

### Example Functions

For key modules and common use cases, add example functions in `*_test.ts` files:

```ts
// Example demonstrates basic usage of the module.
export function example() {
  const config = newConfig();
  console.log(`Default timeout: ${config.timeout}ms`);
}
```

### Commit Messages

Use clear, descriptive commit messages:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

Example:
```
feat(sync): add support for mutex timeouts

Implement timeout handling in the Mutex class
to allow operations with time limits.

Closes #123
```

### Pull Request Guidelines

When submitting a pull request:

1. **Title**: Use a clear, descriptive title
2. **Description**: Explain what the PR does and why
3. **Tests**: Ensure all tests pass
4. **Documentation**: Update docs if needed
5. **Breaking Changes**: Clearly mark any breaking changes

### Testing Requirements

- Add unit tests for new functionality
- Ensure existing tests still pass
- Test edge cases and error conditions
- Use Deno's built-in test framework

## Project Structure

```
golikejs/
├── src/              # Source code
│   ├── mod.ts        # Main module exports
│   ├── sync/         # Synchronization primitives
│   │   ├── mod.ts
│   │   ├── mutex.ts
│   │   └── ...
│   ├── context/      # Context handling
│   ├── bytes/        # Byte manipulation utilities
│   ├── io/           # I/O interfaces
│   └── ...
├── deno.json         # Deno configuration
├── README.md         # Project documentation
├── CHANGELOG.md      # Version history
└── LICENSE           # License information
```

## Communication

- **Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion
- **Pull Requests**: For code contributions

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

## Recognition

Contributors will be acknowledged in the project documentation. Significant contributions may be recognized in release notes.

Thank you for contributing to golikejs! 🚀