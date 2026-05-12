import Link from 'next/link'
import { Phone, Star, Clock, Bike, MapPin, Mail, Banknote, CreditCard, ExternalLink } from 'lucide-react'

const FAVORITES = [
  {
    name: 'Öcskös kedvence',
    desc: 'Paradicsomos alap, feketeerdő sonka, jalapeno, füstölt sajt, camembert, sajt',
    price32: '4 290',
    price50: '6 980',
  },
  {
    name: 'Hori kedvence',
    desc: 'Sajtmártás alap, bacon, gyros hús, lilahagyma, kéksajt, paradicsom, sajt',
    price32: '4 290',
    price50: '6 980',
  },
  {
    name: 'Géza kedvence',
    desc: 'Bolognai ragu, gyros hús, lilahagyma, bacon, sajt',
    price32: '4 290',
    price50: '6 980',
  },
  {
    name: 'Ház kedvence',
    desc: 'Sajtmártás alap, camembert, kéksajt, feta, kolbász, paradicsomkarika, sajt',
    price32: '4 290',
    price50: '6 980',
  },
]

const FREE_ZONES = ['Pázmánd', 'Vereb', 'Kápolnásnyék', 'Velence', 'Nadap']
const PAID_ZONES = ['Lovasberény', 'Sukoró', 'Velencefürdő', 'Hajdútanya']

const HOURS = [
  { day: 'Hétfő',     summer: 'Zárva',          winter: 'Zárva' },
  { day: 'Kedd',      summer: '11:00 – 20:00',   winter: '11:00 – 19:00' },
  { day: 'Szerda',    summer: '11:00 – 20:00',   winter: '11:00 – 19:00' },
  { day: 'Csütörtök', summer: '11:00 – 20:00',   winter: '11:00 – 19:00' },
  { day: 'Péntek',    summer: '11:00 – 20:00',   winter: '11:00 – 19:00' },
  { day: 'Szombat',   summer: '11:00 – 20:00',   winter: '11:00 – 19:00' },
  { day: 'Vasárnap',  summer: 'Zárva',           winter: 'Zárva' },
]

const STATS = [
  { stat: '10 év',      label: 'családi vállalkozás' },
  { stat: '85+ étel',   label: 'pizzák, tálak, lepények' },
  { stat: '5 település', label: 'ingyenes kiszállítással' },
]

