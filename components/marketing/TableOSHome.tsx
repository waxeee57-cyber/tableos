import type { CSSProperties } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, PhoneOff, EyeOff, Layers,
         UtensilsCrossed, Coffee, Star, Truck, Package,
         Building2, Zap, Monitor, FileSpreadsheet, MapPin,
         ShoppingBag, Mail, Smartphone, Palette } from 'lucide-react'

const PAIN_CARDS = [
  {
    Icon: PhoneOff,
    tag: 'Telefonos rendelés',
    headline: 'Rendelések vesznek el a telefonban',
    copy: 'Félrehallott cím, elveszett cetli, dupla rendelés. Csúcsforgalomban minden percben egy hiba.',
  },
  {
    Icon: EyeOff,
    tag: 'Konyhai kommunikáció',
    headline: 'A konyha nem tudja mi jön',
    copy: 'A futár vár az ajtóban. A konyha még el sem kezdte. Nincs rendszer — csak kiabálás.',
  },
  {
    Icon: Layers,
    tag: 'Szétszórt eszközök',
    headline: 'Minden máshol van',
    copy: 'Wolt itt, telefon ott, helyi rendelés egy füzetben. Három csatorna, egy állandó káosz.',
  },
]

const FOR_WHO = [
  { Icon: UtensilsCrossed, label: 'Pizzéria és gyorsétterem', body: 'Magas forgalom, gyors kiszállítás, sok egyidejű rendelés. Minden rendelés követhető, a konyha mindig képben van.' },
  { Icon: Coffee, label: 'Kávézó és bisztró', body: 'Helyi rendelés, elvitel, esetleg kiszállítás. Egyszerű kezelés, átlátható admin.' },
  { Icon: Star, label: 'Fine dining', body: 'Asztali rendelések, hosszabb előkészítési idők. A konyha tudja, mi mikor kell.' },
  { Icon: Truck, label: 'Food truck', body: 'Elvitel és helyi kiszállítás kombinálva. Mobilon kezelhető, bárhonnan.' },
  { Icon: Package, label: 'Ghost kitchen', body: 'Csak kiszállítás, nincs vendégtér. Teljes fókusz a rendelésteljesítésen.' },
  { Icon: Building2, label: 'Étterem lánc', body: 'Több helyszín, egy admin. Mindenhol ugyanaz a rendszer, mindenhol átlátható.' },
]

const FEATURES = [
  'Valós idejű rendeléskezelés',
  'Konyhai kijelző (Kitchen Display)',
  'CSV étlap import (100+ tétel)',
  'Kiszállítási zónák és díjak',
  'Elvitel + helyi rendelés',
  'Automatikus email értesítések',
  'Mobil-optimalizált felület',
  'Fehér-label — saját domain, saját brand',
]

const PRICING = [
  {
    name: 'Starter',
    price: '€29',
    cadence: '/ hó',
    lines: ['14 napos ingyenes próba', '1 helyszín', 'Kiszállítás + elvitel', 'Email értesítések', 'Nincs beállítási díj'],
    cta: 'Kezdem ingyen',
    href: '/admin/login',
    accent: false,
  },
  {
    name: 'Growth',
    price: '€59',
    cadence: '/ hó',
    lines: ['Minden a Starterből', 'Kitchen Display', 'CSV étlap import', 'Kiszállítási zónák', 'Prioritásos support'],
    cta: 'Kezdem ingyen',
    href: '/admin/login',
    accent: true,
  },
  {
    name: 'Pro',
    price: '€99',
    cadence: '/ hó',
    lines: ['Minden a Growth-ból', 'Több helyszín', 'Dedikált support', 'Egyedi fejlesztés lehetséges'],
    cta: 'Kapcsolatba lépek',
    href: 'mailto:hello@domrol.com',
    accent: false,
  },
]

