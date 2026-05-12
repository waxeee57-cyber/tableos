# TableOS — Project Context

## What this is
White-label restaurant ordering and management SaaS.
Online menu, ordering (delivery + takeaway + dine-in),
table management, kitchen display, admin panel.

Part of the Domrol platform (domrol.com).
Sister product to RentalOS (rental bookings).

## Stack
Next.js 15/16 App Router · TypeScript · Tailwind CSS v4
Supabase (auth + db + storage + realtime) · Resend · Stripe · Vercel

## Commands
npm run dev — local development
npm run build — production build (must be 0 errors)
npm run lint — ESLint check

## Architecture
Single-tenant per Vercel deployment (one restaurant = one deploy).
business_config table: all white-label customisation.
Graceful degradation if Stripe/Resend env vars missing.

Route groups:
  app/(public)/ — customer-facing pages (/, /order/[id], /terms, /privacy)
  app/(admin)/ — admin panel (/admin/*)
  app/api/ — API routes

## Key principle
Works for ANY food business — from a delivery-only pizzeria
to a 50-table fine dining restaurant. Features toggle based
on business_config settings, not on code branches.

## Key files
lib/config.ts — business_config reader with 60s cache + isOpen()
lib/auth.ts — requireAdmin() for server components, requireAdminForAPI() for routes
lib/rate-limit.ts — in-memory rate limiter
types/index.ts — all shared TypeScript types
contexts/CartContext.tsx — client-side cart state (localStorage)

---

## Team Workflow (added 2026-05-12)

This project is co-developed by Roland and Dominik. The rules 
below define how commits and branches must be managed. Read 
these rules at the start of every session.

### Branch rules (NON-NEGOTIABLE)

NEVER commit directly to `main`. Always work on a feature branch.

Before starting any work:
1. Run `git branch --show-current`
2. If the result is `main`: create a new branch BEFORE writing any code:
   - Bug fix: `git checkout -b fix/<short-description>`
   - New feature: `git checkout -b feature/<short-description>`
   - Refactor: `git checkout -b refactor/<short-description>`
   - Docs only: `git checkout -b docs/<short-description>`
3. If already on a feature branch: pull latest main first:
   `git fetch origin main && git rebase origin/main`

After completing work:
1. Verify build still passes: `pnpm build` (must report 0 errors)
2. Stage and commit: `git add . && git commit -m "<message>"`
3. Push the branch: `git push -u origin <branch-name>`
4. Open a PR via GitHub web UI
5. DO NOT auto-merge. Wait for human review.

### Commit message format

Pattern: `<type>: <short description>`

Allowed types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`

Examples:
- `feat: add print button to order cards`
- `fix: kitchen display missing new orders column`
- `docs: update HANDOFF.md with Zöldfészek client details`
- `chore: bump @types/node to 20.19.40`

Keep the message under 72 characters total.

### STATUS.md coordination

Before starting any work, read STATUS.md in the repo root.
It tracks who is currently working on what.

If your assigned task touches files or feature areas that 
another team member is actively working on (per STATUS.md), 
STOP. Report the conflict to the user. Do not proceed until 
the user resolves it.

When you start a task, update STATUS.md to claim your work area.
When the work is merged to main, clear your entry.