export function ZoldfeszekHome() {
  return (
    <div>

      {/* 1. STICKY NAV */}
      <nav className="sticky top-0 z-50 h-16 bg-[#1F3A23] flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-extrabold text-[#F5F1EA] tracking-wide">ZÖLDFÉSZEK</span>
          <span className="hidden sm:block font-sans text-xs text-[#F4D27A]">Pázmánd · 2016 óta</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="tel:0622419764"
            className="hidden sm:flex items-center gap-2 text-[#F5F1EA] font-sans text-sm hover:text-[#F4D27A] transition-colors"
          >
            <Phone className="h-4 w-4" strokeWidth={1.5} />
            06/22 419-764
          </a>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center bg-[#F4D27A] text-[#1F3A23] font-sans font-bold text-sm px-5 py-2 rounded-md hover:opacity-90 transition-opacity min-h-[40px]"
          >
            RENDELÉS
          </Link>
        </div>
      </nav>

      {/* 2. HERO */}
      <section className="bg-[#1F3A23] flex flex-col items-center justify-center text-center px-6 py-24 min-h-[calc(100vh-4rem)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#F4D27A]/40 bg-[#F4D27A]/10 px-4 py-1.5 mb-8">
          <span className="font-sans text-xs font-semibold tracking-widest text-[#F4D27A]">10 ÉV · 2016 — 2026</span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-[#F5F1EA] max-w-2xl leading-tight mb-6">
          Pázmánd kedvenc{' '}
          <span className="text-[#F4D27A]">pizzériája</span>
        </h1>

        <p className="font-sans text-base text-[#F5F1EA]/70 max-w-lg mb-10 leading-relaxed">
          Minőségi alapanyagok, ízletes falatok, emberes adagok. 2016 óta süt a kemence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-14">
          <Link
            href="/menu"
            className="inline-flex items-center justify-center bg-[#F4D27A] text-[#1F3A23] font-sans font-bold text-sm px-8 py-4 rounded-md hover:opacity-90 transition-opacity min-h-[52px]"
          >
            RENDELÉS INDÍTÁSA →
          </Link>
          <Link
            href="/menu#etlap"
            className="inline-flex items-center justify-center border border-[#F5F1EA]/30 text-[#F5F1EA] font-sans font-medium text-sm px-8 py-4 rounded-md hover:border-[#F5F1EA]/60 hover:bg-white/5 transition-all min-h-[52px]"
          >
            MEGNÉZEM AZ ÉTLAPOT
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#2D5233] px-4 py-2">
            <Star className="h-4 w-4 text-[#F4D27A]" strokeWidth={1.5} />
            <span className="font-sans text-xs text-[#F5F1EA]">4.4 Google</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#2D5233] px-4 py-2">
            <Clock className="h-4 w-4 text-[#F4D27A]" strokeWidth={1.5} />
            <span className="font-sans text-xs text-[#F5F1EA]">K–Szo 11–20</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#2D5233] px-4 py-2">
            <Bike className="h-4 w-4 text-[#F4D27A]" strokeWidth={1.5} />
            <span className="font-sans text-xs text-[#F5F1EA]">Ingyenes kiszállítás 5 településre</span>
          </div>
        </div>
      </section>

      {/* 3. ABOUT US */}
      <section className="bg-[#F5F1EA] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">

            <div>
              <h2 className="font-display text-4xl font-extrabold text-[#1F3A23] mb-8 leading-tight">
                10 éve süt<br />a kemencénk
              </h2>
              <div className="space-y-5">
                <p className="font-sans text-base leading-relaxed text-[#1F3A23]/75">
                  2016-ban nyitottuk meg a Zöldfészek kapuit Pázmándon. Akkor csak ketten kezdtük — egy szakács, egy ötlet, és az a meggyőződés, hogy a jó pizza nem luxuscikk, hanem a hétköznapok öröme.
                </p>
                <p className="font-sans text-base leading-relaxed text-[#1F3A23]/75">
                  Azóta is ugyanazzal a figyelemmel készítjük minden pizzát: minőségi alapanyagokból, vékony vagy vastag tésztával, ahogy a vendég kéri. Az adagjaink emberesek, az ízeink hagyományosak — pont olyanok, amilyenekért visszajársz.
                </p>
                <p className="font-sans text-base leading-relaxed text-[#1F3A23]/75">
                  Ma már 5 településre szállítunk, és továbbra is azt gondoljuk: a falu legjobb pizzája a tied is lehet, ha felemeled a telefont vagy elindítasz egy rendelést.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {STATS.map(({ stat, label }) => (
                <div key={stat} className="flex flex-col items-center text-center rounded-xl bg-[#1F3A23] p-5 sm:p-6">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4D27A] leading-none">{stat}</span>
                  <span className="mt-2 font-sans text-xs text-[#F5F1EA]/60 leading-snug">{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* 4. FAVORITES */}
      <section className="bg-[#1F3A23] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-4xl font-extrabold text-[#F5F1EA] mb-3">Helyiek kedvencei</h2>
            <p className="font-sans text-base text-[#F5F1EA]/55">
              Embereinkről elnevezve — mert ők találták ki őket
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FAVORITES.map(({ name, desc, price32, price50 }) => (
              <div
                key={name}
                className="rounded-xl border border-[#F4D27A]/20 bg-[#2D5233] p-5 flex flex-col gap-4"
              >
                <h3 className="font-display text-lg font-bold text-[#F4D27A]">{name}</h3>
                <p className="font-sans text-sm leading-relaxed text-[#F5F1EA]/75 flex-1">{desc}</p>
                <p className="font-sans text-xs text-[#F5F1EA]/45">
                  32cm · {price32} Ft · 50cm · {price50} Ft
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center border border-[#F4D27A]/50 text-[#F4D27A] font-sans font-semibold text-sm px-8 py-3.5 rounded-md hover:bg-[#F4D27A]/10 transition-colors"
            >
              TOVÁBB AZ ÉTLAPRA →
            </Link>
          </div>
        </div>
      </section>

      {/* 5. PROMOTION BANNER */}
      <section className="bg-[#F4D27A] py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-3xl font-extrabold text-[#1F3A23] mb-2">5+1 PIZZA AKCIÓ</p>
            <p className="font-sans text-base text-[#1F3A23]/75 max-w-xl leading-relaxed">
              Egyszerre 5 db 32 cm-es pizza rendelés után — ajándék salátát, lepényt, tésztát vagy pizzát küldünk!
            </p>
          </div>
          <Link
            href="/menu"
            className="shrink-0 inline-flex items-center justify-center bg-[#1F3A23] text-[#F4D27A] font-sans font-bold text-sm px-8 py-4 rounded-md hover:opacity-90 transition-opacity min-h-[52px] whitespace-nowrap"
          >
            ÉLEK A LEHETŐSÉGGEL →
          </Link>
        </div>
      </section>

      {/* 6. DELIVERY ZONES */}
      <section className="bg-[#F5F1EA] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-4xl font-extrabold text-[#1F3A23] mb-12 text-center">Hová szállítunk</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="inline-flex items-center rounded-full bg-[#5DA64B]/15 px-4 py-1.5 mb-6">
                <span className="font-sans text-xs font-bold text-[#3A7A2E] uppercase tracking-wide">
                  INGYENES KISZÁLLÍTÁS
                </span>
              </div>
              <ul className="space-y-3">
                {FREE_ZONES.map((zone) => (
                  <li key={zone} className="flex items-center gap-3 font-sans text-base text-[#1F3A23]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5DA64B] shrink-0" />
                    {zone}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="inline-flex items-center rounded-full bg-[#F4D27A]/50 px-4 py-1.5 mb-6">
                <span className="font-sans text-xs font-bold text-[#7A5E10] uppercase tracking-wide">
                  1 500 FT KISZÁLLÍTÁS
                </span>
              </div>
              <ul className="space-y-3">
                {PAID_ZONES.map((zone) => (
                  <li key={zone} className="flex items-center gap-3 font-sans text-base text-[#1F3A23]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C9A840] shrink-0" />
                    {zone}
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-sans text-xs text-[#1F3A23]/45">Minimum rendelés: 10 000 Ft</p>
            </div>
          </div>

          <p className="mt-10 text-center font-sans text-sm text-[#1F3A23]/55">
            Kérdés a kiszállítással? Hívj minket:{' '}
            <a href="tel:0622419764" className="text-[#1F3A23] font-semibold hover:underline">
              06/22 419-764
            </a>
          </p>
        </div>
      </section>

      {/* 7. OPENING HOURS + CONTACT */}
      <section className="bg-[#1F3A23] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

            {/* Hours */}
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#F5F1EA] mb-8 tracking-wide">
                NYITVATARTÁS
              </h2>
              <div className="space-y-3">
                {HOURS.map(({ day, summer, winter }) => (
                  <div
                    key={day}
                    className="flex items-start justify-between gap-4 border-b border-[#F5F1EA]/10 pb-3 last:border-0"
                  >
                    <span className="font-sans text-sm font-medium text-[#F5F1EA] w-28 shrink-0">{day}</span>
                    <div className="text-right">
                      {summer === 'Zárva' ? (
                        <span className="font-sans text-sm text-[#F5F1EA]/35">Zárva</span>
                      ) : (
                        <>
                          <p className="font-sans text-sm text-[#F5F1EA]/80">
                            {summer}{' '}
                            <span className="text-[#F4D27A]/50 text-xs">(nyári)</span>
                          </p>
                          <p className="font-sans text-xs text-[#F5F1EA]/45 mt-0.5">
                            {winter}{' '}
                            <span className="text-[#F4D27A]/35 text-xs">(téli)</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#F5F1EA] mb-8 tracking-wide">
                KAPCSOLAT
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-[#F4D27A] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="font-sans text-sm text-[#F5F1EA]/75">
                    Pázmánd, Deák Ferenc utca 54
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-[#F4D27A] shrink-0" strokeWidth={1.5} />
                  <a
                    href="tel:0622419764"
                    className="font-sans text-sm text-[#F5F1EA]/75 hover:text-[#F4D27A] transition-colors"
                  >
                    06/22 419-764
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-[#F4D27A] shrink-0" strokeWidth={1.5} />
                  <a
                    href="mailto:klujber69@gmail.com"
                    className="font-sans text-sm text-[#F5F1EA]/75 hover:text-[#F4D27A] transition-colors"
                  >
                    klujber69@gmail.com
                  </a>
                </div>
                <div className="pt-1">
                  <a
                    href="#"
                    className="inline-flex items-center gap-3 border border-[#F5F1EA]/20 rounded-md px-5 py-3 font-sans text-sm text-[#F5F1EA] hover:border-[#F4D27A]/50 hover:text-[#F4D27A] transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                    KÖVESS MINKET A FACEBOOKON →
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. PAYMENT METHODS */}
      <section className="bg-[#F5F1EA] py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-5">
          <p className="font-sans text-sm text-[#1F3A23]/50 font-medium uppercase tracking-widest">
            Elfogadunk:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2.5 rounded-full border border-[#1F3A23]/12 bg-white px-6 py-2.5 shadow-sm">
              <Banknote className="h-4 w-4 text-[#1F3A23]/70" strokeWidth={1.5} />
              <span className="font-sans text-sm text-[#1F3A23]">Készpénz</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-[#1F3A23]/12 bg-white px-6 py-2.5 shadow-sm">
              <CreditCard className="h-4 w-4 text-[#1F3A23]/70" strokeWidth={1.5} />
              <span className="font-sans text-sm text-[#1F3A23]">Bankkártya</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-[#1F3A23]/12 bg-white px-6 py-2.5 shadow-sm">
              <CreditCard className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
              <span className="font-sans text-sm text-[#1F3A23]">OTP SZÉP kártya</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="bg-[#1F3A23] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-display text-3xl font-extrabold text-[#F5F1EA] mb-4 md:text-4xl leading-tight">
            Készen állsz a rendelésre?
          </h2>
          <p className="font-sans text-base text-[#F4D27A] mb-10">
            Pár kattintás, és már jön is.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center bg-[#F4D27A] text-[#1F3A23] font-sans font-bold text-sm px-10 py-5 rounded-md hover:opacity-90 transition-opacity min-h-[56px]"
          >
            INDÍTOM A RENDELÉST →
          </Link>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-[#0F2012] py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4">
          <p className="font-sans text-sm text-[#F5F1EA]/35 text-center">
            © Zöldfészek Pizzéria · 2016–2026 · Minden jog fenntartva
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/terms" className="font-sans text-xs text-[#F5F1EA]/30 hover:text-[#F5F1EA]/60 transition-colors">
              ÁSZF
            </Link>
            <Link href="/privacy" className="font-sans text-xs text-[#F5F1EA]/30 hover:text-[#F5F1EA]/60 transition-colors">
              Adatvédelem
            </Link>
            <Link href="/admin/login" className="font-sans text-xs text-[#F5F1EA]/30 hover:text-[#F5F1EA]/60 transition-colors">
              Admin
            </Link>
          </div>
          <p className="font-sans text-xs text-[#F5F1EA]/18">
            Powered by TableOS · domrol.com
          </p>
        </div>
      </footer>

    </div>
  )
}
