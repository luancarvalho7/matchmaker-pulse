# Matchmaker Mobile Luxury Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mocked mobile-first Next.js frontend that presents the matchmaker ranking in a premium blue-and-white luxury tech interface.

**Architecture:** Use a single App Router page backed by local TypeScript mock data and decomposed UI components. Keep styling custom with CSS Modules and global variables, then layer Framer Motion animations on top of semantic React components.

**Tech Stack:** Next.js, React, TypeScript, Framer Motion, CSS Modules, Vitest, Testing Library

---

### Task 1: Scaffold the application

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Generate the Next.js TypeScript app**

Run: `npx create-next-app@latest . --ts --eslint --app --src-dir --use-npm --import-alias "@/*" --yes --no-tailwind`

- [ ] **Step 2: Verify the scaffold is healthy**

Run: `npm run lint`
Expected: ESLint completes without errors on the generated app

### Task 2: Add tests and dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/test/matchmaker-screen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create a test that renders the screen component, expects `TOTVS` to appear, and expands a ranked card to reveal at least one connection tip.

- [ ] **Step 2: Run the test to verify failure**

Run: `npm run test -- --run`
Expected: FAIL because the screen component does not exist yet

- [ ] **Step 3: Install test and animation dependencies**

Run: `npm install framer-motion lucide-react` and `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react`

- [ ] **Step 4: Run the test again after implementation**

Run: `npm run test -- --run`
Expected: PASS

### Task 3: Build the mocked data layer and screen

**Files:**
- Create: `src/data/matches.ts`
- Create: `src/components/matchmaker-screen.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the local mock data file**

Add the provided list of 20 ranked matches as a typed export.

- [ ] **Step 2: Implement the screen component**

Render the hero, metrics, top 3 cards, and full ranked list with inline expansion.

- [ ] **Step 3: Wire the page to the screen**

Keep `page.tsx` minimal and delegate visual logic to the screen component.

### Task 4: Apply the luxury tech UI and motion system

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/matchmaker-screen.module.css`

- [ ] **Step 1: Define the global color and typography system**

Create blue-and-white variables, page background effects, and base typography.

- [ ] **Step 2: Style the screen components**

Build glass cards, hero glow, ranking list, responsive layout, and expandable details.

- [ ] **Step 3: Add meaningful animation**

Use Framer Motion for staggered reveals, floating background accents, and smooth detail expansion.

### Task 5: Final validation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document how to run the mocked frontend**

Add a short README section with install, dev, test, and lint commands.

- [ ] **Step 2: Run the focused validation suite**

Run: `npm run test -- --run`
Expected: PASS

- [ ] **Step 3: Run the secondary validation**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run the app locally**

Run: `npm run dev`
Expected: Next.js starts successfully and serves the mocked matchmaker UI