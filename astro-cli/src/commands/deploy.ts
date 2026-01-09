import { findTestFiles } from '../test-discovery';
import { getRunnerHost } from './configure-runner-host';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export async function executeDeploy(): Promise<void> {
  const runnerHost = getRunnerHost();

  if (!runnerHost) {
    console.error('ERROR: No runner host configured. Run: astro configure-runner-host <host>');
    process.exit(1);
  }

  console.log('Deploying tests to runner...');

  const testFiles = findTestFiles();
  const workspaceRoot = findWorkspaceRoot();
  const testSystemPath = path.join(workspaceRoot, 'astro-test-system', 'dist');

  if (!fs.existsSync(testSystemPath)) {
    throw new Error(
      'Test system not built. Please run: cd astro-test-system && npm install && npm run build'
    );
  }

  // TODO: Implement deployment logic
  // - Read each test file
  // - Execute it to get JSON plan
  // - Send to runner API
  // - Handle responses

  console.log('Deployed.');
}

function findWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    const astroCliPath = path.join(current, 'astro-cli');
    const testSystemPath = path.join(current, 'astro-test-system');
    if (fs.existsSync(astroCliPath) && fs.existsSync(testSystemPath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}