const FAQ_ITEMS = [
  { q: 'Milyen technikára van szükség?', a: 'Semmire a te oldaladról. Mi telepítünk, konfigurálunk, te csak az admin panelt használod.' },
  { q: 'Több étteremhez is megfelel?', a: 'Igen. Minden étterem saját Vercel deploy-t kap, saját domainnel. A kódbázis ugyanaz, a konfiguráció egyedi.' },
  { q: 'Van demó?', a: 'Igen — látogasd meg a /menu oldalt egy élő rendelési felület megtekintéséhez.' },
  { q: 'Mennyi idő a bevezetés?', a: 'Egy nap alatt live vagy. CSV importtal az étlap feltölthető, az admin azonnal használható.' },
  { q: 'Mi van, ha bővíteni akarok?', a: 'Válthat magasabb csomagra bármikor. Nincs szerződéses kötöttség.' },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = { Zap, Monitor, FileSpreadsheet, MapPin, ShoppingBag, Mail, Smartphone, Palette }

export function TableOSHome() {
  return (
    <div className="min-h-screen bg-white">

      {/* Scroll toast — decorative, aria-hidden */}
      <div aria-hidden="true" className="hero-scroll-toast select-none">
        <div className="flex items-center gap-2.5 rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
          <span className="font-sans text-[11px] font-semibold text-white/90">
            Új rendelés · Margarita × 2 · 4 200 Ft
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="hero-dark text-white flex min-h-[calc(100vh-4rem)] flex-col justify-center px-6 py-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[2fr_3fr] xl:gap-10">

            {/* Left */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-brand-500" />
                <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-white/50">TableOS</span>
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-[1.06] tracking-[-0.025em] text-white sm:text-5xl">
                Minden rendelés, kézben tartva.{' '}
                <span className="text-white/75">Minden vendég, kiszolgálva.</span>
              </h1>
              <p className="max-w-[30rem] font-sans text-base leading-relaxed text-white/65">
                Kiszállítástól a konyhai kijelzőig — egy rendszerben. Bármilyen vendéglátóegységhez, percek alatt bevezethető.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href="/menu" className="btn-3d inline-flex items-center justify-center min-h-[44px] rounded-md bg-brand px-7 py-3 font-sans text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                  Megnézem élőben →
                </a>
                <a href="mailto:hello@domrol.com" className="inline-flex items-center justify-center min-h-[44px] rounded-md border border-white/20 px-7 py-3 font-sans text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/5">
                  Kapcsolat
                </a>
              </div>
              <span className="font-sans text-xs text-white/20 pointer-events-none select-none">
                ↗ Hamarosan élőben: Zöldfészek Pizzéria · Pázmánd
              </span>
            </div>

            {/* Right — mock kitchen display */}
            <div aria-hidden="true" className="admin-mock-tilt hidden lg:block">
              <div className="rounded-xl border border-white/10 bg-slate-800 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/50">Konyhai kijelző</span>
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span className="font-sans text-[11px] text-white/40">3 aktív rendelés</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-white/40">Új</span>
                      <span className="animate-pulse rounded-sm bg-brand-500 px-1.5 py-0.5 font-sans text-[10px] font-bold text-white">2</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="rounded-lg border-l-2 border-brand-500 bg-slate-700/60 p-3">
                        <p className="font-sans text-xs font-bold text-white">ZO-001</p>
                        <p className="font-sans text-[11px] text-white/50">Margarita 32cm × 2</p>
                        <p className="font-sans text-[11px] text-white/50">Paradicsomos × 1</p>
                        <p className="mt-1.5 font-sans text-[10px] text-white/30">3 perce</p>
                      </div>
                      <div className="rounded-lg border-l-2 border-brand-500 bg-slate-700/60 p-3">
                        <p className="font-sans text-xs font-bold text-white">ZO-002</p>
                        <p className="font-sans text-[11px] text-white/50">Hawaii 50cm × 1</p>
                        <p className="mt-1.5 font-sans text-[10px] text-white/30">2 perce</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">
                      <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-white/40">Készül</span>
                    </div>
                    <div className="rounded-lg border-l-2 border-amber-400 bg-slate-700/60 p-3">
                      <p className="font-sans text-xs font-bold text-white">ZO-003</p>
                      <p className="font-sans text-[11px] text-white/50">Vegetáriánus × 1</p>
                      <p className="font-sans text-[11px] text-white/50">Saláta × 2</p>
                      <p className="mt-1.5 font-sans text-[10px] text-white/30">7 perce</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">
                      <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-white/40">Kész ✓</span>
                    </div>
                    <div className="rounded-lg border-l-2 border-emerald-400 bg-slate-700/60 p-3">
                      <p className="font-sans text-xs font-bold text-white">ZO-004</p>
                      <p className="font-sans text-[11px] text-white/50">Sonkás × 3</p>
                      <p className="mt-1.5 font-sans text-[10px] text-white/30">12 perce</p>
                      <span className="mt-2 inline-block rounded-sm bg-emerald-500/20 px-1.5 py-0.5 font-sans text-[10px] text-emerald-400">Kész</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="mt-10 flex justify-center lg:justify-start">
            <a href="#problem" aria-label="Scroll to problem section" className="text-white/20 transition-colors hover:text-white/50">
              <ArrowRight className="h-5 w-5 rotate-90" />
            </a>
          </div>
        </div>
      </section>

      {/* PAIN */}
      <section id="problem" className="bg-gray-50 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-brand">A probléma</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Ismerős?</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PAIN_CARDS.map(({ Icon, tag, headline, copy }, i) => (
              <div key={tag} className="card-3d card-stagger flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" style={{ '--stagger': i } as CSSProperties}>
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-5 w-5 text-brand shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="rounded-sm border border-brand/20 bg-brand/5 px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.15em] text-brand/80 text-right">{tag}</span>
                </div>
                <div>
                  <h3 className="mb-2 font-display text-xl font-bold text-gray-900">{headline}</h3>
                  <p className="font-sans text-sm leading-relaxed text-muted">{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-14 text-center font-display text-2xl font-bold text-brand md:text-3xl">
            A TableOS ezt mind megoldja.
          </p>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-brand">Kinek való</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Minden vendéglátónak</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {FOR_WHO.map(({ Icon, label, body }, i) => (
              <div key={label} className="card-3d card-stagger flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" style={{ '--stagger': i } as CSSProperties}>
                <Icon className="h-5 w-5 text-brand" strokeWidth={1.5} />
                <div>
                  <h3 className="mb-1.5 font-display text-lg font-bold text-gray-900">{label}</h3>
                  <p className="font-sans text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-brand">Hogyan működik</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Három lépés az induláshoz</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { n: '1', title: 'Beállítod az étlapot', body: 'CSV import vagy kézi rögzítés. Akár 100+ tétel percek alatt. Kategóriák, méretek, allergenek, képek.' },
              { n: '2', title: 'Vendégeid rendelnek', body: 'Saját, branded rendelési oldalon. Mobilon tökéletesen. Kiszállítás, elvitel, helyi rendelés — amit engedélyezel.' },
              { n: '3', title: 'Te kezeled, a konyha látja', body: 'Valós idejű admin és konyhai kijelző egyszerre. Minden rendelés státusza egy helyen.' },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex flex-col gap-4">
                <span className="font-display text-5xl font-extrabold text-brand/20">{n}</span>
                <h3 className="font-display text-xl font-bold text-gray-900">{title}</h3>
                <p className="font-sans text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-brand">Mit kapsz</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Minden, ami kell az induláshoz</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-brand/30 bg-brand/10">
                  <Check className="h-3 w-3 text-brand" />
                </div>
                <span className="font-sans text-sm leading-relaxed text-muted">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="bg-slate-900 py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold text-white">Készen állsz az indulásra?</p>
            <p className="font-sans text-sm text-slate-400 mt-1">14 napos ingyenes próba. Nincs kártyaadat.</p>
          </div>
          <a href="/admin/login" className="btn-3d shrink-0 inline-flex items-center justify-center min-h-[44px] rounded-md bg-brand px-6 py-3 font-sans text-sm font-medium text-white">
            Kipróbálom →
          </a>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-slate-900 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-brand">Árazás</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">Átlátható árazás</h2>
            <p className="mt-3 font-sans text-sm text-slate-400">14 napos ingyenes próba, kötöttség nélkül.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
            {PRICING.map(({ name, price, cadence, lines, cta, href, accent }) => (
              <div key={name} className={`flex flex-col rounded-xl border bg-white shadow-sm ${accent ? 'border-2 border-brand relative z-10 p-10 shadow-2xl shadow-brand/15' : 'border-gray-200 p-8'}`}>
                {accent && (
                  <div className="mb-4 self-start">
                    <span className="rounded-sm bg-brand px-3 py-1 font-sans text-[10px] uppercase tracking-[0.15em] text-white">Legnépszerűbb</span>
                  </div>
                )}
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted">{name}</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-gray-900">{price}</span>
                  <span className="font-sans text-sm text-muted">{cadence}</span>
                </div>
                <ul className="my-8 flex flex-1 flex-col gap-3">
                  {lines.map((line) => (
                    <li key={line} className="flex items-center gap-2.5">
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <span className="font-sans text-sm text-muted">{line}</span>
                    </li>
                  ))}
                </ul>
                <a href={href} className={`inline-flex items-center justify-center rounded-md px-6 py-3 font-sans text-xs uppercase tracking-[0.1em] transition-colors ${accent ? 'bg-brand text-white hover:opacity-90' : 'border border-border text-muted hover:border-brand/40 hover:text-gray-900'}`}>
                  {cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-14">
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-brand">Kérdések</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">GYIK</h2>
          </div>
          <div className="divide-y divide-border">
            {FAQ_ITEMS.map(({ q, a }) => (
              <details key={q} className="faq-item group">
                <summary className="flex items-center justify-between gap-4 py-7 font-sans text-sm font-medium text-gray-900 transition-colors hover:text-brand focus-visible:outline-none focus-visible:text-brand">
                  {q}
                  <span className="faq-icon text-brand text-lg">+</span>
                </summary>
                <div className="faq-body">
                  <div>
                    <p className="pb-7 font-sans text-sm leading-relaxed text-muted">{a}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-8 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Készen állsz az első rendelésre?
          </h2>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="/admin/login" className="btn-3d inline-flex items-center justify-center min-h-[44px] rounded-md bg-brand px-8 py-4 font-sans text-sm font-medium text-white">
              Kipróbálom ingyen →
            </a>
            <a href="mailto:hello@domrol.com" className="btn-3d inline-flex items-center justify-center min-h-[44px] rounded-md border border-white/20 px-8 py-4 font-sans text-sm font-medium text-white hover:border-white/40 hover:bg-white/5">
              Kapcsolat
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-sans text-sm text-muted">TableOS · egy Domrol termék</span>
          <div className="flex gap-6">
            <Link href="/terms" className="font-sans text-sm text-muted hover:text-gray-900">Feltételek</Link>
            <Link href="/privacy" className="font-sans text-sm text-muted hover:text-gray-900">Adatvédelem</Link>
            <Link href="/admin/login" className="font-sans text-sm text-muted hover:text-gray-900">Bejelentkezés</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
