# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Status:** Not detected

- No test runner configured (Jest, Vitest, etc.)
- No test files in `src/` directory
- No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx` files found
- `package.json` contains no testing dependencies (no jest, vitest, @testing-library, etc.)
- No test configuration files (jest.config.js, vitest.config.ts, etc.)

**Implication:** Codebase currently has no automated testing infrastructure.

## Testing Strategy

Based on code structure, here is the recommended testing approach if testing is added:

### Unit Tests (Recommended First)

**What to test:**
- `src/lib/types.ts`: Factory functions (`createProject()`, `createDiscoveryData()`, `createFeature()`)
- `src/lib/constants.ts`: Score calculation (`scoreToGrade()`)
- `src/lib/engine/complexity.ts`: `quickClassify()` function with various input patterns
- `src/lib/utils.ts`: `cn()` utility function
- `src/lib/storage.ts`: localStorage read/write operations (with localStorage mock)

**What NOT to test yet:**
- API routes (require HTTP mocking)
- React components (require React Testing Library)
- LLM client (external API)

### Integration Tests (Secondary)

**What to test:**
- API routes: Each route's action handling with various payloads
  - `src/app/api/discover/route.ts`: classify, question, brief, features, architecture actions
  - `src/app/api/generate/route.ts`: spec generation with project data
  - `src/app/api/validate/route.ts`: validation checks and scoring
- LLM client error handling and JSON parsing edge cases
- Storage persistence across read/write cycles

### E2E Tests (Future)

- Not currently applicable — requires UI automation
- Would test user flows: create project → answer questions → generate spec → validate

## Testing Patterns (When Tests Are Added)

### Factory Function Tests

```typescript
// Example pattern for src/lib/types.ts
describe('createProject', () => {
  it('should create a project with default values', () => {
    const project = createProject('Test app');

    expect(project.id).toBeDefined();
    expect(project.name).toBe('');
    expect(project.complexity).toBe('moderate');
    expect(project.current_phase).toBe('discover');
    expect(project.created_at).toBeDefined();
  });

  it('should create a project with specified complexity', () => {
    const project = createProject('Complex agent', 'complex');

    expect(project.complexity).toBe('complex');
  });

  it('should initialize discovery data structure', () => {
    const project = createProject('Test');

    expect(project.discovery.phase1).toBeDefined();
    expect(project.discovery.phase1.complete).toBe(false);
    expect(project.discovery.answers).toEqual([]);
  });
});
```

### Utility Function Tests

```typescript
// Example pattern for src/lib/utils.ts (cn function)
describe('cn', () => {
  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toContain('px-4'); // Later class wins
  });

  it('should handle conditional classes', () => {
    const result = cn('px-2', true && 'bg-red-500', false && 'bg-blue-500');
    expect(result).toContain('bg-red-500');
    expect(result).not.toContain('bg-blue-500');
  });
});
```

### Complexity Detection Tests

```typescript
// Example pattern for src/lib/engine/complexity.ts
describe('quickClassify', () => {
  it('should classify agentic projects as complex', () => {
    const result = quickClassify('An autonomous agent that uses tool use');

    expect(result.is_agentic).toBe(true);
    expect(result.complexity).toBe('complex');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should detect simple projects', () => {
    const result = quickClassify('A simple todo app');

    expect(result.complexity).toBe('simple');
  });

  it('should detect moderate complexity projects', () => {
    const result = quickClassify('A dashboard with authentication and third-party integrations');

    expect(result.complexity).toBe('moderate');
  });

  it('should default to moderate with low confidence on ambiguous input', () => {
    const result = quickClassify('An app');

    expect(result.complexity).toBe('moderate');
    expect(result.confidence).toBeLessThan(0.5);
  });
});
```

### Constants and Scoring Tests

```typescript
// Example pattern for src/lib/constants.ts
describe('scoreToGrade', () => {
  it('should return A for score >= 90', () => {
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(90)).toBe('A');
  });

  it('should return B for score >= 80 and < 90', () => {
    expect(scoreToGrade(89)).toBe('B');
    expect(scoreToGrade(80)).toBe('B');
  });

  it('should return C for score >= 70 and < 80', () => {
    expect(scoreToGrade(79)).toBe('C');
    expect(scoreToGrade(70)).toBe('C');
  });

  it('should return D for score >= 60 and < 70', () => {
    expect(scoreToGrade(69)).toBe('D');
    expect(scoreToGrade(60)).toBe('D');
  });

  it('should return F for score < 60', () => {
    expect(scoreToGrade(59)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });
});
```

### Storage Tests with Mocks

```typescript
// Example pattern for src/lib/storage.ts
describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should return empty array when no projects exist', () => {
      const projects = listProjects();
      expect(projects).toEqual([]);
    });

    it('should return projects sorted by updated_at descending', () => {
      const project1 = createProject('First');
      project1.updated_at = '2024-01-01T00:00:00Z';
      const project2 = createProject('Second');
      project2.updated_at = '2024-01-02T00:00:00Z';

      saveProject(project1);
      saveProject(project2);

      const projects = listProjects();
      expect(projects[0].id).toBe(project2.id);
      expect(projects[1].id).toBe(project1.id);
    });

    it('should return empty array when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const projects = listProjects();
      expect(projects).toEqual([]);

      global.window = originalWindow;
    });
  });

  describe('saveProject', () => {
    it('should insert new project', () => {
      const project = createProject('Test');
      saveProject(project);

      const retrieved = getProject(project.id);
      expect(retrieved?.name).toBe(project.name);
    });

    it('should update existing project', () => {
      const project = createProject('Test');
      saveProject(project);

      project.name = 'Updated';
      saveProject(project);

      const projects = listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Updated');
    });

    it('should update updated_at timestamp', () => {
      const project = createProject('Test');
      const before = new Date().toISOString();
      saveProject(project);
      const after = new Date().toISOString();

      const retrieved = getProject(project.id);
      expect(retrieved!.updated_at).toBeGreaterThanOrEqual(before);
      expect(retrieved!.updated_at).toBeLessThanOrEqual(after);
    });
  });

  describe('deleteProject', () => {
    it('should remove project by id', () => {
      const project1 = createProject('First');
      const project2 = createProject('Second');
      saveProject(project1);
      saveProject(project2);

      deleteProject(project1.id);

      const projects = listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(project2.id);
    });

    it('should handle deleting non-existent project', () => {
      saveProject(createProject('Test'));
      deleteProject('non-existent-id');

      const projects = listProjects();
      expect(projects).toHaveLength(1);
    });
  });
});
```

### API Route Tests

```typescript
// Example pattern for src/app/api/validate/route.ts
describe('POST /api/validate', () => {
  it('should return 400 if spec_content is missing', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should validate required sections', async () => {
    const spec = '## 1. Product Overview\nTest content';
    const response = await POST(
      new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        body: JSON.stringify({
          spec_content: spec,
          required_sections: [1],
        }),
      })
    );

    const json = await response.json();
    expect(json.tollgate_4.checks.some((c: any) => c.id.startsWith('section_'))).toBe(true);
  });

  it('should detect weasel words', async () => {
    const spec = 'This solution supports various features and handles different scenarios.';
    const response = await POST(
      new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        body: JSON.stringify({ spec_content: spec }),
      })
    );

    const json = await response.json();
    expect(json.tollgate_4.checks.some((c: any) =>
      c.id === 'clarity_weasel_words' && !c.passed
    )).toBe(true);
  });

  it('should detect placeholder text', async () => {
    const spec = 'Implementation: TODO - fill in later';
    const response = await POST(
      new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        body: JSON.stringify({ spec_content: spec }),
      })
    );

    const json = await response.json();
    expect(json.tollgate_5.checks.some((c: any) =>
      c.id === 'no_placeholders' && !c.passed
    )).toBe(true);
  });

  it('should calculate overall score', async () => {
    const spec = '## 1. Product Overview\n## 2. Users\n'.repeat(20); // Valid, no TODOs
    const response = await POST(
      new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        body: JSON.stringify({ spec_content: spec }),
      })
    );

    const json = await response.json();
    expect(json.overall_score).toBeGreaterThanOrEqual(0);
    expect(json.overall_score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(json.grade);
  });
});
```

## Current Testing Gaps

**Critical areas without tests:**
- `src/lib/llm/client.ts`: LLM API client, JSON parsing, error handling
- `src/lib/llm/prompts.ts`: Prompt template generation
- `src/app/api/discover/route.ts`: All action handlers
- `src/app/api/generate/route.ts`: Spec generation and counting logic
- `src/app/api/validate/route.ts`: Validation logic and scoring
- `src/components/*`: All React components
- Complex business logic: Feature generation, Architecture design

**Recommendations:**
1. Start with unit tests for `src/lib/engine/complexity.ts` (highest ROI)
2. Add tests for `src/lib/types.ts` factory functions
3. Add validation rule tests to `src/app/api/validate/route.ts`
4. Mock localStorage for storage tests
5. Later: Add API integration tests with mocked LLM responses

## Mock Setup Examples

### localStorage Mock

```typescript
// jest.setup.js or test file
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
```

### LLM Client Mock

```typescript
jest.mock('@/lib/llm/client', () => ({
  llmCall: jest.fn().mockResolvedValue({
    content: '{"complexity": "moderate"}',
    tokens_input: 100,
    tokens_output: 50,
    model: 'claude-3-sonnet',
    latency_ms: 500,
  }),
  llmCallJSON: jest.fn().mockResolvedValue({
    data: { complexity: 'moderate' },
    meta: { tokens_input: 100, tokens_output: 50, model: 'claude-3-sonnet', latency_ms: 500 },
  }),
}));
```

### NextRequest Mock

```typescript
import { NextRequest } from 'next/server';

const createRequest = (body: any = {}, options = {}) => {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
};
```

---

*Testing analysis: 2026-02-20*

**Note:** This document outlines recommended testing patterns based on code structure. No tests currently exist in the codebase. When testing infrastructure is added, follow the patterns and examples provided.
