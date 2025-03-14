# Cleanup Stale Branches GitHub Action

This GitHub Action helps in cleaning up stale branches in a repository based on specified criteria. A branch must meet all the following to be deemed safe to delete:

- Must NOT be the default branch (eg master or main, pulled directly from your repository's settings)
- Must NOT be the base of an open pull request of another branch. The base of a pull request is the branch you told GitHub you want to merge your pull request into
- Must NOT be in the optional list of branches to ignore
- Must match the regex pattern for allowed branches
- Must be older than a given amount of days

**Important Note**: Branches using GitHub's classic branch protections will fail to be deleted, even if the restrict deletions rule is disabled. However, branches using the newer rulesets feature CAN be deleted as long as the restrict deletions rule is disabled.

## Inputs

| Name                   | Description                                                                 | Example               |
|------------------------|-----------------------------------------------------------------------------|-----------------------|
| `allowedBranchesPattern` | Regex pattern to match branches that are allowed to be deleted. **Default**: `null`. | `^feature/.*`         |
| `dryRun`               | If true, the action will only simulate the deletion of branches without actually deleting them. **Default**: `false`. | `true`                |
| `githubToken`          | **Required**. GitHub token required for authentication. This input is required.           | `${{ secrets.GITHUB_TOKEN }}` |
| `ignoreBranchesPattern`| Regex pattern to match branches that should be ignored and not deleted. **Default**: `null`. | `^main$\|^develop$`    |
| `lastCommitAgeDays`    | The maximum age (in days) of a branch to be considered for deletion. **Default**: `90` | `30`                  |

## Outputs

| Name                | Description                                                                 | Example               |
|---------------------|-----------------------------------------------------------------------------|-----------------------|
| `deletableBranches` | Comma-separated list of branches that met deletion criteria.                | `feature/branch1,feature/branch2` |

## Usage

```yaml
name: Cleanup Stale Branches
on:
  schedule:
    - cron: '0 0 * * 0' # Runs every Sunday at midnight

jobs:
  cleanup:
    name: Cleanup Stale Branches
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Cleanup stale branches
        id: cleanup_stale
        uses: ./.github/actions/cleanup-stale-branches
        with:
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          allowedBranchesPattern: '^feature/.*'
          ignoreBranchesPattern: 'keep|archive'
          lastCommitAgeDays: 30
          dryRun: true

      - name: Display output in summary
        run: |
          echo "### :wastebasket: Stale branches selected for deletion" >> $GITHUB_STEP_SUMMARY
          echo "${{ steps.cleanup_stale.outputs.deletableBranches }}" >> $GITHUB_STEP_SUMMARY
```

This example configuration runs the action every Sunday at midnight, simulating the deletion of branches that match the `allowedBranchesPattern` and are older than 30 days, while ignoring branches containing `keep` or `archive`.

---

[Back to README](../README.md)
