/* eslint-disable indent */
import { error, info, summary } from '@actions/core';
import { BaseAction } from '../../shared/base-action';
import { input } from '../../shared/input';
import { output } from '../../shared/output';
import { GitService } from '../../shared/services/git-service';
import { GitHubService } from '../../shared/services/github-service';
import { context } from '@actions/github';
import {
  formatUTCDate,
  geenrateSummaryTable,
  htmlEncode,
  truncate,
} from '../../shared/helpers';
import { AdoService } from '../../shared/services/ado-service';

interface WorkItemsDict {
  [key: string]: {
    adoRefId: string;
    workItemHtmlLink: string;
    state: string;
    contributors: string[];
    approvers: string[];
    pullRequests: string[];
    pullRequestLinks: string[];
  };
}

/**
 * Action to audit changes between two commits and generate a summary of changes, pull requests, and work items.
 */
export class AuditChangesAction extends BaseAction {
  inputs = new (class {
    @input({ description: 'Adds link to release notes.' })
    addReleaseNotesLink = false;
    @input({
      description:
        'Organization ADO url in which to connect too. Example: https://dev.azure.com/mb-io',
    })
    adoOrganizationUrl = '';
    @input({ description: 'ADO token required for authentication.' })
    adoToken = '';
    @input({
      description: 'GitHub token required for authentication.',
      required: true,
    })
    githubToken = '';
    @input({ description: 'Indicates if this is a pre-release run.' })
    preRelease = false;
    @input({ description: 'Release tag generated for the release.' })
    releaseTag = '';
  })();

  protected outputs = new (class {
    @output({
      description: 'Change notes generated for the release.',
    })
    changeNotes = '';
  })();

  private gitService: GitService | undefined;
  private githubService: GitHubService | undefined;

  protected async executeActionAsync(): Promise<void> {
    const {
      addReleaseNotesLink,
      adoToken,
      adoOrganizationUrl,
      githubToken,
      preRelease,
      releaseTag,
    } = this.inputs;

    if (!githubToken) {
      error('GitHub token is required');
      return;
    }

    try {
      info('Audit changes action started...');
      this.gitService = new GitService();
      this.githubService = new GitHubService(githubToken);

      const releaseInfo = await this.githubService.getReleaseByTag(releaseTag);
      if (!releaseInfo) {
        info(
          `No release found for tag ${releaseTag}. Assuming this is an ongoing release.`
        );
      }

      const previousRelease = releaseInfo
        ? await this.githubService.getPreviousRelease(releaseTag)
        : await this.githubService.getLatestRelease();
      if (!previousRelease) {
        info('No previous release found. Assuming this is the first release.');
      }

      const releaseSha = releaseInfo?.target_commitish ?? context.sha;
      const previousReleaseSha =
        previousRelease?.target_commitish ??
        this.gitService.getInitialCommitSha();
      const previousReleaseTag = previousRelease?.tag_name ?? null;

      const changes = await this.getChangesForRelease(
        previousReleaseSha,
        releaseSha
      );
      const distinctPullRequests = Array.from(
        new Set(
          changes
            .map((change) => change.pullRequest)
            .filter((pr) => pr?.number !== null && Number(pr?.number))
            .map((pr) => [pr?.number, pr])
        ).values()
      );

      const workItemsDict = await this.getWorkItems(
        distinctPullRequests,
        adoToken,
        adoOrganizationUrl
      );

      const summary = this.generateSummary(
        changes,
        distinctPullRequests,
        workItemsDict,
        previousReleaseSha,
        previousReleaseTag,
        releaseSha,
        releaseTag,
        preRelease,
        addReleaseNotesLink
      );

      const notes = summary.stringify();

      info('Summary of changes:');
      info(notes);

      await summary.write();
      this.outputs.changeNotes = notes;

      info('Audit changes action completed successfully.');
    } catch (err) {
      error(`Audit changes action failed: ${err}`);
    }
  }

