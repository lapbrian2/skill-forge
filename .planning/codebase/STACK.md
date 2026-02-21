# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- TypeScript 5 - All source files, type-safe development
- JavaScript (ES2017 target) - Runtime output, Node.js compatibility

## Runtime

**Environment:**
- Node.js (via Next.js) - Server and development runtime
- Browser (React 19) - Client-side rendering

**Package Manager:**
- npm - Used for dependencies and scripts
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with API routes
- React 19.2.3 - UI library and rendering
- React DOM 19.2.3 - DOM rendering for React

**UI Components:**
- Radix UI 1.4.3 - Headless component primitives
- shadcn 3.8.5 - Component library built on Radix UI
- Lucide React 0.575.0 - Icon library
- Framer Motion 12.34.3 - Animation library for smooth interactions

**Code Editor:**
- @uiw/react-codemirror 4.25.4 - React wrapper for CodeMirror editor
- @codemirror/lang-markdown 6.5.0 - Markdown syntax highlighting
- @codemirror/lang-json 6.0.2 - JSON syntax highlighting
- @codemirror/lang-python 6.2.1 - Python syntax highlighting
- @codemirror/lang-yaml 6.1.2 - YAML syntax highlighting
- @codemirror/theme-one-dark 6.1.3 - One Dark theme for editor

**Utilities & UI Helpers:**
- Sonner 2.0.7 - Toast notification system
- cmdk 1.1.1 - Command palette component
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Classname utility
- tailwind-merge 3.5.0 - Tailwind CSS class merging

**File & Export:**
- file-saver 2.0.5 - Download spec files to user's device
- jszip 3.10.1 - ZIP file creation for project exports

**Testing & Linting:**
- ESLint 9 - Code linting and static analysis
- eslint-config-next 16.1.6 - Next.js linting rules
- TypeScript (dev) - Type checking during build

## Key Dependencies

**Critical:**
- @anthropic-ai/sdk 0.78.0 - Anthropic Claude API client. Powers all LLM calls for spec generation, discovery questions, validation, and complexity classification.

**Infrastructure:**
- Next.js 16.1.6 - Server-side API routes, server component support, and production optimization
- Tailwind CSS 4 (via @tailwindcss/postcss) - Styling framework and design system
- tw-animate-css 1.4.0 - Tailwind animation utilities

## Configuration

**Environment:**
- ANTHROPIC_API_KEY - Required. Set in `.env.local` for development and deployment. No default fallback.
- File location: `.env*` (matches `.gitignore` pattern, not committed)

**Build:**
- `next.config.ts` - Next.js configuration (minimal, no custom config)
- `tsconfig.json` - TypeScript compiler options with path alias `@/*` → `./src/*`
- `eslint.config.mjs` - ESLint configuration using new flat config format with Next.js presets
- `postcss.config.mjs` - PostCSS config with Tailwind CSS v4 plugin
- `components.json` - Component configuration (shadcn)

**Type Checking:**
- Strict mode enabled
- Target ES2017 with DOM libraries
- Module resolution: bundler (Next.js compatible)
- Path aliases: `@/*` maps to `./src/*`

## Platform Requirements

**Development:**
- Node.js 20+ (inferred from @types/node: ^20)
- npm or compatible package manager
- ANTHROPIC_API_KEY environment variable required before running `npm run dev`

**Production:**
- Vercel (detected from `.vercel/` directory and README deployment instructions)
- Node.js runtime environment (Vercel provides this)
- Environment variables must be configured in Vercel project settings
- Uses serverless functions for Next.js API routes

---

*Stack analysis: 2026-02-20*
