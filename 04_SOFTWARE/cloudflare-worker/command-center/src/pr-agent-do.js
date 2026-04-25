// Autonomous Pull Request Agent Durable Object
// Manages dependency updates and automated PR creation
class PullRequestAgentDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.agentId = state.id.toString();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/internal/update-deps' && request.method === 'POST') {
      return this.handleDependencyUpdate(request);
    }

    if (url.pathname === '/internal/create-pr' && request.method === 'POST') {
      return this.createPullRequest(request);
    }

    if (url.pathname === '/internal/status' && request.method === 'GET') {
      return new Response(JSON.stringify({
        agent_id: this.agentId,
        status: 'active'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
  }

  async handleDependencyUpdate(request) {
    const body = await request.json();
    const { worker_id, packages } = body;

    try {
      const updates = [];
      const errors = [];

      for (const pkg of packages) {
        try {
          const update = await this.checkAndUpdatePackage(pkg.name, pkg.current_version);
          if (update.needsUpdate) {
            updates.push(update);
          } else {
            console.log(`Package ${pkg.name} is up to date`);
          }
        } catch (error) {
          errors.push({ package: pkg.name, error: error.message });
        }
      }

      if (updates.length > 0) {
        // Create PR with all updates
        const pr = await this.createPullRequest({
          worker_id,
          updates,
          title: body.title || `chore: update ${updates.length} dependencies`,
          body: body.body || this.generatePRBody(updates)
        });

        await this.logAgentAction({
          success: true,
          action: 'dependency_update',
          details: { worker: worker_id, updates: updates.length, pr_url: pr.url },
          rationale: `Created PR with ${updates.length} dependency updates`,
          confidence: 0.92
        });

        return new Response(JSON.stringify({
          success: true,
          agent_id: this.agentId,
          updates,
          pr,
          errors
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        agent_id: this.agentId,
        message: 'All packages are up to date',
        errors
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      await this.logAgentAction({
        success: false,
        action: 'dependency_update',
        details: { error: error.message },
        rationale: 'Dependency update failed',
        confidence: 0.0
      });

      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async createPullRequest(request) {
    const body = await request.json();
    const { title, body: description, head, base = 'main', draft = false } = body;

    try {
      const githubToken = this.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error('GITHUB_TOKEN not configured');
      }

      const repo = this.env.GITHUB_REPO || 'p31labs/andromeda';

      const response = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          title,
          body: description,
          head: head || `bot/deps/${Date.now()}`,
          base,
          draft
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message}`);
      }

      const pr = await response.json();

      // Add labels if specified
      if (body.labels && body.labels.length > 0) {
        await fetch(`https://api.github.com/repos/${repo}/issues/${pr.number}/labels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            labels: body.labels
          })
        });
      }

      // Request reviewers if specified
      if (body.reviewers && body.reviewers.length > 0) {
        await fetch(`https://api.github.com/repos/${repo}/pulls/${pr.number}/requested_reviewers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reviewers: body.reviewers
          })
        });
      }

      await this.logAgentAction({
        success: true,
        action: 'create_pr',
        details: { pr_number: pr.number, pr_url: pr.html_url, title },
        rationale: `PR #${pr.number} created: ${title}`,
        confidence: 0.95
      });

      return new Response(JSON.stringify({
        success: true,
        agent_id: this.agentId,
        pr: {
          number: pr.number,
          html_url: pr.html_url,
          title: pr.title,
          state: pr.state,
          draft: pr.draft
        }
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      await this.logAgentAction({
        success: false,
        action: 'create_pr',
        details: { error: error.message },
        rationale: 'PR creation failed',
        confidence: 0.0
      });

      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async checkAndUpdatePackage(packageName, currentVersion) {
    try {
      // Fetch latest version from npm registry
      const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch package info: ${response.statusText}`);
      }

      const data = await response.json();
      const latestVersion = data.version;

      // Compare versions
      const needsUpdate = this.compareVersions(currentVersion, latestVersion) < 0;

      if (needsUpdate) {
        // Get changelog
        const changelog = await this.fetchChangelog(packageName, currentVersion, latestVersion);

        return {
          package: packageName,
          current_version: currentVersion,
          latest_version: latestVersion,
          needsUpdate: true,
          changelog,
          release_date: data.time?.[latestVersion],
          homepage: data.homepage
        };
      }

      return {
        package: packageName,
        current_version: currentVersion,
        latest_version: latestVersion,
        needsUpdate: false
      };

    } catch (error) {
      console.error(`Failed to check package ${packageName}:`, error);
      throw error;
    }
  }

  async fetchChangelog(packageName, fromVersion, toVersion) {
    try {
      // Try to fetch from GitHub releases
      const packageInfo = await fetch(`https://registry.npmjs.org/${packageName}`);
      const data = await packageInfo.json();

      if (data.repository?.url) {
        const repoUrl = data.repository.url;
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
        
        if (match) {
          const [, owner, repo] = match;
          const cleanRepo = repo.replace('.git', '');

          const releases = await fetch(
            `https://api.github.com/repos/${owner}/${cleanRepo}/releases?per_page=10`
          );

          if (releases.ok) {
            const releaseData = await releases.json();
            const relevantReleases = releaseData.filter(r => 
              this.compareVersions(r.tag_name, fromVersion) > 0 &&
              this.compareVersions(r.tag_name, toVersion) <= 0
            );

            return relevantReleases.map(r => ({
              version: r.tag_name,
              name: r.name,
              published_at: r.published_at,
              body: r.body
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch changelog:', error);
    }

    return [];
  }

  compareVersions(v1, v2) {
    const parts1 = v1.replace(/^v/, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  generatePRBody(updates) {
    let body = '## Automated Dependency Update\n\n';
    body += 'This PR was automatically generated by the P31 Maintenance Bot.\n\n';
    body += '### Updated Packages\n\n';
    body += '| Package | Previous | Updated |\n';
    body += '|---------|----------|---------|\n';

    for (const update of updates) {
      body += `| ${update.package} | ${update.current_version} | ${update.latest_version} |\n`;
    }

    body += '\n### Changelog Highlights\n\n';

    for (const update of updates) {
      if (update.changelog && update.changelog.length > 0) {
        body += `#### ${update.package}\n\n`;
        for (const release of update.changelog.slice(0, 3)) {
          body += `- **${release.version}** (${new Date(release.published_at).toLocaleDateString()})\n`;
          if (release.body) {
            const firstLine = release.body.split('\n')[0];
            body += `  ${firstLine}\n`;
          }
        }
        body += '\n';
      }
    }

    body += '### Checks\n\n';
    body += '- [ ] Tests pass\n';
    body += '- [ ] Build succeeds\n';
    body += '- [ ] No breaking changes\n';
    body += '- [ ] Security review (if applicable)\n\n';
    body += '---\n\n';
    body += '🤖 *This PR was created by the P31 Autonomous Maintenance Bot*';

    return body;
  }

  async logAgentAction(result) {
    if (!this.env.EPCP_DB) return;

    await this.env.EPCP_DB.prepare(
      `INSERT INTO events 
       (ts, actor, action, target, agent_id, decision_rationale, confidence_score, model_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      new Date().toISOString(),
      'agent:pr',
      result.action,
      result.details?.target || 'dependencies',
      this.agentId,
      result.rationale,
      result.confidence,
      '1.0.0'
    ).run();
  }
}

module.exports = { PullRequestAgentDO };
