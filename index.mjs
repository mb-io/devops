import { exec } from '@actions/exec';
import * as glob from '@actions/glob';
import { appendFileSync, rmSync, writeFileSync, mkdir } from 'fs';
import path from 'path';
import process from 'node:process';

exec('tsc').then(async () => {
  const YAML_BASE_PATH = './.github/actions/';
  const DIST_BASE_PATH = 'dist/actions';
  const globber = await glob.create('src/actions/*/index.ts');

  rmSync(DIST_BASE_PATH, { recursive: true, force: true });

  for await (const filePath of globber.globGenerator()) {
    const actionName = path.basename(path.dirname(filePath));

    const yamlDir = path.resolve(YAML_BASE_PATH, actionName);
    rmSync(yamlDir, { recursive: true, force: true });

    const libIndexPath = `./lib/actions/${actionName}/index.js`;
    const distPath = `${DIST_BASE_PATH}/${actionName}`;

    exec(`ncc build ${libIndexPath} -o ${distPath}`).then(() => {
      mkdir(yamlDir, { recursive: true }, async () => {
        process.env.GENERATE_ACTION_YML = true;
        process.env.ACTION_YML_PATH = path.resolve(yamlDir, 'action.yml');
        process.env.ACTION_NAME = actionName;
        const yaml = `
name: ${actionName}
description: A GitHub Action built using TypeScript
        `;
        writeFileSync(process.env.ACTION_YML_PATH, yaml.trim() + '\n');
        const runs = `
runs:
  using: 'node20'
  main: '../../../dist/actions/${actionName}/index.js'
        `;
        await import(libIndexPath).then(() => {
          appendFileSync(process.env.ACTION_YML_PATH, '\n' + runs.trim());
        });
      });
    });
  }
});
