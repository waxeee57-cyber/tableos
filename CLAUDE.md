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