  /**
   * Gets the changes between two commits (excludes the fromCommit, but includes the toCommit)
   * @param fromCommit - The commit SHA to start from (exclusive)
   * @param toCommit - The commit SHA to end at (inclusive)
   * @returns {Promise<GitCommit[]>} - An array of GitCommit objects
   */
  private async getChangesForRelease(
    fromCommit: string,
    toCommit: string
  ): Promise<any[]> {
    const changes = [];

    const commits = await this.gitService!.getCommitsWithinRange(
      fromCommit,
      toCommit
    );

    for (const commit of commits) {
      const pullRequests = (
        await this.githubService!.getPullRequestsByCommitSha(commit.sha)
      ).filter((pr: { state: string }) => pr.state === 'closed');

      const pullRequest = pullRequests[0];
      const pullRequestId = pullRequest?.number ?? null;
      const pullRequestLink = pullRequest
        ? `<a href="${pullRequest.html_url}">${pullRequest.number}</a>`
        : '-';
      const pullRequestApprovers = pullRequest.approvers.map(
        (a) => `<a href="${a?.html_url}">${a?.name ?? a?.email ?? a?.login}</a>`
      );
      const committer = commit.committer.name ?? commit.committer.email;

      changes.push({
        message: `${htmlEncode(truncate(commit.message, 50))}`,
        sha: `${commit.sha.substring(0, 7)}`,
        pullRequest,
        pullRequestId,
        pullRequestLink,
        pullRequestApprovers,
        committer,
        date: commit.committer.date
          ? formatUTCDate(commit.committer.date)
          : 'Unknown',
      });
    }
    return changes;
  }

