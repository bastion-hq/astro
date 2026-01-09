import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Discovers test files in __astro__ directories.
 */
export function findTestFiles(basePath: string = '.'): string[] {
  const absolutePath = path.resolve(basePath);
  
  // Find all __astro__ directories
  const astroDirs = findAstroDirectories(absolutePath);
  
  // Find all .ts files in those directories
  const testFiles: string[] = [];
  for (const astroDir of astroDirs) {
    const tsFiles = findTsFiles(astroDir);
    testFiles.push(...tsFiles);
  }
  
  return testFiles;
}

function findAstroDirectories(basePath: string): string[] {
  const pattern = path.join(basePath, '**', '__astro__');
  return glob.sync(pattern, { absolute: true });
}

function findTsFiles(astroDir: string): string[] {
  const pattern = path.join(astroDir, '*.ts');
  return glob.sync(pattern, { absolute: true });
}
