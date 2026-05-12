export const ALLERGENS = [
  { code: 'g', label: 'Glutén' },
  { code: 'l', label: 'Laktóz' },
  { code: 'n', label: 'Mogyoró' },
  { code: 'e', label: 'Tojás' },
  { code: 'f', label: 'Hal' },
  { code: 's', label: 'Szója' },
  { code: 'c', label: 'Zeller' },
  { code: 'm', label: 'Mustár' },
] as const

export type AllergenCode = (typeof ALLERGENS)[number]['code']
