# Unit Testing

This folder centralizes CapstoneHub unit testing code and appendix-style evidence in one place.

## Structure

- `code/`: executable unit and component test files with test case IDs.
- `setup/`: shared Vitest setup and module mocks.
- `evidence/`: appendix-style test documentation and screenshots/log references.

## Run Tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Initial Test Case IDs

- `TC-LOGIN-001`: User enters valid email and correct password.
- `TC-REG-001`: User enters valid registration details and account is created.
