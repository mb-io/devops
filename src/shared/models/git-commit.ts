export interface GitCommit {
  sha: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
  tag: string | undefined;
  pullRequestId: string | undefined;
}
