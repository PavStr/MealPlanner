import { db } from '../db/db'
import type { Ingredient } from '../db/types'

// ---------------------------------------------------------------------------
// Ingredient template definition
// ---------------------------------------------------------------------------

interface IngredientTemplate {
  canonical_name: string
  normalized_name: string   // base form — used for similarity matching
  ingredient_family: string // culinary family — used for family-level matching
  category: string
  default_unit?: string
}

// ---------------------------------------------------------------------------
// Similarity weight constants
// Centralised here so they stay in sync with recommender.ts
// ---------------------------------------------------------------------------

export const SIMILARITY_WEIGHTS = {
  exact: 1.0,       // same ingredient_id
  normalized: 0.8,  // different ingredient_id, same normalized_name (e.g. rødløk → løk)
  family: 0.4,      // same ingredient_family, different normalized_name (e.g. brokkoli vs blomkål)
  new_penalty: 0.9, // multiplied by new-ingredient ratio to penalise shopping basket growth
}

// ---------------------------------------------------------------------------
// Norwegian ingredient library
// Each entry maps a specific ingredient form to a normalized base and family.
// The recommender uses normalized_name + ingredient_family for overlap scoring.
// ---------------------------------------------------------------------------

export const NORWEGIAN_INGREDIENTS: IngredientTemplate[] = [
  // ── Alliums ──────────────────────────────────────────────────────────────
  { canonical_name: 'løk',          normalized_name: 'løk',          ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'gul løk',      normalized_name: 'løk',          ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'rødløk',       normalized_name: 'løk',          ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'sjalottløk',   normalized_name: 'sjalottløk',   ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'vårløk',       normalized_name: 'vårløk',       ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'hvitløk',      normalized_name: 'hvitløk',      ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'fedd' },
  { canonical_name: 'purre',        normalized_name: 'purre',        ingredient_family: 'allium',        category: 'Grønnsaker',      default_unit: 'stk' },

  // ── Rotgrønnsaker ─────────────────────────────────────────────────────────
  { canonical_name: 'gulrot',        normalized_name: 'gulrot',       ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'potet',         normalized_name: 'potet',        ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'søtpotet',      normalized_name: 'søtpotet',     ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'sellerirot',    normalized_name: 'sellerirot',   ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'pastinakk',     normalized_name: 'pastinakk',    ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'persillerot',   normalized_name: 'persillerot',  ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'rødbete',       normalized_name: 'rødbete',      ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'kålrabi',       normalized_name: 'kålrabi',      ingredient_family: 'rotgrønnsak',  category: 'Grønnsaker',      default_unit: 'stk' },

  // ── Kålvekster ───────────────────────────────────────────────────────────
  { canonical_name: 'brokkoli',      normalized_name: 'brokkoli',     ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'blomkål',       normalized_name: 'blomkål',      ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'stk' },
  { canonical_name: 'kål',           normalized_name: 'kål',          ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'rødkål',        normalized_name: 'rødkål',       ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'grønnkål',      normalized_name: 'grønnkål',     ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'rosenkål',      normalized_name: 'rosenkål',     ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'kinakål',       normalized_name: 'kinakål',      ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'g' },
  { canonical_name: 'pak choi',      normalized_name: 'pak choi',     ingredient_family: 'kålvekst',     category: 'Grønnsaker',      default_unit: 'stk' },

  // ── Nattskyggefamilien ────────────────────────────────────────────────────
  { canonical_name: 'tomat',         normalized_name: 'tomat',        ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'cherrytomater', normalized_name: 'tomat',        ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'paprika',       normalized_name: 'paprika',      ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'rød paprika',   normalized_name: 'paprika',      ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'gul paprika',   normalized_name: 'paprika',      ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'grønn paprika', normalized_name: 'paprika',      ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'aubergine',     normalized_name: 'aubergine',    ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'chili',         normalized_name: 'chili',        ingredient_family: 'nattskyggefamilien', category: 'Grønnsaker', default_unit: 'stk' },

  // ── Tomater (hermetisk) ────────────────────────────────────────────────────
  { canonical_name: 'hermetiske tomater', normalized_name: 'hermetiske tomater', ingredient_family: 'tomatprodukt', category: 'Hermetikk', default_unit: 'g' },
  { canonical_name: 'hakkede tomater',    normalized_name: 'hermetiske tomater', ingredient_family: 'tomatprodukt', category: 'Hermetikk', default_unit: 'g' },
  { canonical_name: 'tomatpuré',          normalized_name: 'tomatpuré',          ingredient_family: 'tomatprodukt', category: 'Hermetikk', default_unit: 'ss' },
  { canonical_name: 'soltørket tomat',    normalized_name: 'soltørket tomat',    ingredient_family: 'tomatprodukt', category: 'Hermetikk', default_unit: 'g' },

  // ── Gresskar og squash ─────────────────────────────────────────────────────
  { canonical_name: 'squash',        normalized_name: 'squash',       ingredient_family: 'gresskarvekst', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'gresskar',      normalized_name: 'gresskar',     ingredient_family: 'gresskarvekst', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'agurk',        normalized_name: 'agurk',        ingredient_family: 'gresskarvekst', category: 'Grønnsaker', default_unit: 'stk' },

  // ── Bladgrønnsaker ────────────────────────────────────────────────────────
  { canonical_name: 'spinat',        normalized_name: 'spinat',       ingredient_family: 'bladgrønnsak', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'bladsalat',     normalized_name: 'bladsalat',    ingredient_family: 'bladgrønnsak', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'ruccola',       normalized_name: 'ruccola',      ingredient_family: 'bladgrønnsak', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'mangold',       normalized_name: 'mangold',      ingredient_family: 'bladgrønnsak', category: 'Grønnsaker', default_unit: 'g' },

  // ── Sopp ─────────────────────────────────────────────────────────────────
  { canonical_name: 'sjampinjong',   normalized_name: 'sjampinjong',  ingredient_family: 'sopp', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'sopp',          normalized_name: 'sopp',         ingredient_family: 'sopp', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'kantarell',     normalized_name: 'kantarell',    ingredient_family: 'sopp', category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'portobello',    normalized_name: 'portobello',   ingredient_family: 'sopp', category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'shiitake',      normalized_name: 'shiitake',     ingredient_family: 'sopp', category: 'Grønnsaker', default_unit: 'g' },

  // ── Andre grønnsaker ─────────────────────────────────────────────────────
  { canonical_name: 'fennikel',      normalized_name: 'fennikel',     ingredient_family: 'grønnsak',     category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'selleri',       normalized_name: 'selleri',      ingredient_family: 'grønnsak',     category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'asparges',      normalized_name: 'asparges',     ingredient_family: 'grønnsak',     category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'erter',         normalized_name: 'erter',        ingredient_family: 'belgfrukt',    category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'bønner',        normalized_name: 'bønner',       ingredient_family: 'belgfrukt',    category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'mais',          normalized_name: 'mais',         ingredient_family: 'grønnsak',     category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'avokado',       normalized_name: 'avokado',      ingredient_family: 'grønnsak',     category: 'Grønnsaker', default_unit: 'stk' },
  { canonical_name: 'ingefær',       normalized_name: 'ingefær',      ingredient_family: 'krydderrot',   category: 'Grønnsaker', default_unit: 'g' },

  // ── Urter (friske) ────────────────────────────────────────────────────────
  { canonical_name: 'persille',      normalized_name: 'persille',     ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'dill',          normalized_name: 'dill',         ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'basilikum',     normalized_name: 'basilikum',    ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'koriander',     normalized_name: 'koriander',    ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'timian',        normalized_name: 'timian',       ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'rosmarin',      normalized_name: 'rosmarin',     ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'gressløk',      normalized_name: 'gressløk',     ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },
  { canonical_name: 'mynte',         normalized_name: 'mynte',        ingredient_family: 'urt',          category: 'Grønnsaker', default_unit: 'g' },

  // ── Kylling ───────────────────────────────────────────────────────────────
  { canonical_name: 'kylling',       normalized_name: 'kylling',      ingredient_family: 'fjærkre',      category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'kyllingfilet',  normalized_name: 'kylling',      ingredient_family: 'fjærkre',      category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'kyllinglår',    normalized_name: 'kylling',      ingredient_family: 'fjærkre',      category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'kyllinglårfilet', normalized_name: 'kylling',    ingredient_family: 'fjærkre',      category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'kalkun',        normalized_name: 'kalkun',       ingredient_family: 'fjærkre',      category: 'Kjøtt og fisk', default_unit: 'g' },

  // ── Svinekjøtt ───────────────────────────────────────────────────────────
  { canonical_name: 'svinekjøtt',    normalized_name: 'svinekjøtt',   ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'svinefilet',    normalized_name: 'svinekjøtt',   ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'svinekotelett', normalized_name: 'svinekjøtt',   ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'stk' },
  { canonical_name: 'svinenakke',    normalized_name: 'svinekjøtt',   ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'bacon',         normalized_name: 'bacon',        ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'ribbe',         normalized_name: 'ribbe',        ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'pølse',         normalized_name: 'pølse',        ingredient_family: 'svinekjøtt',   category: 'Kjøtt og fisk', default_unit: 'stk' },

  // ── Kjøttdeig ────────────────────────────────────────────────────────────
  { canonical_name: 'kjøttdeig',     normalized_name: 'kjøttdeig',    ingredient_family: 'kjøttdeig',    category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'karbonadedeig', normalized_name: 'kjøttdeig',    ingredient_family: 'kjøttdeig',    category: 'Kjøtt og fisk', default_unit: 'g' },

  // ── Storfekjøtt ──────────────────────────────────────────────────────────
  { canonical_name: 'biff',          normalized_name: 'biff',         ingredient_family: 'storfekjøtt',  category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'oksekjøtt',     normalized_name: 'oksekjøtt',    ingredient_family: 'storfekjøtt',  category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'høyrygg',       normalized_name: 'oksekjøtt',    ingredient_family: 'storfekjøtt',  category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'entrecôte',     normalized_name: 'biff',         ingredient_family: 'storfekjøtt',  category: 'Kjøtt og fisk', default_unit: 'g' },

  // ── Lammekjøtt ───────────────────────────────────────────────────────────
  { canonical_name: 'lammekjøtt',    normalized_name: 'lammekjøtt',   ingredient_family: 'lammekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'lammekotelett', normalized_name: 'lammekjøtt',   ingredient_family: 'lammekjøtt',   category: 'Kjøtt og fisk', default_unit: 'stk' },
  { canonical_name: 'lammeribbe',    normalized_name: 'lammekjøtt',   ingredient_family: 'lammekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'lammebog',      normalized_name: 'lammekjøtt',   ingredient_family: 'lammekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'fårikålkjøtt',  normalized_name: 'lammekjøtt',   ingredient_family: 'lammekjøtt',   category: 'Kjøtt og fisk', default_unit: 'g' },

  // ── Fisk ─────────────────────────────────────────────────────────────────
  { canonical_name: 'laks',          normalized_name: 'laks',         ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'laksefilet',    normalized_name: 'laks',         ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'røkt laks',     normalized_name: 'røkt laks',    ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'torsk',         normalized_name: 'torsk',        ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'torskefilet',   normalized_name: 'torsk',        ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'skrei',         normalized_name: 'torsk',        ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'sei',           normalized_name: 'sei',          ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'seifilet',      normalized_name: 'sei',          ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'ørret',         normalized_name: 'ørret',        ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'makrell',       normalized_name: 'makrell',      ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'hyse',          normalized_name: 'hyse',         ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'steinbit',      normalized_name: 'steinbit',     ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'sild',          normalized_name: 'sild',         ingredient_family: 'fisk',         category: 'Kjøtt og fisk', default_unit: 'g' },

  // ── Skalldyr ─────────────────────────────────────────────────────────────
  { canonical_name: 'reker',         normalized_name: 'reker',        ingredient_family: 'skalldyr',     category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'kamskjell',     normalized_name: 'kamskjell',    ingredient_family: 'skalldyr',     category: 'Kjøtt og fisk', default_unit: 'stk' },
  { canonical_name: 'blåskjell',     normalized_name: 'blåskjell',    ingredient_family: 'skalldyr',     category: 'Kjøtt og fisk', default_unit: 'g' },
  { canonical_name: 'krabbe',        normalized_name: 'krabbe',       ingredient_family: 'skalldyr',     category: 'Kjøtt og fisk', default_unit: 'g' },

  // ── Smør og fett ─────────────────────────────────────────────────────────
  { canonical_name: 'smør',          normalized_name: 'smør',         ingredient_family: 'meierfett',    category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'margarin',      normalized_name: 'margarin',     ingredient_family: 'meierfett',    category: 'Meieri',        default_unit: 'g' },

  // ── Melk ─────────────────────────────────────────────────────────────────
  { canonical_name: 'melk',          normalized_name: 'melk',         ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'helmelk',       normalized_name: 'melk',         ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'lettmelk',      normalized_name: 'melk',         ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },

  // ── Fløte og rømme ───────────────────────────────────────────────────────
  { canonical_name: 'fløte',         normalized_name: 'fløte',        ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'kremfløte',     normalized_name: 'fløte',        ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'matfløte',      normalized_name: 'fløte',        ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'rømme',         normalized_name: 'rømme',        ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'crème fraîche', normalized_name: 'crème fraîche',ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'yoghurt',       normalized_name: 'yoghurt',      ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'dl' },
  { canonical_name: 'kesam',         normalized_name: 'kesam',        ingredient_family: 'meieri',       category: 'Meieri',        default_unit: 'g' },

  // ── Ost ──────────────────────────────────────────────────────────────────
  { canonical_name: 'ost',           normalized_name: 'ost',          ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'hvitost',       normalized_name: 'hvitost',      ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'brunost',       normalized_name: 'brunost',      ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'parmesan',      normalized_name: 'parmesan',     ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'fetaost',       normalized_name: 'fetaost',      ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'mozzarella',    normalized_name: 'mozzarella',   ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'cheddar',       normalized_name: 'cheddar',      ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'kremost',       normalized_name: 'kremost',      ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'ricotta',       normalized_name: 'ricotta',      ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },
  { canonical_name: 'mascarpone',    normalized_name: 'mascarpone',   ingredient_family: 'ost',          category: 'Meieri',        default_unit: 'g' },

  // ── Egg ──────────────────────────────────────────────────────────────────
  { canonical_name: 'egg',           normalized_name: 'egg',          ingredient_family: 'egg',          category: 'Meieri',        default_unit: 'stk' },

  // ── Mel ──────────────────────────────────────────────────────────────────
  { canonical_name: 'hvetemel',      normalized_name: 'hvetemel',     ingredient_family: 'mel',          category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'sammalt hvete', normalized_name: 'sammalt hvete',ingredient_family: 'mel',          category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'rugmel',        normalized_name: 'rugmel',       ingredient_family: 'mel',          category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'maisenna',      normalized_name: 'maisenna',     ingredient_family: 'mel',          category: 'Tørrvarer',     default_unit: 'ss' },
  { canonical_name: 'potetmel',      normalized_name: 'potetmel',     ingredient_family: 'mel',          category: 'Tørrvarer',     default_unit: 'ss' },

  // ── Pasta ────────────────────────────────────────────────────────────────
  { canonical_name: 'pasta',         normalized_name: 'pasta',        ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'spaghetti',     normalized_name: 'pasta',        ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'penne',         normalized_name: 'pasta',        ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'fusilli',       normalized_name: 'pasta',        ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'tagliatelle',   normalized_name: 'pasta',        ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'rigatoni',      normalized_name: 'pasta',        ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'lasagneplater', normalized_name: 'lasagneplater',ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'nudler',        normalized_name: 'nudler',       ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'risnudler',     normalized_name: 'nudler',       ingredient_family: 'pastaprodukt', category: 'Tørrvarer',     default_unit: 'g' },

  // ── Ris og korn ──────────────────────────────────────────────────────────
  { canonical_name: 'ris',           normalized_name: 'ris',          ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'basmatiris',    normalized_name: 'ris',          ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'jasminris',     normalized_name: 'ris',          ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'risotto-ris',   normalized_name: 'risotto-ris',  ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'couscous',      normalized_name: 'couscous',     ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'bulgur',        normalized_name: 'bulgur',       ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'quinoa',        normalized_name: 'quinoa',       ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'havregryn',     normalized_name: 'havregryn',    ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'bygggryn',      normalized_name: 'bygggryn',     ingredient_family: 'kornprodukt',  category: 'Tørrvarer',     default_unit: 'g' },

  // ── Belgfrukter (tørre) ───────────────────────────────────────────────────
  { canonical_name: 'røde linser',   normalized_name: 'linser',       ingredient_family: 'belgfrukt',    category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'grønne linser', normalized_name: 'linser',       ingredient_family: 'belgfrukt',    category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'belugalinser',  normalized_name: 'linser',       ingredient_family: 'belgfrukt',    category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'kikærter',      normalized_name: 'kikærter',     ingredient_family: 'belgfrukt',    category: 'Tørrvarer',     default_unit: 'g' },
  { canonical_name: 'kidneybønner',  normalized_name: 'bønner',       ingredient_family: 'belgfrukt',    category: 'Hermetikk',     default_unit: 'g' },
  { canonical_name: 'cannellinibønner', normalized_name: 'bønner',    ingredient_family: 'belgfrukt',    category: 'Hermetikk',     default_unit: 'g' },
  { canonical_name: 'hermetiske linser', normalized_name: 'linser',   ingredient_family: 'belgfrukt',    category: 'Hermetikk',     default_unit: 'g' },
  { canonical_name: 'hermetiske kikærter', normalized_name: 'kikærter', ingredient_family: 'belgfrukt',  category: 'Hermetikk',     default_unit: 'g' },

  // ── Oljer ────────────────────────────────────────────────────────────────
  { canonical_name: 'olivenolje',    normalized_name: 'olivenolje',   ingredient_family: 'matolje',      category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'rapsolje',      normalized_name: 'rapsolje',     ingredient_family: 'matolje',      category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'solsikkeolje',  normalized_name: 'solsikkeolje', ingredient_family: 'matolje',      category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'sesamolje',     normalized_name: 'sesamolje',    ingredient_family: 'matolje',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'kokosolje',     normalized_name: 'kokosolje',    ingredient_family: 'matolje',      category: 'Oljer og krydder', default_unit: 'ss' },

  // ── Sauser og smakstilsetninger ───────────────────────────────────────────
  { canonical_name: 'soyasaus',      normalized_name: 'soyasaus',     ingredient_family: 'asiatisk saus',category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'fiskesaus',     normalized_name: 'fiskesaus',    ingredient_family: 'asiatisk saus',category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'østerssaus',    normalized_name: 'østerssaus',   ingredient_family: 'asiatisk saus',category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'hoisinsaus',    normalized_name: 'hoisinsaus',   ingredient_family: 'asiatisk saus',category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'worcestershiresaus', normalized_name: 'worcestershiresaus', ingredient_family: 'saus', category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'dijonsennep',   normalized_name: 'sennep',       ingredient_family: 'saus',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'grovkornet sennep', normalized_name: 'sennep',   ingredient_family: 'saus',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'tahini',        normalized_name: 'tahini',       ingredient_family: 'saus',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'harissa',       normalized_name: 'harissa',      ingredient_family: 'saus',         category: 'Oljer og krydder', default_unit: 'ss' },

  // ── Eddik ─────────────────────────────────────────────────────────────────
  { canonical_name: 'hvitvinseddik', normalized_name: 'eddik',        ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'rødvinseddik',  normalized_name: 'eddik',        ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'balsamicoeddik',normalized_name: 'eddik',        ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'eplesidereddik',normalized_name: 'eddik',        ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'riseddik',      normalized_name: 'eddik',        ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'sitronsaft',    normalized_name: 'sitronsaft',   ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },
  { canonical_name: 'limesaft',      normalized_name: 'limesaft',     ingredient_family: 'syre',         category: 'Oljer og krydder', default_unit: 'ss' },

  // ── Vin ───────────────────────────────────────────────────────────────────
  { canonical_name: 'rødvin',        normalized_name: 'rødvin',       ingredient_family: 'vin',          category: 'Oljer og krydder', default_unit: 'dl' },
  { canonical_name: 'hvitvin',       normalized_name: 'hvitvin',      ingredient_family: 'vin',          category: 'Oljer og krydder', default_unit: 'dl' },

  // ── Kraft og buljong ─────────────────────────────────────────────────────
  { canonical_name: 'kyllingkraft',     normalized_name: 'kraft',     ingredient_family: 'kraft',        category: 'Hermetikk',     default_unit: 'dl' },
  { canonical_name: 'grønnsakskraft',   normalized_name: 'kraft',     ingredient_family: 'kraft',        category: 'Hermetikk',     default_unit: 'dl' },
  { canonical_name: 'oksekraft',        normalized_name: 'kraft',     ingredient_family: 'kraft',        category: 'Hermetikk',     default_unit: 'dl' },
  { canonical_name: 'fiskekraft',       normalized_name: 'fiskekraft',ingredient_family: 'kraft',        category: 'Hermetikk',     default_unit: 'dl' },
  { canonical_name: 'buljong',          normalized_name: 'kraft',     ingredient_family: 'kraft',        category: 'Hermetikk',     default_unit: 'dl' },

  // ── Kokos ────────────────────────────────────────────────────────────────
  { canonical_name: 'kokosmelk',     normalized_name: 'kokosmelk',    ingredient_family: 'kokos',        category: 'Hermetikk',     default_unit: 'dl' },
  { canonical_name: 'kokoskrem',     normalized_name: 'kokosmelk',    ingredient_family: 'kokos',        category: 'Hermetikk',     default_unit: 'dl' },

  // ── Tørre krydder ─────────────────────────────────────────────────────────
  { canonical_name: 'salt',          normalized_name: 'salt',         ingredient_family: 'salt',         category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'pepper',        normalized_name: 'pepper',       ingredient_family: 'pepper',       category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'paprikapulver', normalized_name: 'paprikapulver',ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'røkt paprika',  normalized_name: 'røkt paprika', ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'karri',         normalized_name: 'karri',        ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'gurkemeie',     normalized_name: 'gurkemeie',    ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'spisskummen',   normalized_name: 'spisskummen',  ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'korianderpulver',normalized_name:'korianderpulver',ingredient_family:'krydder',     category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'garam masala',  normalized_name: 'garam masala', ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'ras el hanout', normalized_name: 'ras el hanout',ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'chilipulver',   normalized_name: 'chili',        ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'cayennepepper', normalized_name: 'chili',        ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'kanel',         normalized_name: 'kanel',        ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'kardemomme',    normalized_name: 'kardemomme',   ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'muskatnøtt',    normalized_name: 'muskatnøtt',   ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'allehånde',     normalized_name: 'allehånde',    ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'ingefærpulver', normalized_name: 'ingefær',      ingredient_family: 'krydder',      category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'laurbærblad',   normalized_name: 'laurbærblad',  ingredient_family: 'urter',        category: 'Oljer og krydder', default_unit: 'stk' },
  { canonical_name: 'timian tørket', normalized_name: 'timian',       ingredient_family: 'urter',        category: 'Oljer og krydder', default_unit: 'ts' },
  { canonical_name: 'oregano tørket',normalized_name: 'oregano',      ingredient_family: 'urter',        category: 'Oljer og krydder', default_unit: 'ts' },

  // ── Baking ───────────────────────────────────────────────────────────────
  { canonical_name: 'sukker',        normalized_name: 'sukker',       ingredient_family: 'søtning',      category: 'Baking',        default_unit: 'g' },
  { canonical_name: 'brunt sukker',  normalized_name: 'brunt sukker', ingredient_family: 'søtning',      category: 'Baking',        default_unit: 'g' },
  { canonical_name: 'honning',       normalized_name: 'honning',      ingredient_family: 'søtning',      category: 'Baking',        default_unit: 'ss' },
  { canonical_name: 'lønnesirup',    normalized_name: 'sirup',        ingredient_family: 'søtning',      category: 'Baking',        default_unit: 'ss' },
  { canonical_name: 'bakepulver',    normalized_name: 'bakepulver',   ingredient_family: 'hevemiddel',   category: 'Baking',        default_unit: 'ts' },
  { canonical_name: 'natron',        normalized_name: 'natron',       ingredient_family: 'hevemiddel',   category: 'Baking',        default_unit: 'ts' },
  { canonical_name: 'gjær',          normalized_name: 'gjær',         ingredient_family: 'hevemiddel',   category: 'Baking',        default_unit: 'g' },
  { canonical_name: 'vaniljesukker', normalized_name: 'vanilje',      ingredient_family: 'smakstilsetning', category: 'Baking',    default_unit: 'ts' },
  { canonical_name: 'sjokolade',     normalized_name: 'sjokolade',    ingredient_family: 'sjokolade',    category: 'Baking',        default_unit: 'g' },
  { canonical_name: 'kakao',         normalized_name: 'kakao',        ingredient_family: 'sjokolade',    category: 'Baking',        default_unit: 'ss' },

  // ── Frukt ────────────────────────────────────────────────────────────────
  { canonical_name: 'sitron',        normalized_name: 'sitron',       ingredient_family: 'sitrusfrukt',  category: 'Frukt',         default_unit: 'stk' },
  { canonical_name: 'lime',          normalized_name: 'lime',         ingredient_family: 'sitrusfrukt',  category: 'Frukt',         default_unit: 'stk' },
  { canonical_name: 'appelsin',      normalized_name: 'appelsin',     ingredient_family: 'sitrusfrukt',  category: 'Frukt',         default_unit: 'stk' },
  { canonical_name: 'mango',         normalized_name: 'mango',        ingredient_family: 'tropisk frukt',category: 'Frukt',         default_unit: 'stk' },
  { canonical_name: 'ananas',        normalized_name: 'ananas',       ingredient_family: 'tropisk frukt',category: 'Frukt',         default_unit: 'stk' },
]

// ---------------------------------------------------------------------------
// Seeder — run once to populate the DB with the Norwegian ingredient library.
// Skips ingredients that already exist by canonical_name.
// ---------------------------------------------------------------------------

export async function seedNorwegianIngredients(): Promise<{ added: number; skipped: number }> {
  let added = 0
  let skipped = 0

  for (const tmpl of NORWEGIAN_INGREDIENTS) {
    const exists = await db.ingredients
      .where('canonical_name')
      .equals(tmpl.canonical_name)
      .first()

    if (exists) {
      skipped++
      continue
    }

    await db.ingredients.add({
      canonical_name: tmpl.canonical_name,
      normalized_name: tmpl.normalized_name,
      ingredient_family: tmpl.ingredient_family,
      category: tmpl.category,
      default_unit: tmpl.default_unit,
    } as Ingredient)

    added++
  }

  return { added, skipped }
}
