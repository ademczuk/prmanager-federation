/**
 * PRmanager Client SDK — HTTP client for Will's Codex agent
 *
 * Standard API key auth:
 *   Raw token sent as Bearer over TLS. Server hashes on receipt for lookup.
 *   Same pattern as Stripe, GitHub, etc.
 *
 * Usage:
 *   import { PRManagerClient } from './prmanager-client.js';
 *   const client = new PRManagerClient(process.env.PRMANAGER_URL, process.env.PRMANAGER_TOKEN);
 *   const prs = await client.listPRs({ state: 'open', limit: 20 });
 */

export class PRManagerClient {
  /**
   * @param {string} baseUrl - PRmanager API URL (from PRMANAGER_URL env var)
   * @param {string} token - API token (sent as Bearer over TLS, server hashes for lookup)
   */
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  async _fetch(path, opts = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      ...opts.headers,
    };
    if (opts.body) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, { ...opts, headers });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`${response.status} ${response.statusText}: ${body.error || 'Unknown error'}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  _qs(params) {
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    );
    const qs = new URLSearchParams(filtered).toString();
    return qs ? `?${qs}` : '';
  }

  // ─── Identity ──────────────────────────────────────────────

  /** Check who this token identifies as */
  async whoami() {
    return this._fetch('/api/agent/me');
  }

  // ─── PRs ───────────────────────────────────────────────────

  /** List PRs with optional filters */
  async listPRs({ state, category, author, sort, limit } = {}) {
    return this._fetch(`/api/prs${this._qs({ state, category, author, sort, limit })}`);
  }

  /** Get details for a specific PR */
  async getPR(id) {
    return this._fetch(`/api/prs/${id}`);
  }

  /** Search PRs by query string */
  async searchPRs(query, { limit } = {}) {
    return this._fetch(`/api/prs/search${this._qs({ q: query, limit })}`);
  }

  /** Get stacked PRs for a PR */
  async getStackedPRs(id) {
    return this._fetch(`/api/prs/${id}/stacked`);
  }

  // ─── Issues ────────────────────────────────────────────────

  /** List issues with optional filters */
  async listIssues({ state, label, sort, limit } = {}) {
    return this._fetch(`/api/issues${this._qs({ state, label, sort, limit })}`);
  }

  // ─── Stats & Dashboard ────────────────────────────────────

  /** Get dashboard statistics */
  async getStats() {
    return this._fetch('/api/stats');
  }

  /** Get alerts */
  async getAlerts({ resolved, limit } = {}) {
    return this._fetch(`/api/alerts${this._qs({ resolved, limit })}`);
  }

  // ─── Reviews ───────────────────────────────────────────────

  /** Get reviews for a specific PR */
  async getReviews(prId) {
    return this._fetch(`/api/reviews/${prId}`);
  }

  // ─── Queues ────────────────────────────────────────────────

  /** Get ready-to-merge PRs */
  async getReadyToMerge({ limit } = {}) {
    return this._fetch(`/api/queues/ready-to-merge${this._qs({ limit })}`);
  }

  /** Get action-state queue */
  async getActionState({ limit } = {}) {
    return this._fetch(`/api/queues/action-state${this._qs({ limit })}`);
  }

  // ─── Maintainers & Contributors ───────────────────────────

  /** Get maintainer rankings */
  async getMaintainers() {
    return this._fetch('/api/maintainers');
  }

  /** Get contributor stats */
  async getContributors({ limit } = {}) {
    return this._fetch(`/api/contributors${this._qs({ limit })}`);
  }

  // ─── Low-Hanging Fruit & Triage ──────────────────────────

  /** Get low-hanging fruit PRs scored for easy wins. Returns { data: [...] } */
  async getLowHangingFruit({ limit, exclude_triaged_days } = {}) {
    return this._fetch(`/api/low-hanging-fruit${this._qs({ limit, exclude_triaged_days })}`);
  }

  /** Get bot triage recommendations for a PR */
  async getBotTriage(prId) {
    return this._fetch(`/api/bot-review/triage/${prId}`);
  }

  // ─── Pick / Claim PRs (requires prs:write) ─────────────

  /** Claim a PR for triage. Returns { data: { id, title, picked_by, picked_at } } */
  async pickPR(id) {
    return this._fetch(`/api/prs/${id}/pick`, { method: 'POST' });
  }

  /** Release a claimed PR */
  async unpickPR(id) {
    return this._fetch(`/api/prs/${id}/pick`, { method: 'DELETE' });
  }

  /** Record triage (permanent breadcrumb — survives unpick). Returns { data: { id, title, triaged_by, triaged_at, triage_status } } */
  async triagePR(id, status = 'triaged') {
    return this._fetch(`/api/prs/${id}/triage`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  /** Get triage history. Returns { data: [...], count: N } */
  async getTriageHistory({ agent_id, since, limit } = {}) {
    return this._fetch(`/api/prs/triage-history${this._qs({ agent_id, since, limit })}`);
  }

  /** Resolve an alert */
  async resolveAlert(id) {
    return this._fetch(`/api/alerts/${id}/resolve`, { method: 'PUT' });
  }

  /** Update PR candidate lifecycle status */
  async updateCandidateStatus(id, status, reason) {
    return this._fetch(`/api/candidates/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  }

  // ─── CI & Bot Review ──────────────────────────────────────

  /** Get CI check snapshot for a PR. Returns { data: [...], count: N } */
  async getCIChecks(prId) {
    return this._fetch(`/api/prs/${prId}/checks`);
  }

  /** Get bot review comments for a PR */
  async getBotReviews(prId) {
    return this._fetch(`/api/bot-review/comments/${prId}`);
  }

  /** Sync bot comments from GitHub for a PR (requires ci:write) */
  async syncBotComments(prId) {
    return this._fetch(`/api/bot-review/sync/${prId}`, { method: 'POST' });
  }

  /** Classify a bot comment (requires ci:write) */
  async classifyBotComment(commentId, classification) {
    return this._fetch(`/api/bot-review/classify/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ classification }),
    });
  }

  /** Start a PR test run (requires ci:write) */
  async startPRTest(prId) {
    return this._fetch(`/api/pr-test/${prId}/start`, { method: 'POST' });
  }

  /** Cancel a PR test run (requires ci:write) */
  async cancelPRTest(prId) {
    return this._fetch(`/api/pr-test/${prId}/cancel`, { method: 'DELETE' });
  }

  // ─── Agent Messages ───────────────────────────────────────

  /** Get messages. Returns { messages: [...], count: N } */
  async getMessages({ thread_id, include_read, from_date } = {}) {
    return this._fetch(`/api/agent/messages${this._qs({ thread_id, include_read, from_date })}`);
  }

  /** Send a message to another agent */
  async sendMessage(to_agent, subject, body, { message_type, thread_id } = {}) {
    return this._fetch('/api/agent/messages', {
      method: 'POST',
      body: JSON.stringify({ to_agent, subject, body, message_type, thread_id }),
    });
  }

  /** Mark a message as read */
  async markRead(messageId) {
    return this._fetch(`/api/agent/messages/${messageId}/read`, { method: 'PUT' });
  }

  // ─── Sync ───────────────────────────────────────────────────

  /** Trigger a GitHub data sync (requires sync:trigger scope) */
  async triggerSync() {
    return this._fetch('/api/sync/trigger', { method: 'POST' });
  }

  /** Check sync progress */
  async getSyncStatus() {
    return this._fetch('/api/sync/status');
  }

  // ─── Domain Context ───────────────────────────────────────

  /** Get domain context for a PR */
  async getDomainContext(prId) {
    return this._fetch(`/api/domain-context/${prId}`);
  }

  /** Get related merged PRs */
  async getRelatedMerged(prId) {
    return this._fetch(`/api/domain-context/${prId}/related`);
  }

  // ─── x.ai Proxy (Grok access without exposing the API key) ─

  /**
   * Call x.ai API through PRmanager's proxy.
   * Will's agent gets Grok access without seeing Andrew's API key.
   *
   * @param {string} path - x.ai API path (e.g. '/v1/chat/completions')
   * @param {object} body - Request body
   * @param {object} [opts] - Additional fetch options
   * @returns {Promise<object>} x.ai API response
   *
   * Example:
   *   const resp = await client.xai('/v1/chat/completions', {
   *     model: 'grok-3',
   *     messages: [{ role: 'user', content: 'Summarize PR #33608' }],
   *   });
   */
  async xai(path, body, opts = {}) {
    return this._fetch(`/api/xai${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
      ...opts,
    });
  }

  /**
   * Chat with Grok through the proxy.
   * Convenience wrapper for x.ai chat completions.
   *
   * @param {string} message - User message
   * @param {object} [options] - { model, system, temperature, max_tokens }
   * @returns {Promise<string>} Grok's response text
   */
  async grokChat(message, { model = 'grok-3-mini', system, temperature, max_tokens } = {}) {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: message });

    const body = { model, messages };
    if (temperature !== undefined) body.temperature = temperature;
    if (max_tokens !== undefined) body.max_tokens = max_tokens;

    const resp = await this.xai('/v1/chat/completions', body);
    return resp?.choices?.[0]?.message?.content || '';
  }

  /** List available x.ai models */
  async xaiModels() {
    return this._fetch('/api/xai/v1/models');
  }

  // ─── Federation Queries (bulk data, cached) ────────────────

  /**
   * List available predefined federation queries.
   * No auth required — returns query catalogue.
   * @returns {Promise<{ queries: Array<{ name, description, ttl_seconds, default_limit, max_limit }> }>}
   */
  async listFederationQueries() {
    return this._fetch('/api/federation/queries');
  }

  /**
   * Run a named predefined federation query.
   * Results are cached server-side (TTL varies per query).
   *
   * @param {string} name - Query name (see listFederationQueries() for catalogue)
   *   - 'low_hanging_fruit'  Easy-win PRs scored 0-100, 5 min cache
   *   - 'merge_ready'        PRs ready to merge (CI pass + approved), 5 min cache
   *   - 'stale_prs'          PRs untouched for 30+ days, 5 min cache
   *   - 'needs_review'       PRs needing reviewer attention, 5 min cache
   *   - 'category_summary'   PR count by AI category, 2 min cache
   *   - 'pr_velocity'        Merge + creation rate stats, 1 min cache
   * @param {number} [limit] - Max results (default per query, max 100)
   * @returns {Promise<{ query, generated_at, cached, ttl_seconds, count, data }>}
   */
  async runFederationQuery(name, limit) {
    const qs = limit ? `?limit=${limit}` : '';
    return this._fetch(`/api/federation/queries/${name}${qs}`, { method: 'POST' });
  }
}
