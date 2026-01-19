# Contributing to TDS

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all.

## How to Contribute

### Development Workflow

1. **Create a branch:** `git checkout -b feature/your-feature-name`
2. **Make changes** following code standards
3. **Write tests** for all new functionality
4. **Run tests:** `npm test` (must pass 100%)
5. **Commit:** Use clear, descriptive commit messages
6. **Submit PR** with detailed description

### Code Standards

- **Language:** TypeScript (strict mode enabled)
- **Formatting:** Follow ESLint rules (`npm run lint`)
- **Testing:** All new features require unit tests
- **Naming:** Follow conventions in [ARCHITECTURE.md](ARCHITECTURE.md)

### Testing Requirements

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Testing Checklist

- [ ] Unit tests for business logic
- [ ] Integration tests for API routes
- [ ] Edge cases and error scenarios covered
- [ ] All existing tests still pass (no regressions)
- [ ] Test coverage >= 80% for new code

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(auth): add user registration endpoint

- Implement POST /api/auth/register
- Hash passwords with bcryptjs
- Validate email format and uniqueness

Fixes #123
```

## Review Process

1. Create pull request with description
2. Pass all automated tests
3. Code review by senior developer
4. Address feedback
5. Merge when approved

## Questions?

Open an issue or contact the development team.
