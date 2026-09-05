// ─── PALETA ───────────────────────────────────────────────────
// Tonuri clasice, pamantii si denim. Fara culori stridente.
export const COLOUR_GROUPS = [
  {
    group: 'Neutre',
    colours: [
      { id: 'negru',    label: 'Negru',       hex: '#0F0F0E' },
      { id: 'antracit', label: 'Antracit',    hex: '#3A3A38' },
      { id: 'gri',      label: 'Gri',         hex: '#8E8D87' },
      { id: 'gri-deschis', label: 'Gri deschis', hex: '#C4C2BA' },
      { id: 'alb',      label: 'Alb',         hex: '#FBFAF7' },
      { id: 'crem',     label: 'Crem',        hex: '#EFE7D9' },
    ],
  },
  {
    group: 'Pământii',
    colours: [
      { id: 'bej',      label: 'Bej',         hex: '#D8C9AF' },
      { id: 'nisip',    label: 'Nisip',       hex: '#C9B792' },
      { id: 'taupe',    label: 'Taupe',       hex: '#A89880' },
      { id: 'camel',    label: 'Camel',       hex: '#B08A5F' },
      { id: 'cognac',   label: 'Cognac',      hex: '#8C5A34' },
      { id: 'maro',     label: 'Maro',        hex: '#5E4433' },
      { id: 'kaki',     label: 'Kaki',        hex: '#8A8258' },
      { id: 'olive',    label: 'Olive',       hex: '#686958' },
    ],
  },
  {
    group: 'Denim & albastru',
    colours: [
      { id: 'bleumarin',    label: 'Bleumarin',    hex: '#26364F' },
      { id: 'denim',        label: 'Denim',        hex: '#4A6480' },
      { id: 'denim-deschis',label: 'Denim deschis',hex: '#8AA3BC' },
      { id: 'albastru-pal', label: 'Albastru pal', hex: '#B8C8D6' },
    ],
  },
  {
    group: 'Accente discrete',
    colours: [
      { id: 'verde-inchis', label: 'Verde închis', hex: '#3E4F42' },
      { id: 'burgundy',     label: 'Burgundy',     hex: '#5C2B32' },
      { id: 'ruginiu',      label: 'Ruginiu',      hex: '#8B5E4A' },
      { id: 'prune',        label: 'Prună',        hex: '#4A3B44' },
    ],
  },
] as const

export type Colour = { id: string; label: string; hex: string }

export const ALL_COLOURS: Colour[] = COLOUR_GROUPS.flatMap(
  g => g.colours as readonly Colour[]
)

export function colourHex(id: string): string {
  return ALL_COLOURS.find(c => c.id === id)?.hex
      ?? ALL_COLOURS.find(c => id.toLowerCase().includes(c.id))?.hex
      ?? '#C9C6BE'
}

export function colourLabel(id: string): string {
  return ALL_COLOURS.find(c => c.id === id)?.label ?? id
}

// ─── STILURI ──────────────────────────────────────────────────
export const STYLES = [
  {
    id: 'Casual',
    label: 'Casual',
    desc: 'Zi de zi, weekend, cafea cu prietenii. Confortabil, dar îngrijit.',
  },
  {
    id: 'Office',
    label: 'Office',
    desc: 'Birou, întâlniri de business, prezentări. Sobru fără să fie rigid.',
  },
  {
    id: 'Cocktail',
    label: 'Cocktail party',
    desc: 'Evenimente de seară, nunți, dineuri. Elegant, dar nu smoking.',
  },
] as const

// ─── CATEGORII ARTICOLE ───────────────────────────────────────
export const CATEGORIES = [
  { id: 'tops',        label: 'Tricouri & cămăși' },
  { id: 'bottoms',     label: 'Pantaloni & blugi' },
  { id: 'shoes',       label: 'Încălțăminte' },
  { id: 'outerwear',   label: 'Jachete & paltoane' },
  { id: 'accessories', label: 'Accesorii' },
] as const

export function categoryLabel(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.label ?? id
}

// ─── MARIMI ───────────────────────────────────────────────────
export const SIZES_TOP    = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const SIZES_BOTTOM = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60']
export const SIZES_SHOES  = ['39', '40', '41', '42', '43', '44', '45', '46']

export const OCCASIONS = [
  'Zi de zi', 'Birou', 'Weekend', 'Evenimente de seară', 'Nuntă / botez', 'Călătorii',
]
