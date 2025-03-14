# devops

A set of pre-configured GitHub Actions for use across any project

## Available Actions

- [Cleanup Stale Branches](.docs/cleanup-stale-branches.md)

## Development Setup

To set up the development environment for this project, follow these steps:

1. **Clone the repository:**

   ```sh
   git clone https://github.com/mb-io/devops.git
   cd devops
   ```

2. **Install dependencies:**

   ```sh
   npm install
   npm run husky:prepare
   ```

3. **Build the project:**

   ```sh
   npm run build
   ```

4. **Run tests:**

   ```sh
   npm test
   ```

## Available NPM Scripts

- `build`: Compiles the TypeScript code and runs the resulting JavaScript file.
- `watch`: Watches for changes in the `src` directory and runs the project.
- `lint`: Runs ESLint to check for code quality issues.
- `lint:fix`: Runs ESLint and automatically fixes any fixable issues.
- `test`: Runs the test suite using Jest.
- `husky:prepare`: Prepares the Husky hooks by running a custom script and initializing Husky.
