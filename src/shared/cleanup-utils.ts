import { info, warning } from '@actions/core';
import { GitHub } from '@actions/github/lib/utils';

export function filterBranchesByRegex(branches: any, regexPattern: string) {
  const regex = new RegExp(regexPattern.trim());
  return branches.filter((branch: any) => regex.test(branch.name));
}

export async function getDeletableBranchesAsync(
  octoKit: InstanceType<typeof GitHub>,
  baseParams: any,
  branches: any,
  ignoreBranches: any,
  maxAgeDate: Date
) {
  const deletableBranches = [];

  for (const branch of branches) {
    const { data: repo } = await octoKit.rest.repos.get(baseParams);
    const defaultBranch = repo.default_branch;
    if (branch.name === defaultBranch) {
      info(`Ignoring ${branch.name} because it is the default branch`);
      continue;
    }

    if (ignoreBranches.some((b: any) => b.name === branch.name)) {
      info(`Ignoring ${branch.name} because it is in the ignore list`);
      continue;
    }

    const { data: pullRequests } = await octoKit.rest.pulls.list({
      ...baseParams,
      state: 'open',
    });
    const branchesWithOpenPRs = pullRequests.map((pr: any) => pr.head.ref);
    if (branchesWithOpenPRs.includes(branch.name)) {
      info(`Ignoring ${branch.name} because it has open pull requests`);
      continue;
    }

    const branchesAsBaseOfOpenPRs = pullRequests.map((pr: any) => pr.base.ref);
    if (branchesAsBaseOfOpenPRs.includes(branch.name)) {
      info(
        `Ignoring ${branch.name} because it is the base for a pull request of another branch`
      );
      continue;
    }

    const { data: commit } = await octoKit.rest.repos.getCommit({
      ...baseParams,
      ref: branch.commit.sha,
    });
    const commitDate = new Date(commit.commit.committer?.date ?? '');
    if (commitDate >= maxAgeDate) {
      info(
        `Ignoring ${
          branch.name
        } because last commit is newer than ${maxAgeDate.toISOString()}`
      );
      continue;
    }

    info(`Branch ${branch.name} meets the criteria for deletion`);
    deletableBranches.push(branch.name);
  }

  return deletableBranches;
}

export async function deleteBranchesAsync(
  octokit: InstanceType<typeof GitHub>,
  baseParams: any,
  branches: any,
  dryRun: boolean
) {
  info(
    `Branches queued for deletion: [${branches
      ?.map((b: any) => b.name)
      .join(', ')}]`
  );

  if (dryRun) {
    info('Dry run is enabled, no branches will be deleted.');
    return;
  }

  for await (const branch of branches) {
    try {
      await octokit.rest.git.deleteRef({
        ...baseParams,
        ref: `heads/${branch.name}`,
      });
      info(`Deleted branch ${branch}`);
    } catch (error) {
      warning(`Failed to delete branch ${branch}: ${error}`);
    }
  }
}
