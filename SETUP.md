# Setup Guide for Astro

This guide will help you set up and test compile the Astro CLI with sample tests.

## Prerequisites

1. **Node.js** (20+)
2. **npm** or **yarn**
3. **tsx** (install globally: `npm install -g tsx` or use `npx tsx`)

## Setup Steps

### 1. Install TypeScript Dependencies

First, install dependencies for the test system and plan executor:

```bash
# Install test system dependencies
cd astro-test-system
npm install
npm run build

# Install plan executor dependencies
cd ../astro-plan-executor
npm install
npm run build

cd ..
```

### 2. Build the CLI

```bash
cd astro-cli
npm install
npm run build
```

This creates the compiled TypeScript in the `dist/` directory.

### 4. Create Sample Test

A sample test file has been created at `__astro__/example-check.ts`. This test:
- Makes a GET request to `/health`
- Waits 1 second
- Outputs a JSON test plan

You can create additional tests by:
1. Creating a `__astro__` directory anywhere in your project
2. Adding `.ts` files that use the test system DSL
3. The CLI will automatically discover and run them

### 5. Run Tests Locally

The CLI will automatically discover all test files in `__astro__` directories. Each test file specifies its own `endpoint_host` (including port):

```bash
# Using the built CLI
node astro-cli/dist/cli.js run-local

# Or using npm scripts (development mode)
cd astro-cli
npm run dev run-local

# The CLI will:
# - Discover all .ts files in __astro__ directories
# - Execute each test file (which outputs JSON)
# - Run the JSON test plan using the endpoint_host from each test file
# - Display results with pass/fail status
```

**Note**: Make sure you have servers running on the ports specified in your test files' `endpoint_host` configurations, or the endpoint requests will fail (which is expected behavior for testing).

**Future**: Once published to npm, you'll be able to use:
```bash
npx astro-cli run-local
```

## Troubleshooting

### npm install fails

If you encounter permission errors with npm, try:
- Using `nvm` to manage Node.js versions
- Running with `sudo` (not recommended)
- Checking npm permissions

### tsx not found

The test runner requires `tsx` to run TypeScript files. Install it globally:

```bash
npm install -g tsx
```

Or the script will automatically try to use `npx tsx` as a fallback.

### "Test system not built" error

Make sure you've built both `astro-test-system` and `astro-plan-executor`:

```bash
cd astro-test-system && npm install && npm run build
cd ../astro-plan-executor && npm install && npm run build
```

### "Plan executor not found" error

Same as above - ensure both TypeScript projects are built.

### Test execution fails

- Check that your test file outputs valid JSON (the test system should handle this automatically)
- Verify the server is running on the specified port
- Check that endpoint paths in your test match your server's API routes

## Project Structure

```
bastion/
├── astro-cli/          # TypeScript CLI tool
├── astro-runner/       # TypeScript orchestration service
├── astro-test-system/  # TypeScript DSL library
├── astro-plan-executor/# TypeScript plan executor
└── __astro__/          # Test files directory
    └── example-check.ts
```
