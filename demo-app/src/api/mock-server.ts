// ── Mock API — intercepts window.fetch ──────────────────────────────────
import type { CardData, ColumnId } from '../types';
import { getBugConfig, recordGroundTruth } from '../bugs';

// ── Seed data ────────────────────────────────────────────────────────
const SEED_CARDS: CardData[] = [
  { id: 'card-1', title: 'Design login page', description: 'Create wireframes and mockups for the login page.', column: 'todo', priority: 'high', assignee: 'Alice' },
  { id: 'card-2', title: 'Setup CI/CD pipeline', description: 'Configure GitHub Actions for build and deploy.', column: 'todo', priority: 'medium', assignee: 'Bob' },
  { id: 'card-3', title: 'Write unit tests', description: 'Add Jest tests for the auth module.', column: 'todo', priority: 'low', assignee: 'Carol' },
  { id: 'card-4', title: 'API rate limiting', description: 'Implement rate limiting middleware.', column: 'inprogress', priority: 'high', assignee: 'Dave' },
  { id: 'card-5', title: 'Database migration', description: 'Migrate user table to new schema.', column: 'inprogress', priority: 'medium', assignee: 'Eve' },
  { id: 'card-6', title: 'Deploy staging', description: 'Push latest build to staging environment.', column: 'done', priority: 'low', assignee: 'Frank' },
  { id: 'card-7', title: 'Code review PR #42', description: 'Review and approve the feature branch.', column: 'done', priority: 'medium', assignee: 'Grace' },
];

// Server-side state (the "database")
let serverCards: CardData[] = JSON.parse(JSON.stringify(SEED_CARDS));

function cloneCards(): CardData[] {
  return JSON.parse(JSON.stringify(serverCards));
}

// ── Helpers ──────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Route handlers ──────────────────────────────────────────────────
async function handleGetCards(): Promise<Response> {
  await delay(80); // small realistic latency
  return jsonResponse(cloneCards());
}

async function handleMoveCard(id: string, body: { column: ColumnId }): Promise<Response> {
  const cfg = getBugConfig();

  if (cfg.bug1) {
    // BUG 1: Race condition — respond with the PREVIOUS state after 800ms
    const staleSnapshot = cloneCards(); // snapshot BEFORE the move

    // Actually do the move on the server side (so subsequent GETs are correct)
    const card = serverCards.find((c) => c.id === id);
    if (!card) return jsonResponse({ error: 'Card not found' }, 404);
    card.column = body.column;

    await delay(800); // seeded latency

    // Record ground truth
    recordGroundTruth({
      bug: 1,
      type: 'race-snapback',
      element: id,
      description: 'Stale response overwrote optimistic move',
    });

    // Return the STALE snapshot — this overwrites the optimistic update
    return jsonResponse(staleSnapshot);
  }

  // Normal (no-bug) path
  const card = serverCards.find((c) => c.id === id);
  if (!card) return jsonResponse({ error: 'Card not found' }, 404);
  card.column = body.column;
  await delay(80);
  return jsonResponse(cloneCards());
}

// ── Fetch interceptor ───────────────────────────────────────────────
const _originalFetch = window.fetch.bind(window);

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || 'GET').toUpperCase();

  // GET /api/cards
  if (method === 'GET' && /\/api\/cards\/?$/.test(url)) {
    return handleGetCards();
  }

  // POST /api/cards/:id/move
  const moveMatch = url.match(/\/api\/cards\/([^/]+)\/move\/?$/);
  if (moveMatch && method === 'POST') {
    const id = moveMatch[1];
    const body = init?.body ? JSON.parse(init.body as string) : {};
    return handleMoveCard(id, body);
  }

  // Fall through to real fetch
  return _originalFetch(input, init);
}

export function installMockServer(): void {
  window.fetch = mockFetch as typeof window.fetch;
}

export function resetServerState(): void {
  serverCards = JSON.parse(JSON.stringify(SEED_CARDS));
}
