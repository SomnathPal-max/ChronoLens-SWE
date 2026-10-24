// ── Mock API — intercepts window.fetch ──────────────────────────────────
import type { CardData, ColumnId } from '../types';
import { getBugConfig, recordGroundTruth } from '../bugs';

// ── Seed data ────────────────────────────────────────────────────────
const SEED_CARDS: CardData[] = [
  {
    id: 'card-1',
    key: 'ENG-101',
    title: 'Design login page',
    description: 'Create wireframes and mockups for the login page and SSO federation.',
    column: 'todo',
    priority: 'high',
    assignee: 'Alice',
    tags: ['frontend', 'auth', 'design'],
    dueDate: 'Oct 28',
    storyPoints: 5,
    commentsCount: 4,
    subtasks: [
      { id: 'st-1', title: 'Wireframe mockups in Figma', completed: true },
      { id: 'st-2', title: 'OAuth2 / SAML SSO flow review', completed: false },
      { id: 'st-3', title: 'Mobile viewport responsive audit', completed: false },
    ],
  },
  {
    id: 'card-2',
    key: 'ENG-102',
    title: 'Setup CI/CD pipeline',
    description: 'Configure GitHub Actions matrix build, cache, and deploy runners.',
    column: 'todo',
    priority: 'medium',
    assignee: 'Bob',
    tags: ['devops', 'ci-cd', 'infra'],
    dueDate: 'Oct 30',
    storyPoints: 3,
    commentsCount: 2,
    subtasks: [
      { id: 'st-4', title: 'Matrix test runner setup', completed: true },
      { id: 'st-5', title: 'Docker layer cache optimization', completed: false },
    ],
  },
  {
    id: 'card-3',
    key: 'ENG-103',
    title: 'Write unit tests',
    description: 'Add Jest and Playwright E2E tests for the auth module.',
    column: 'todo',
    priority: 'low',
    assignee: 'Carol',
    tags: ['testing', 'auth'],
    dueDate: 'Nov 02',
    storyPoints: 2,
    commentsCount: 1,
    subtasks: [
      { id: 'st-6', title: 'Auth token refresh unit tests', completed: true },
      { id: 'st-7', title: 'Session revocation test cases', completed: false },
    ],
  },
  {
    id: 'card-4',
    key: 'ENG-104',
    title: 'API rate limiting',
    description: 'Implement token bucket rate limiting middleware in FastAPI gateway.',
    column: 'inprogress',
    priority: 'high',
    assignee: 'Dave',
    tags: ['backend', 'security', 'performance'],
    dueDate: 'Oct 27',
    storyPoints: 8,
    commentsCount: 6,
    subtasks: [
      { id: 'st-8', title: 'Token bucket algorithm design', completed: true },
      { id: 'st-9', title: 'Redis sliding-window backend', completed: true },
      { id: 'st-10', title: 'Load test 10k req/sec benchmark', completed: false },
    ],
  },
  {
    id: 'card-5',
    key: 'ENG-105',
    title: 'Database migration',
    description: 'Migrate user and tenant schema to PostgreSQL with zero-downtime.',
    column: 'inprogress',
    priority: 'urgent',
    assignee: 'Eve',
    tags: ['database', 'migration', 'infra'],
    dueDate: 'Oct 26',
    storyPoints: 13,
    commentsCount: 9,
    subtasks: [
      { id: 'st-11', title: 'Schema migration DDL script', completed: true },
      { id: 'st-12', title: 'Shadow traffic verification', completed: false },
    ],
  },
  {
    id: 'card-6',
    key: 'ENG-106',
    title: 'Deploy staging',
    description: 'Push latest candidate build to staging Kubernetes cluster.',
    column: 'done',
    priority: 'low',
    assignee: 'Frank',
    tags: ['k8s', 'deploy'],
    dueDate: 'Oct 24',
    storyPoints: 1,
    commentsCount: 3,
    subtasks: [
      { id: 'st-13', title: 'Helm chart revision bump', completed: true },
      { id: 'st-14', title: 'Smoke test sanity check', completed: true },
    ],
  },
  {
    id: 'card-7',
    key: 'ENG-107',
    title: 'Code review PR #42',
    description: 'Review and approve the SAM 3.1 visual regression perception engine.',
    column: 'done',
    priority: 'medium',
    assignee: 'Grace',
    tags: ['review', 'ml', 'sam'],
    dueDate: 'Oct 24',
    storyPoints: 3,
    commentsCount: 5,
    subtasks: [
      { id: 'st-15', title: 'Architecture and memory footprint review', completed: true },
      { id: 'st-16', title: 'Approve and tag milestone', completed: true },
    ],
  },
  {
    id: 'card-8',
    key: 'ENG-108',
    title: 'Redis session cache migration',
    description: 'Cluster Redis instances across regions for sub-5ms session lookup.',
    column: 'inprogress',
    priority: 'urgent',
    assignee: 'Dave',
    tags: ['infra', 'redis', 'performance'],
    dueDate: 'Oct 29',
    storyPoints: 5,
    commentsCount: 2,
    subtasks: [
      { id: 'st-17', title: 'Cross-region replication setup', completed: true },
      { id: 'st-18', title: 'Failover latency benchmarking', completed: false },
    ],
  },
  {
    id: 'card-9',
    key: 'ENG-109',
    title: 'OpenTelemetry distributed tracing',
    description: 'Instrument HTTP client, database queries, and async queues with trace headers.',
    column: 'todo',
    priority: 'high',
    assignee: 'Alice',
    tags: ['observability', 'tracing'],
    dueDate: 'Nov 04',
    storyPoints: 5,
    commentsCount: 1,
    subtasks: [
      { id: 'st-19', title: 'W3C Trace Context propagation', completed: false },
      { id: 'st-20', title: 'Jaeger visualization setup', completed: false },
    ],
  },
  {
    id: 'card-10',
    key: 'ENG-110',
    title: 'Optimize subpixel canvas rendering',
    description: 'Tune devicePixelRatio and offscreen canvas buffer for high-DPI displays.',
    column: 'done',
    priority: 'low',
    assignee: 'Grace',
    tags: ['frontend', 'graphics'],
    dueDate: 'Oct 22',
    storyPoints: 2,
    commentsCount: 0,
    subtasks: [
      { id: 'st-21', title: 'OffscreenCanvas worker rendering', completed: true },
    ],
  },
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