  /**
   * Gets work items associated with pull requests.
   * @param pullRequests - The pull requests to get work items for.
   * @param adoToken - The ADO token for authentication.
   * @param adoOrganizationUrl - The ADO organization URL.
   * @returns {Promise<WorkItemsDict>} - A dictionary of work items.
   */
  private async getWorkItems(
    pullRequests: any,
    adoToken: string,
    adoOrganizationUrl: string
  ): Promise<WorkItemsDict> {
    const workItemsDict: WorkItemsDict = {};

    for (const pr of pullRequests) {
      const workItems = await Promise.all(
        (pr.body?.match(/AB#\d+/gi) ?? []).map(async (adoRefId: any) => {
          const id = adoRefId.replace(/AB#/i, '');
          const adoService = new AdoService(adoToken, adoOrganizationUrl);
          const state = await adoService.getWorkItemState(Number(id));
          const workItemHtmlLink = this.extractAdoLinkFromText(
            pr.body,
            adoRefId,
            id,
            adoOrganizationUrl
          );

          return {
            adoRefId,
            workItemHtmlLink,
            state,
            pullRequestId: pr?.number,
          };
        })
      );

      const contributor = `<a href="${pr.user?.html_url}">${
        pr.user?.name ?? pr.user?.email ?? pr.user?.login
      }</a>`;
      const pullRequestLink = `<a href="${pr.html_url}">${pr.number}</a>`;

      workItems.forEach(
        ({ adoRefId, workItemHtmlLink, state, pullRequestId }) => {
          if (!workItemsDict[adoRefId]) {
            workItemsDict[adoRefId] = {
              adoRefId,
              workItemHtmlLink,
              state,
              contributors: [],
              approvers: [],
              pullRequests: [],
              pullRequestLinks: [],
            };
          }

          workItemsDict[adoRefId].approvers = Array.from(
            new Set(workItemsDict[adoRefId].approvers.concat(pr.approvers))
          );
          workItemsDict[adoRefId].contributors = Array.from(
            new Set(workItemsDict[adoRefId].contributors.concat(contributor))
          );
          workItemsDict[adoRefId].pullRequests = Array.from(
            new Set(workItemsDict[adoRefId].contributors.concat(pullRequestId))
          );
          workItemsDict[adoRefId].pullRequestLinks = Array.from(
            new Set(
              workItemsDict[adoRefId].contributors.concat(pullRequestLink)
            )
          );
        }
      );
    }

    return workItemsDict;
  }

  private extractAdoLinkFromText(
    text: string,
    adoRefId: string,
    id: string,
    adoOrganizationUrl: string
  ) {
    const linkMatch = text?.match(
      new RegExp(`\\[${adoRefId}\\]\\((https://dev\\.azure\\.com/[^)]+)\\)`)
    );
    const link = linkMatch && linkMatch.length > 0 ? linkMatch[1] : null;
    return link
      ? `<a href="${link}">${adoRefId}</a>`
      : `<a href="${adoOrganizationUrl}/_apis/wit/workitems/${id}">${adoRefId}</a>`;
  }

  /**
   * Generates a summary of changes, pull requests, and work items.
   * @param changes - The changes to summarize.
   * @param pullRequests - The pull requests to summarize.
   * @param workItemsDict - The work items dictionary to summarize.
   * @param fromSha - The SHA of the commit to start from.
   * @param fromTag - The tag of the commit to start from.
   * @param toSha - The SHA of the commit to end at.
   * @param toTag - The tag of the commit to end at.
   * @param preRelease - Indicates if this is a pre-release run.
   * @param addReleaseNotesLink - Indicates if a link to release notes should be added.
   */
  private generateSummary(
    changes: any,
    pullRequests: any,
    workItemsDict: WorkItemsDict,
    fromSha: string,
    fromTag: string | null,
    toSha: string,
    toTag: string | null,
    preRelease: boolean,
    addReleaseNotesLink: boolean
  ) {
    const trimmedFromSha = fromSha.substring(0, 7);
    const trimmedToSha = toSha.substring(0, 7);
    const compareUrl = `https://github.com/${context.repo.owner}/${
      context.repo.repo
    }/compare/${fromTag ?? fromSha}...${!preRelease && toTag ? toTag : toSha}`;

    const pullRequestRows = pullRequests.map((pr: any) => {
      const safeMessage = `<a href="${pr.html_url}">${htmlEncode(
        truncate(pr.message, 50)
      )}</a>`;
      const workItems: string[] = [];
      Object.values(workItemsDict).forEach((item) => {
        if (item.pullRequests.includes(pr.number)) {
          workItems.push(item.workItemHtmlLink);
        }
      });

      const contributors = `<a href="${pr.user?.html_url}">${
        pr.user?.name ?? pr.user?.email ?? pr.user?.login
      }</a>`;
      const approvers = pr.approvers
        .map(
          (a: any) =>
            `<a href="${a?.html_url}">${a?.name ?? a?.email ?? a?.login}</a>`
        )
        .join(', ');

      return [safeMessage, workItems.join(', '), contributors, approvers];
    });

    const workItemRows = Object.values(workItemsDict).map(
      ({
        workItemHtmlLink,
        state,
        contributors,
        approvers,
        pullRequestLinks,
      }) => {
        return [
          workItemHtmlLink,
          state,
          contributors.join(', '),
          approvers.join(', '),
          pullRequestLinks.join(', '),
        ];
      }
    );

    summary.addRaw(`🧬 SHA: ${trimmedToSha}`).addBreak();

    if (addReleaseNotesLink && toTag) {
      summary.addRaw(`🏷️ Release Tag: ${toTag}`).addBreak();
    }

    if (addReleaseNotesLink && toTag && !preRelease) {
      const releaseNotesUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/releases/tag/${toTag}`;
      summary
        .addRaw(`🚀 Released On: ${formatUTCDate(new Date())}`)
        .addBreak()
        .addLink('🔗 Go to Release', releaseNotesUrl)
        .addBreak();
    }

    summary
      .addLink(`🔗 Compare Changes (${changes.length} total)`, compareUrl)
      .addBreak()
      .addRaw(
        `🔍 Comparing ${fromTag ?? trimmedFromSha} to ${
          !preRelease && toTag ? toTag : trimmedToSha
        }`
      )
      .addBreak()
      .addHeading('Work Items', 2);

    if (workItemRows.length > 0) {
      summary.addTable(
        geenrateSummaryTable(workItemRows, [
          'Work Item',
          'State',
          'Pull Request(s)',
          'Contributor(s)',
          'Approver(s)',
        ])
      );
    } else {
      summary.addRaw('No work items found.').addBreak();
    }

    summary.addHeading('Pull Requests', 2);

    if (pullRequestRows.length > 0) {
      summary.addTable(
        geenrateSummaryTable(pullRequestRows, [
          'ID - Title',
          'Work Item(s)',
          'Contributor(s)',
          'Approver(s)',
        ])
      );
    } else {
      summary.addRaw('No pull requests found.').addBreak();
    }

    return summary;
  }
}
