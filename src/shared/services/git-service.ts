import { error, info, warning } from '@actions/core';
import { execSync } from 'child_process';
import { GitCommit } from '../models/git-commit';

/**
 * A service to interact with Git
 */
export class GitService {
  /**
   * Initializes a new instance of the GitService class
   * @throws {Error} If the current directory is not a git repository
   */
  constructor() {
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
      this.performUnshallowFetch();
    } catch {
      throw new Error('Not a git repository');
    }
  }

  /**
   * Gets the very first commit SHA for the current branch
   * @returns {string} The current branch name
   */
  getInitialCommitSha(): string | null {
    try {
      return execSync('git rev-list --max-parents=0 HEAD', {
        encoding: 'utf8',
      }).trim();
    } catch (err) {
      warning(`Failed to get initial commit SHA: ${err}`);
      return null;
    }
  }

  /**
   * Gets the commits within the specified range (excludes the fromCommit, but includes the toCommit)
   * @param fromCommit The commit SHA to start from (exclusive)
   * @param toCommit The commit SHA to end at (inclusive)
   * @returns {GitCommit[]} An array of GitCommit objects
   */
  getCommitsWithinRange(fromCommit: string, toCommit: string): GitCommit[] {
    if (!fromCommit || !toCommit) {
      error('Both fromCommit and toCommit must be provided');
      return [];
    }

    try {
      const log = execSync(
        `git log --pretty=format:'%H|%an|%ae|%ad|%cn|%ce|%cd|%s' --date=iso ${fromCommit}..${toCommit}`,
        {
          encoding: 'utf8',
        }
      );

      return log
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          const [
            sha,
            authorName,
            authorEmail,
            authorDate,
            committerName,
            committerEmail,
            committerDate,
            message,
          ] = line.split('|');
          const tag = execSync(`git tag --points-at ${sha}`, {
            encoding: 'utf8',
          }).trim();

          return {
            sha,
            author: {
              name: authorName,
              email: authorEmail,
              date: authorDate,
            },
            committer: {
              name: committerName,
              email: committerEmail,
              date: committerDate,
            },
            message,
            tag,
          } as GitCommit;
        });
    } catch (err) {
      error(
        `Failed to get commits within range ${fromCommit}..${toCommit}: ${err}`
      );
      return [];
    }
  }

  /**
   * Performs an unshallow fetch if the repository is shallow
   */
  private performUnshallowFetch(): void {
    try {
      const isShallow =
        execSync('git rev-parse --is-shallow-repository', {
          encoding: 'utf8',
        }).trim() === 'true';

      if (isShallow) {
        execSync('git fetch --unshallow', { stdio: 'inherit' });
        info('Successfully performed unshallow fetch');
      }
    } catch (err) {
      error(`Failed to perform unshallow fetch: ${err}`);
    }
  }
}
