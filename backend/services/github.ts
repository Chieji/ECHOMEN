/**
 * GitHub Service - Fixed Parameter Handling
 * Fixes Priority 2.1: GitHub tool parameter mismatch
 * Properly parses GitHub URLs and handles separate parameters
 */

export interface GitHubConfig {
  token: string;
  baseUrl?: string;
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  prNumber?: string;
  issueNumber?: string;
}

class GitHubService {
  private config: GitHubConfig;
  private baseUrl: string = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  /**
   * Parse GitHub URL to extract owner, repo, and PR/issue number
   * Supports formats:
   * - https://github.com/owner/repo
   * - https://github.com/owner/repo/pull/123
   * - https://github.com/owner/repo/issues/456
   */
  parseGitHubUrl(url: string): ParsedGitHubUrl {
    const urlPattern =
      /github\.com\/([^/]+)\/([^/]+)(?:\/(pull|issues)\/(\d+))?/;
    const match = url.match(urlPattern);

    if (!match) {
      throw new Error(
        `Invalid GitHub URL format: ${url}. Expected format: https://github.com/owner/repo[/pull|issues/number]`
      );
    }

    const [, owner, repo, type, number] = match;

    const result: ParsedGitHubUrl = { owner, repo };

    if (type === 'pull' && number) {
      result.prNumber = number;
    } else if (type === 'issues' && number) {
      result.issueNumber = number;
    }

    return result;
  }

  /**
   * Get pull request details
   * Accepts either full URL or separate owner/repo/prNumber
   */
  async getPullRequest(
    args: { pr_url?: string; owner?: string; repo?: string; prNumber?: string }
  ): Promise<any> {
    let owner: string;
    let repo: string;
    let prNumber: string;

    // Handle both URL and separate parameters
    if (args.pr_url) {
      const parsed = this.parseGitHubUrl(args.pr_url);
      if (!parsed.prNumber) {
        throw new Error('URL must include pull request number');
      }
      owner = parsed.owner;
      repo = parsed.repo;
      prNumber = parsed.prNumber;
    } else if (args.owner && args.repo && args.prNumber) {
      owner = args.owner;
      repo = args.repo;
      prNumber = args.prNumber;
    } else {
      throw new Error(
        'Must provide either pr_url or all of (owner, repo, prNumber)'
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to get pull request: ${error.message}`);
    }
  }

  /**
   * Create pull request
   * Fixed to accept separate parameters instead of URL
   */
  async createPullRequest(args: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<any> {
    const { owner, repo, title, body, head, base } = args;

    if (!owner || !repo || !title || !head || !base) {
      throw new Error(
        'Missing required parameters: owner, repo, title, head, base'
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            body: body || '',
            head,
            base,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `GitHub API error: ${error.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  /**
   * Update pull request
   */
  async updatePullRequest(args: {
    owner: string;
    repo: string;
    prNumber: string;
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
  }): Promise<any> {
    const { owner, repo, prNumber, title, body, state } = args;

    if (!owner || !repo || !prNumber) {
      throw new Error('Missing required parameters: owner, repo, prNumber');
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (body) updateData.body = body;
    if (state) updateData.state = state;

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to update pull request: ${error.message}`);
    }
  }

  /**
   * Create issue
   */
  async createIssue(args: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<any> {
    const { owner, repo, title, body, labels, assignees } = args;

    if (!owner || !repo || !title) {
      throw new Error('Missing required parameters: owner, repo, title');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/issues`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            body: body || '',
            labels: labels || [],
            assignees: assignees || [],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(args: {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
    limit?: number;
  }): Promise<any[]> {
    const { owner, repo, state = 'open', limit = 30 } = args;

    if (!owner || !repo) {
      throw new Error('Missing required parameters: owner, repo');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to list pull requests: ${error.message}`);
    }
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(args: {
    owner: string;
    repo: string;
    prNumber: string;
    commitTitle?: string;
    commitMessage?: string;
    mergeMethod?: 'merge' | 'squash' | 'rebase';
  }): Promise<any> {
    const {
      owner,
      repo,
      prNumber,
      commitTitle,
      commitMessage,
      mergeMethod = 'merge',
    } = args;

    if (!owner || !repo || !prNumber) {
      throw new Error('Missing required parameters: owner, repo, prNumber');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commit_title: commitTitle,
            commit_message: commitMessage,
            merge_method: mergeMethod,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to merge pull request: ${error.message}`);
    }
  }
}

export const createGitHubService = (config: GitHubConfig) => {
  return new GitHubService(config);
};
