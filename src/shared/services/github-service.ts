/* eslint-disable camelcase */
import { info, warning } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

/**
 * A service to interact with GitHub API
 */
export class GitHubService {
  private readonly octoKit: InstanceType<typeof GitHub>;
  private readonly owner: string;
  private readonly repo: string;
  private validReleases: any[] = [];

  /**
   * Initializes a new instance of the GitHubService class
   * @param githubToken The GitHub token to authenticate with the API
   * @throws {Error} If the GitHub token is not provided
   */
  constructor(githubToken: string) {
    if (!githubToken) {
      throw new Error('GitHub token is required');
    }

    this.octoKit = getOctokit(githubToken);
    this.owner = context.repo.owner;
    this.repo = context.repo.repo;
  }

  /**
   * Gets a list of approvers for a pull request by its number
   * @returns {number} The pull request number
   */
  async getApproversByPullRequestNumber(pullRequestNumber: number) {
    try {
      const { data: reviews } = await this.octoKit.rest.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: pullRequestNumber,
      });
      return reviews.filter((review) => review.state === 'APPROVED');
    } catch (err) {
      warning(
        `Failed to fetch reviews for pull request #${pullRequestNumber}: ${err}`
      );
      return [];
    }
  }

  /**
   * Gets the latest release from the repository
   */
  async getLatestRelease() {
    const validReleases = await this.getValidReleases();
    if (validReleases.length === 0) {
      return null;
    }
    return validReleases[0];
  }

  /**
   * Gets the release that was published before the release with the specified tag
   * @param releaseTag The tag of the release to find the previous release for
   */
  async getPreviousRelease(releaseTag: string) {
    if (!releaseTag) {
      return null;
    }

    const validReleases = await this.getValidReleases();
    if (validReleases.length === 0) {
      return null;
    }

    const currentReleaseIndex = validReleases.findIndex(
      (r: { tag_name: string }) => r.tag_name === releaseTag
    );
    return validReleases[currentReleaseIndex + 1] ?? null;
  }

  /**
   * Gets the pull requests associated with a commit SHA
   * @param commitSha The commit SHA to find pull requests for
   */
  async getPullRequestsByCommitSha(commitSha: string) {
    try {
      const { data: pullRequests } =
        await this.octoKit.rest.repos.listPullRequestsAssociatedWithCommit({
          owner: this.owner,
          repo: this.repo,
          commit_sha: commitSha,
        });
      const approvedPullRequests = await Promise.all(
        pullRequests.map(async (pullRequest) => {
          const approvers = (
            await this.getApproversByPullRequestNumber(pullRequest.number)
          ).map((review) => review.user);
          return {
            ...pullRequest,
            approvers,
          };
        })
      );
      return approvedPullRequests;
    } catch (err) {
      warning(
        `Failed to fetch pull requests for commit SHA ${commitSha}: ${err}`
      );
      return [];
    }
  }

  /**
   * Gets the release by its tag
   * @param tag The tag of the release to fetch
   */
  async getReleaseByTag(tag: string) {
    if (!tag) {
      info('Attempted to get release by tag, but no tag was provided');
      return null;
    }

    try {
      const { data: release } = await this.octoKit.rest.repos.getReleaseByTag({
        owner: this.owner,
        repo: this.repo,
        tag,
      });

      if (!release.published_at) {
        info(
          `The release with tag ${tag} does not have a valid published date.`
        );
        return null;
      }

      return release;
    } catch (err: any) {
      if (err?.status === 404) {
        info(`Release with tag ${tag} not found.`);
        return null;
      }
      warning(`Failed to fetch release by tag ${tag}: ${err}`);
      return null;
    }
  }

  /**
   * Gets the list of valid releases from the repository
   */
  async getValidReleases() {
    if (this.validReleases.length > 0) {
      return this.validReleases;
    }

    try {
      let page = 1;
      const perPage = 100;
      const releases = [];

      while (true) {
        const { data: responseData } =
          await this.octoKit.rest.repos.listReleases({
            owner: this.owner,
            repo: this.repo,
            per_page: perPage,
            page,
          });

        if (responseData.length === 0) {
          break;
        }

        releases.push(...responseData);
        page++;
      }

      this.validReleases = releases
        .filter((r: { published_at: string | null }) => r.published_at !== null)
        .sort(
          (
            a: { published_at: string | null },
            b: { published_at: string | null }
          ) =>
            new Date(b.published_at as string).getTime() -
            new Date(a.published_at as string).getTime()
        );
      return this.validReleases;
    } catch (err) {
      warning(`Failed to fetch releases: ${err}`);
      return [];
    }
  }
}
