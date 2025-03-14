import { error } from '@actions/core';
import { BaseAction } from '../../shared/base-action';
import { input } from '../../shared/input';
import { output } from '../../shared/output';
import { context, getOctokit } from '@actions/github';
import {
  deleteBranchesAsync,
  filterBranchesByRegex,
  getDeletableBranchesAsync,
} from '../../shared/cleanup-utils';

export class CleanupStaleBranchesAction extends BaseAction {
  inputs = new (class {
    @input({
      description:
        'Regex pattern to match branches that are allowed to be deleted.',
    })
      allowedBranchesPattern = '';
    @input({
      description:
        'If true, the action will only simulate the deletion of branches without actually deleting them.',
    })
      dryRun = false;
    @input({
      description: 'GitHub token required for authentication.',
      required: true,
    })
      githubToken = '';
    @input({
      description:
        'Regex pattern to match branches that should be ignored and not deleted.',
    })
      ignoreBranchesPattern = '';
    @input({
      description:
        'The maximum age (in days) of a branch to be considered for deletion. Default is 90 days.',
    })
      lastCommitAgeDays = 90;
  })();

  protected outputs = new (class {
    @output({
      description:
        'Comma-separated list of branches that met deletion criteria.',
    })
      deletableBranches = '';
  })();

  protected async executeActionAsync(): Promise<void> {
    const {
      dryRun,
      githubToken,
      allowedBranchesPattern,
      ignoreBranchesPattern,
      lastCommitAgeDays,
    } = this.inputs;

    if (!githubToken) {
      error('GitHub token is required');
    }

    try {
      const octoKit = getOctokit(githubToken);
      const { owner, repo } = context.repo;
      const baseParams = { owner, repo };

      const { data: branches } = await octoKit.rest.repos.listBranches(
        baseParams
      );
      const branchesWithPrefix = filterBranchesByRegex(
        branches,
        allowedBranchesPattern
      );
      const ignoreBranches =
        ignoreBranchesPattern?.trim().length > 0
          ? filterBranchesByRegex(branches, ignoreBranchesPattern)
          : [];
      const maxAgeDate = new Date(
        new Date().setDate(new Date().getDate() - lastCommitAgeDays)
      );
      const deletableBranches = await getDeletableBranchesAsync(
        octoKit,
        baseParams,
        branchesWithPrefix,
        ignoreBranches,
        maxAgeDate
      );
      await deleteBranchesAsync(octoKit, baseParams, deletableBranches, dryRun);
      this.outputs.deletableBranches = deletableBranches
        .map((branch: any) => branch.name)
        .join(',');
    } catch (err) {
      error(`Error executing action: ${err}`);
    }
  }
}
