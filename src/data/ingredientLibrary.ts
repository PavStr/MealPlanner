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
  miskg_id?: string         // MISKG processed ingredient ID
}

// ---------------------------------------------------------------------------
// Similarity weight constants
// Centralised here so they stay in sync with recommender.ts
// ---------------------------------------------------------------------------

export const SIMILARITY_WEIGHTS = {
  exact: 1.0,       // same ingredient_id
  normalized: 0.8,  // different ingredient_id, same normalized_name (e.g. salmon fillet → salmon)
  family: 0.4,      // same ingredient_family, different normalized_name (e.g. broccoli vs cauliflower)
  new_penalty: 0.9, // multiplied by new-ingredient ratio to penalise shopping basket growth
}

// ---------------------------------------------------------------------------
// Ingredient library
// Each entry maps a specific ingredient form to a normalized base and family.
// The recommender uses normalized_name + ingredient_family for overlap scoring.
// miskg_id links to MISKG processed_ingredients_with_id.csv for nutrition/flavor data.
// ---------------------------------------------------------------------------

export const INGREDIENT_LIBRARY: IngredientTemplate[] = [
  // ── Alliums ───────────────────────────────────────────────────────────────
  { canonical_name: 'onion',          normalized_name: 'onion',          ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'piece', miskg_id: 'e4be9e48' },
  { canonical_name: 'yellow onion',   normalized_name: 'onion',          ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'piece', miskg_id: 'fc67a8ab' },
  { canonical_name: 'red onion',      normalized_name: 'onion',          ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'piece', miskg_id: 'f960c3be' },
  { canonical_name: 'shallot',        normalized_name: 'shallot',        ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'piece', miskg_id: '9546733c' },
  { canonical_name: 'spring onion',   normalized_name: 'spring onion',   ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'piece', miskg_id: '78a08a9d' },
  { canonical_name: 'garlic',         normalized_name: 'garlic',         ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'clove', miskg_id: 'b047271a' },
  { canonical_name: 'leek',           normalized_name: 'leek',           ingredient_family: 'allium',          category: 'Vegetables',     default_unit: 'piece', miskg_id: 'f842468d' },

  // ── Root vegetables ───────────────────────────────────────────────────────
  { canonical_name: 'carrot',         normalized_name: 'carrot',         ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'piece', miskg_id: '436c8a9b' },
  { canonical_name: 'potato',         normalized_name: 'potato',         ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'g',     miskg_id: 'bf4a783b' },
  { canonical_name: 'sweet potato',   normalized_name: 'sweet potato',   ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'g',     miskg_id: 'b8c9600d' },
  { canonical_name: 'celeriac',       normalized_name: 'celeriac',       ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'g',     miskg_id: '281cc201' },
  { canonical_name: 'parsnip',        normalized_name: 'parsnip',        ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'piece', miskg_id: '3f3bf10b' },
  { canonical_name: 'parsley root',   normalized_name: 'parsley root',   ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'piece' },
  { canonical_name: 'beetroot',       normalized_name: 'beetroot',       ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'piece', miskg_id: 'e0e2f578' },
  { canonical_name: 'kohlrabi',       normalized_name: 'kohlrabi',       ingredient_family: 'root vegetable',  category: 'Vegetables',     default_unit: 'piece', miskg_id: '81e48495' },

  // ── Brassicas ─────────────────────────────────────────────────────────────
  { canonical_name: 'broccoli',       normalized_name: 'broccoli',       ingredient_family: 'brassica',        category: 'Vegetables',     default_unit: 'piece', miskg_id: 'c2274c3c' },
  { canonical_name: 'cauliflower',    normalized_name: 'cauliflower',    ingredient_family: 'brassica',        category: 'Vegetables',     default_unit: 'piece', miskg_id: 'cec8f6be' },
  { canonical_name: 'cabbage',        normalized_name: 'cabbage',        ingredient_family: 'brassica',        category: 'Vegetables',     default_unit: 'g',     miskg_id: '6d5286ad' },
  { canonical_name: 'red cabbage',    normalized_name: 'red cabbage',    ingredient_family: 'brassica',        category: 'Vegetables',     default_unit: 'g',     miskg_id: '99295ae9' },
  { canonical_name: 'kale',           normalized_name: 'kale',           ingredient_family: 'brassica',        category: 'Vegetables',     default_unit: 'g',     miskg_id: '843534c4' },
  { canonical_name: 'brussels sprouts', normalized_name: 'brussels sprouts', ingredient_family: 'brassica',   category: 'Vegetables',     default_unit: 'g',     miskg_id: '1d160a2e' },
  { canonical_name: 'chinese cabbage', normalized_name: 'chinese cabbage', ingredient_family: 'brassica',     category: 'Vegetables',     default_unit: 'g',     miskg_id: '27bb5937' },
  { canonical_name: 'bok choy',       normalized_name: 'bok choy',       ingredient_family: 'brassica',        category: 'Vegetables',     default_unit: 'piece', miskg_id: 'c07ba0d8' },

  // ── Nightshade ────────────────────────────────────────────────────────────
  { canonical_name: 'tomato',         normalized_name: 'tomato',         ingredient_family: 'nightshade',      category: 'Vegetables',     default_unit: 'piece', miskg_id: 'b9dd7860' },
  { canonical_name: 'cherry tomato',  normalized_name: 'tomato',         ingredient_family: 'nightshade',      category: 'Vegetables',     default_unit: 'g',     miskg_id: '25157c3f' },
  { canonical_name: 'bell pepper',    normalized_name: 'bell pepper',    ingredient_family: 'nightshade',      category: 'Vegetables',     default_unit: 'piece', miskg_id: '7506e31b' },
  { canonical_name: 'red bell pepper', normalized_name: 'bell pepper',   ingredient_family: 'nightshade',      category: 'Vegetables',     default_unit: 'piece', miskg_id: 'dc42deeb' },
  { canonical_name: 'yellow bell pepper', normalized_name: 'bell pepper', ingredient_family: 'nightshade',     category: 'Vegetables',     default_unit: 'piece', miskg_id: '2bfc055a' },
  { canonical_name: 'green bell pepper', normalized_name: 'bell pepper',  ingredient_family: 'nightshade',     category: 'Vegetables',     default_unit: 'piece', miskg_id: '8f2b564c' },
  { canonical_name: 'eggplant',       normalized_name: 'eggplant',       ingredient_family: 'nightshade',      category: 'Vegetables',     default_unit: 'piece', miskg_id: '3041aed5' },
  { canonical_name: 'chili',          normalized_name: 'chili',          ingredient_family: 'nightshade',      category: 'Vegetables',     default_unit: 'piece', miskg_id: 'ac7d884d' },

  // ── Canned tomatoes ───────────────────────────────────────────────────────
  { canonical_name: 'canned tomatoes',  normalized_name: 'canned tomatoes', ingredient_family: 'tomato product', category: 'Canned goods',  default_unit: 'g' },
  { canonical_name: 'chopped tomatoes', normalized_name: 'canned tomatoes', ingredient_family: 'tomato product', category: 'Canned goods',  default_unit: 'g' },
  { canonical_name: 'tomato paste',     normalized_name: 'tomato paste',    ingredient_family: 'tomato product', category: 'Canned goods',  default_unit: 'tbsp', miskg_id: '87f9deb7' },
  { canonical_name: 'sun-dried tomato', normalized_name: 'sun-dried tomato', ingredient_family: 'tomato product', category: 'Canned goods', default_unit: 'g',    miskg_id: 'f4309b9f' },

  // ── Squash & cucumber ─────────────────────────────────────────────────────
  { canonical_name: 'zucchini',       normalized_name: 'zucchini',       ingredient_family: 'cucurbit',        category: 'Vegetables',     default_unit: 'piece', miskg_id: '401de327' },
  { canonical_name: 'pumpkin',        normalized_name: 'pumpkin',        ingredient_family: 'cucurbit',        category: 'Vegetables',     default_unit: 'g',     miskg_id: 'f76c54e5' },
  { canonical_name: 'cucumber',       normalized_name: 'cucumber',       ingredient_family: 'cucurbit',        category: 'Vegetables',     default_unit: 'piece', miskg_id: '64099072' },

  // ── Leafy greens ──────────────────────────────────────────────────────────
  { canonical_name: 'spinach',        normalized_name: 'spinach',        ingredient_family: 'leafy green',     category: 'Vegetables',     default_unit: 'g',     miskg_id: '839c2a37' },
  { canonical_name: 'lettuce',        normalized_name: 'lettuce',        ingredient_family: 'leafy green',     category: 'Vegetables',     default_unit: 'g',     miskg_id: '8e1977d0' },
  { canonical_name: 'arugula',        normalized_name: 'arugula',        ingredient_family: 'leafy green',     category: 'Vegetables',     default_unit: 'g',     miskg_id: '4efdfe5b' },
  { canonical_name: 'swiss chard',    normalized_name: 'swiss chard',    ingredient_family: 'leafy green',     category: 'Vegetables',     default_unit: 'g',     miskg_id: 'f055be47' },

  // ── Mushrooms ─────────────────────────────────────────────────────────────
  { canonical_name: 'mushroom',       normalized_name: 'mushroom',       ingredient_family: 'mushroom',        category: 'Vegetables',     default_unit: 'g',     miskg_id: '6d4cbdf4' },
  { canonical_name: 'button mushroom', normalized_name: 'mushroom',      ingredient_family: 'mushroom',        category: 'Vegetables',     default_unit: 'g',     miskg_id: '6d4cbdf4' },
  { canonical_name: 'chanterelle',    normalized_name: 'chanterelle',    ingredient_family: 'mushroom',        category: 'Vegetables',     default_unit: 'g',     miskg_id: '6a5aaa55' },
  { canonical_name: 'portobello',     normalized_name: 'portobello',     ingredient_family: 'mushroom',        category: 'Vegetables',     default_unit: 'piece' },
  { canonical_name: 'shiitake',       normalized_name: 'shiitake',       ingredient_family: 'mushroom',        category: 'Vegetables',     default_unit: 'g' },

  // ── Other vegetables ──────────────────────────────────────────────────────
  { canonical_name: 'fennel',         normalized_name: 'fennel',         ingredient_family: 'vegetable',       category: 'Vegetables',     default_unit: 'piece', miskg_id: 'a2a9a3bc' },
  { canonical_name: 'celery',         normalized_name: 'celery',         ingredient_family: 'vegetable',       category: 'Vegetables',     default_unit: 'piece', miskg_id: '7f98ff05' },
  { canonical_name: 'asparagus',      normalized_name: 'asparagus',      ingredient_family: 'vegetable',       category: 'Vegetables',     default_unit: 'g',     miskg_id: '8017fbc8' },
  { canonical_name: 'peas',           normalized_name: 'peas',           ingredient_family: 'legume',          category: 'Vegetables',     default_unit: 'g',     miskg_id: '12fb063c' },
  { canonical_name: 'green beans',    normalized_name: 'green beans',    ingredient_family: 'legume',          category: 'Vegetables',     default_unit: 'g',     miskg_id: '298cb2ce' },
  { canonical_name: 'corn',           normalized_name: 'corn',           ingredient_family: 'vegetable',       category: 'Vegetables',     default_unit: 'piece', miskg_id: '256f174a' },
  { canonical_name: 'avocado',        normalized_name: 'avocado',        ingredient_family: 'vegetable',       category: 'Vegetables',     default_unit: 'piece', miskg_id: 'c4e24564' },
  { canonical_name: 'ginger',         normalized_name: 'ginger',         ingredient_family: 'spice root',      category: 'Vegetables',     default_unit: 'g',     miskg_id: '2151e4e0' },

  // ── Fresh herbs ───────────────────────────────────────────────────────────
  { canonical_name: 'parsley',        normalized_name: 'parsley',        ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: '1faff5d2' },
  { canonical_name: 'dill',           normalized_name: 'dill',           ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: 'da5baea9' },
  { canonical_name: 'basil',          normalized_name: 'basil',          ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: 'ecb3c0bd' },
  { canonical_name: 'cilantro',       normalized_name: 'cilantro',       ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: 'a69f51e5' },
  { canonical_name: 'thyme',          normalized_name: 'thyme',          ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: '2fe6df30' },
  { canonical_name: 'rosemary',       normalized_name: 'rosemary',       ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: '6c5aacbb' },
  { canonical_name: 'chives',         normalized_name: 'chives',         ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g' },
  { canonical_name: 'mint',           normalized_name: 'mint',           ingredient_family: 'herb',            category: 'Vegetables',     default_unit: 'g',     miskg_id: '989fa214' },

  // ── Chicken ───────────────────────────────────────────────────────────────
  { canonical_name: 'chicken',        normalized_name: 'chicken',        ingredient_family: 'poultry',         category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '52ca0740' },
  { canonical_name: 'chicken breast', normalized_name: 'chicken',        ingredient_family: 'poultry',         category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '2e1472fb' },
  { canonical_name: 'chicken thigh',  normalized_name: 'chicken',        ingredient_family: 'poultry',         category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '408c90ee' },
  { canonical_name: 'chicken thigh fillet', normalized_name: 'chicken',  ingredient_family: 'poultry',         category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '408c90ee' },
  { canonical_name: 'turkey',         normalized_name: 'turkey',         ingredient_family: 'poultry',         category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '41b8f7c1' },

  // ── Pork ──────────────────────────────────────────────────────────────────
  { canonical_name: 'pork',           normalized_name: 'pork',           ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'ac3e226b' },
  { canonical_name: 'pork tenderloin', normalized_name: 'pork',          ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'fa27741d' },
  { canonical_name: 'pork chop',      normalized_name: 'pork',           ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'piece', miskg_id: '77570fc5' },
  { canonical_name: 'pork neck',      normalized_name: 'pork',           ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'd46d82ca' },
  { canonical_name: 'bacon',          normalized_name: 'bacon',          ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '5da77ceb' },
  { canonical_name: 'pork ribs',      normalized_name: 'pork ribs',      ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'cd3b3f3d' },
  { canonical_name: 'sausage',        normalized_name: 'sausage',        ingredient_family: 'pork',            category: 'Meat & Fish',    default_unit: 'piece', miskg_id: '2ef7e349' },

  // ── Ground meat ───────────────────────────────────────────────────────────
  { canonical_name: 'ground beef',    normalized_name: 'ground beef',    ingredient_family: 'ground meat',     category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '22bbdab1' },
  { canonical_name: 'ground pork',    normalized_name: 'ground beef',    ingredient_family: 'ground meat',     category: 'Meat & Fish',    default_unit: 'g' },

  // ── Beef ──────────────────────────────────────────────────────────────────
  { canonical_name: 'steak',          normalized_name: 'steak',          ingredient_family: 'beef',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '7f79c335' },
  { canonical_name: 'beef',           normalized_name: 'beef',           ingredient_family: 'beef',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '716fe9e7' },
  { canonical_name: 'beef chuck',     normalized_name: 'beef',           ingredient_family: 'beef',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '716fe9e7' },
  { canonical_name: 'entrecote',      normalized_name: 'steak',          ingredient_family: 'beef',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '7f79c335' },

  // ── Lamb ──────────────────────────────────────────────────────────────────
  { canonical_name: 'lamb',           normalized_name: 'lamb',           ingredient_family: 'lamb',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'b6bc236c' },
  { canonical_name: 'lamb chop',      normalized_name: 'lamb',           ingredient_family: 'lamb',            category: 'Meat & Fish',    default_unit: 'piece', miskg_id: '738e8755' },
  { canonical_name: 'lamb ribs',      normalized_name: 'lamb',           ingredient_family: 'lamb',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'c1540723' },
  { canonical_name: 'lamb shoulder',  normalized_name: 'lamb',           ingredient_family: 'lamb',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'b6bc236c' },

  // ── Fish ──────────────────────────────────────────────────────────────────
  { canonical_name: 'salmon',         normalized_name: 'salmon',         ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '63df305c' },
  { canonical_name: 'salmon fillet',  normalized_name: 'salmon',         ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '63df305c' },
  { canonical_name: 'smoked salmon',  normalized_name: 'smoked salmon',  ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g' },
  { canonical_name: 'cod',            normalized_name: 'cod',            ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'f9aaeef8' },
  { canonical_name: 'cod fillet',     normalized_name: 'cod',            ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'f9aaeef8' },
  { canonical_name: 'pollock',        normalized_name: 'pollock',        ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'a17f3563' },
  { canonical_name: 'pollock fillet', normalized_name: 'pollock',        ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '6c90363a' },
  { canonical_name: 'trout',          normalized_name: 'trout',          ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'd1cbab17' },
  { canonical_name: 'mackerel',       normalized_name: 'mackerel',       ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '6e6fd164' },
  { canonical_name: 'haddock',        normalized_name: 'haddock',        ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '8678c3bb' },
  { canonical_name: 'wolffish',       normalized_name: 'wolffish',       ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g' },
  { canonical_name: 'herring',        normalized_name: 'herring',        ingredient_family: 'fish',            category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '23099d66' },

  // ── Shellfish ─────────────────────────────────────────────────────────────
  { canonical_name: 'shrimp',         normalized_name: 'shrimp',         ingredient_family: 'shellfish',       category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '50533936' },
  { canonical_name: 'scallop',        normalized_name: 'scallop',        ingredient_family: 'shellfish',       category: 'Meat & Fish',    default_unit: 'piece', miskg_id: '7fd9e9a5' },
  { canonical_name: 'mussel',         normalized_name: 'mussel',         ingredient_family: 'shellfish',       category: 'Meat & Fish',    default_unit: 'g',     miskg_id: 'a909f016' },
  { canonical_name: 'crab',           normalized_name: 'crab',           ingredient_family: 'shellfish',       category: 'Meat & Fish',    default_unit: 'g',     miskg_id: '8ed62724' },

  // ── Butter & fat ──────────────────────────────────────────────────────────
  { canonical_name: 'butter',         normalized_name: 'butter',         ingredient_family: 'dairy fat',       category: 'Dairy',          default_unit: 'g',     miskg_id: '9ccbc9bf' },
  { canonical_name: 'margarine',      normalized_name: 'margarine',      ingredient_family: 'dairy fat',       category: 'Dairy',          default_unit: 'g',     miskg_id: '63fcae18' },

  // ── Milk ──────────────────────────────────────────────────────────────────
  { canonical_name: 'milk',           normalized_name: 'milk',           ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: 'b577b1c6' },
  { canonical_name: 'whole milk',     normalized_name: 'milk',           ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: 'b577b1c6' },
  { canonical_name: 'low-fat milk',   normalized_name: 'milk',           ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: '206cc53c' },

  // ── Cream & cultured dairy ────────────────────────────────────────────────
  { canonical_name: 'cream',          normalized_name: 'cream',          ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: 'cc458e84' },
  { canonical_name: 'heavy cream',    normalized_name: 'cream',          ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: 'cc458e84' },
  { canonical_name: 'cooking cream',  normalized_name: 'cream',          ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: 'cc458e84' },
  { canonical_name: 'sour cream',     normalized_name: 'sour cream',     ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: '514ce4a1' },
  { canonical_name: 'creme fraiche',  normalized_name: 'creme fraiche',  ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl' },
  { canonical_name: 'yogurt',         normalized_name: 'yogurt',         ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'dl',    miskg_id: 'efdf7f8b' },
  { canonical_name: 'cottage cheese', normalized_name: 'cottage cheese', ingredient_family: 'dairy',           category: 'Dairy',          default_unit: 'g',     miskg_id: 'e9506f6f' },

  // ── Cheese ────────────────────────────────────────────────────────────────
  { canonical_name: 'cheese',         normalized_name: 'cheese',         ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: 'f8c9cdc1' },
  { canonical_name: 'white cheese',   normalized_name: 'cheese',         ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: 'f8c9cdc1' },
  { canonical_name: 'brunost',        normalized_name: 'brunost',        ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g' },
  { canonical_name: 'parmesan',       normalized_name: 'parmesan',       ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: '8758c6f7' },
  { canonical_name: 'feta',           normalized_name: 'feta',           ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: '09a4c41c' },
  { canonical_name: 'mozzarella',     normalized_name: 'mozzarella',     ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: '589f3c71' },
  { canonical_name: 'cheddar',        normalized_name: 'cheddar',        ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: '93d22c31' },
  { canonical_name: 'cream cheese',   normalized_name: 'cream cheese',   ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g' },
  { canonical_name: 'ricotta',        normalized_name: 'ricotta',        ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: '5a3f94c3' },
  { canonical_name: 'mascarpone',     normalized_name: 'mascarpone',     ingredient_family: 'cheese',          category: 'Dairy',          default_unit: 'g',     miskg_id: '2c0df2c0' },

  // ── Egg ───────────────────────────────────────────────────────────────────
  { canonical_name: 'egg',            normalized_name: 'egg',            ingredient_family: 'egg',             category: 'Dairy',          default_unit: 'piece', miskg_id: '2dbf409b' },

  // ── Flour ─────────────────────────────────────────────────────────────────
  { canonical_name: 'flour',          normalized_name: 'flour',          ingredient_family: 'flour',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '4cf0bf0f' },
  { canonical_name: 'wheat flour',    normalized_name: 'flour',          ingredient_family: 'flour',           category: 'Dry goods',      default_unit: 'g',     miskg_id: 'c035acf9' },
  { canonical_name: 'whole wheat flour', normalized_name: 'flour',       ingredient_family: 'flour',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '34566911' },
  { canonical_name: 'rye flour',      normalized_name: 'rye flour',      ingredient_family: 'flour',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '0a817d10' },
  { canonical_name: 'cornstarch',     normalized_name: 'cornstarch',     ingredient_family: 'flour',           category: 'Dry goods',      default_unit: 'tbsp' },
  { canonical_name: 'potato starch',  normalized_name: 'potato starch',  ingredient_family: 'flour',           category: 'Dry goods',      default_unit: 'tbsp' },

  // ── Pasta ─────────────────────────────────────────────────────────────────
  { canonical_name: 'pasta',          normalized_name: 'pasta',          ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '98002b57' },
  { canonical_name: 'spaghetti',      normalized_name: 'pasta',          ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '50668876' },
  { canonical_name: 'penne',          normalized_name: 'pasta',          ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '76b8b630' },
  { canonical_name: 'fusilli',        normalized_name: 'pasta',          ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '88e51905' },
  { canonical_name: 'tagliatelle',    normalized_name: 'pasta',          ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: 'd64694cb' },
  { canonical_name: 'rigatoni',       normalized_name: 'pasta',          ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: 'acbc0d7c' },
  { canonical_name: 'lasagna sheets', normalized_name: 'lasagna sheets', ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g' },
  { canonical_name: 'noodles',        normalized_name: 'noodles',        ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g' },
  { canonical_name: 'rice noodles',   normalized_name: 'noodles',        ingredient_family: 'pasta',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '3449388a' },

  // ── Rice & grains ─────────────────────────────────────────────────────────
  { canonical_name: 'rice',           normalized_name: 'rice',           ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '0ab9a03c' },
  { canonical_name: 'basmati rice',   normalized_name: 'rice',           ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '4808053f' },
  { canonical_name: 'jasmine rice',   normalized_name: 'rice',           ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '54daf5d0' },
  { canonical_name: 'risotto rice',   normalized_name: 'risotto rice',   ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '751971a2' },
  { canonical_name: 'couscous',       normalized_name: 'couscous',       ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g' },
  { canonical_name: 'bulgur',         normalized_name: 'bulgur',         ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: 'd0cbec63' },
  { canonical_name: 'quinoa',         normalized_name: 'quinoa',         ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '7ca34fb7' },
  { canonical_name: 'oats',           normalized_name: 'oats',           ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: 'adcb8512' },
  { canonical_name: 'pearl barley',   normalized_name: 'pearl barley',   ingredient_family: 'grain',           category: 'Dry goods',      default_unit: 'g',     miskg_id: '8c1de693' },

  // ── Legumes (dry & canned) ────────────────────────────────────────────────
  { canonical_name: 'red lentils',    normalized_name: 'lentils',        ingredient_family: 'legume',          category: 'Dry goods',      default_unit: 'g',     miskg_id: '096df987' },
  { canonical_name: 'green lentils',  normalized_name: 'lentils',        ingredient_family: 'legume',          category: 'Dry goods',      default_unit: 'g',     miskg_id: '096df987' },
  { canonical_name: 'black lentils',  normalized_name: 'lentils',        ingredient_family: 'legume',          category: 'Dry goods',      default_unit: 'g',     miskg_id: '096df987' },
  { canonical_name: 'chickpeas',      normalized_name: 'chickpeas',      ingredient_family: 'legume',          category: 'Dry goods',      default_unit: 'g',     miskg_id: '27961a08' },
  { canonical_name: 'kidney beans',   normalized_name: 'beans',          ingredient_family: 'legume',          category: 'Canned goods',   default_unit: 'g',     miskg_id: '1d8676a4' },
  { canonical_name: 'cannellini beans', normalized_name: 'beans',        ingredient_family: 'legume',          category: 'Canned goods',   default_unit: 'g',     miskg_id: 'b7dd50b8' },
  { canonical_name: 'canned lentils', normalized_name: 'lentils',        ingredient_family: 'legume',          category: 'Canned goods',   default_unit: 'g',     miskg_id: '096df987' },
  { canonical_name: 'canned chickpeas', normalized_name: 'chickpeas',    ingredient_family: 'legume',          category: 'Canned goods',   default_unit: 'g',     miskg_id: '27961a08' },

  // ── Oils ──────────────────────────────────────────────────────────────────
  { canonical_name: 'olive oil',      normalized_name: 'olive oil',      ingredient_family: 'cooking oil',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '2722bb7d' },
  { canonical_name: 'canola oil',     normalized_name: 'canola oil',     ingredient_family: 'cooking oil',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'a4969153' },
  { canonical_name: 'sunflower oil',  normalized_name: 'sunflower oil',  ingredient_family: 'cooking oil',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '2ad43905' },
  { canonical_name: 'sesame oil',     normalized_name: 'sesame oil',     ingredient_family: 'cooking oil',     category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '6884d3c6' },
  { canonical_name: 'coconut oil',    normalized_name: 'coconut oil',    ingredient_family: 'cooking oil',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '04c16955' },

  // ── Sauces & condiments ───────────────────────────────────────────────────
  { canonical_name: 'soy sauce',      normalized_name: 'soy sauce',      ingredient_family: 'asian sauce',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'dab33b61' },
  { canonical_name: 'fish sauce',     normalized_name: 'fish sauce',     ingredient_family: 'asian sauce',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'b8b2e121' },
  { canonical_name: 'oyster sauce',   normalized_name: 'oyster sauce',   ingredient_family: 'asian sauce',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'c174435d' },
  { canonical_name: 'hoisin sauce',   normalized_name: 'hoisin sauce',   ingredient_family: 'asian sauce',     category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'bb1fddbc' },
  { canonical_name: 'worcestershire sauce', normalized_name: 'worcestershire sauce', ingredient_family: 'sauce', category: 'Oils & Spices', default_unit: 'tbsp' },
  { canonical_name: 'dijon mustard',  normalized_name: 'mustard',        ingredient_family: 'sauce',           category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'c0d4062b' },
  { canonical_name: 'whole grain mustard', normalized_name: 'mustard',   ingredient_family: 'sauce',           category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'c6cd6543' },
  { canonical_name: 'tahini',         normalized_name: 'tahini',         ingredient_family: 'sauce',           category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '8d78e990' },
  { canonical_name: 'harissa',        normalized_name: 'harissa',        ingredient_family: 'sauce',           category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'f8f751ba' },

  // ── Vinegar & acid ────────────────────────────────────────────────────────
  { canonical_name: 'white wine vinegar', normalized_name: 'vinegar',    ingredient_family: 'acid',            category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '1d61fe40' },
  { canonical_name: 'red wine vinegar',   normalized_name: 'vinegar',    ingredient_family: 'acid',            category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'b2854622' },
  { canonical_name: 'balsamic vinegar',   normalized_name: 'vinegar',    ingredient_family: 'acid',            category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '4db337cb' },
  { canonical_name: 'apple cider vinegar', normalized_name: 'vinegar',   ingredient_family: 'acid',            category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '17ed17e5' },
  { canonical_name: 'rice vinegar',       normalized_name: 'vinegar',    ingredient_family: 'acid',            category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: 'e5dd215a' },
  { canonical_name: 'lemon juice',        normalized_name: 'lemon juice', ingredient_family: 'acid',           category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '0b7a0d05' },
  { canonical_name: 'lime juice',         normalized_name: 'lime juice',  ingredient_family: 'acid',           category: 'Oils & Spices',  default_unit: 'tbsp',  miskg_id: '8c8d5737' },

  // ── Wine ──────────────────────────────────────────────────────────────────
  { canonical_name: 'red wine',       normalized_name: 'red wine',       ingredient_family: 'wine',            category: 'Oils & Spices',  default_unit: 'dl',    miskg_id: 'f0bef9c3' },
  { canonical_name: 'white wine',     normalized_name: 'white wine',     ingredient_family: 'wine',            category: 'Oils & Spices',  default_unit: 'dl',    miskg_id: '6ce16e2f' },

  // ── Stock & broth ─────────────────────────────────────────────────────────
  { canonical_name: 'chicken stock',     normalized_name: 'stock',       ingredient_family: 'stock',           category: 'Canned goods',   default_unit: 'dl',    miskg_id: 'bf5babb3' },
  { canonical_name: 'vegetable stock',   normalized_name: 'stock',       ingredient_family: 'stock',           category: 'Canned goods',   default_unit: 'dl',    miskg_id: 'ac2cde43' },
  { canonical_name: 'beef stock',        normalized_name: 'stock',       ingredient_family: 'stock',           category: 'Canned goods',   default_unit: 'dl',    miskg_id: '645ec945' },
  { canonical_name: 'fish stock',        normalized_name: 'fish stock',  ingredient_family: 'stock',           category: 'Canned goods',   default_unit: 'dl',    miskg_id: '504607cc' },
  { canonical_name: 'stock cube',        normalized_name: 'stock',       ingredient_family: 'stock',           category: 'Canned goods',   default_unit: 'piece', miskg_id: '359472bf' },

  // ── Coconut ───────────────────────────────────────────────────────────────
  { canonical_name: 'coconut milk',   normalized_name: 'coconut milk',   ingredient_family: 'coconut',         category: 'Canned goods',   default_unit: 'dl',    miskg_id: '6a3d3b5f' },
  { canonical_name: 'coconut cream',  normalized_name: 'coconut milk',   ingredient_family: 'coconut',         category: 'Canned goods',   default_unit: 'dl',    miskg_id: 'e39e65c5' },

  // ── Dry spices ────────────────────────────────────────────────────────────
  { canonical_name: 'salt',           normalized_name: 'salt',           ingredient_family: 'salt',            category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '31c14cda' },
  { canonical_name: 'pepper',         normalized_name: 'pepper',         ingredient_family: 'pepper',          category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'a2cb36e6' },
  { canonical_name: 'paprika',        normalized_name: 'paprika',        ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '0308051e' },
  { canonical_name: 'smoked paprika', normalized_name: 'smoked paprika', ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '0453a789' },
  { canonical_name: 'curry powder',   normalized_name: 'curry',          ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'b4b1b976' },
  { canonical_name: 'turmeric',       normalized_name: 'turmeric',       ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'f1811b26' },
  { canonical_name: 'cumin',          normalized_name: 'cumin',          ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'ccf596bf' },
  { canonical_name: 'coriander powder', normalized_name: 'coriander powder', ingredient_family: 'spice',      category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '1838b4b7' },
  { canonical_name: 'garam masala',   normalized_name: 'garam masala',   ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '7be3c69b' },
  { canonical_name: 'ras el hanout',  normalized_name: 'ras el hanout',  ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '343d8592' },
  { canonical_name: 'chili powder',   normalized_name: 'chili',          ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'ed42f44b' },
  { canonical_name: 'chili flakes',   normalized_name: 'chili',          ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '02ac7cc1' },
  { canonical_name: 'cayenne',        normalized_name: 'chili',          ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '69d023a5' },
  { canonical_name: 'cinnamon',       normalized_name: 'cinnamon',       ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '91540c2d' },
  { canonical_name: 'cardamom',       normalized_name: 'cardamom',       ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'd677e165' },
  { canonical_name: 'nutmeg',         normalized_name: 'nutmeg',         ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: '9085919d' },
  { canonical_name: 'allspice',       normalized_name: 'allspice',       ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'f18617f2' },
  { canonical_name: 'ginger powder',  normalized_name: 'ginger',         ingredient_family: 'spice',           category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'eff6d964' },
  { canonical_name: 'bay leaf',       normalized_name: 'bay leaf',       ingredient_family: 'dried herb',      category: 'Oils & Spices',  default_unit: 'piece', miskg_id: 'da768c13' },
  { canonical_name: 'dried thyme',    normalized_name: 'thyme',          ingredient_family: 'dried herb',      category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'c51148a5' },
  { canonical_name: 'dried oregano',  normalized_name: 'oregano',        ingredient_family: 'dried herb',      category: 'Oils & Spices',  default_unit: 'tsp',   miskg_id: 'a4926e99' },

  // ── Baking ────────────────────────────────────────────────────────────────
  { canonical_name: 'sugar',          normalized_name: 'sugar',          ingredient_family: 'sweetener',       category: 'Baking',         default_unit: 'g',     miskg_id: '1c8db4ed' },
  { canonical_name: 'brown sugar',    normalized_name: 'brown sugar',    ingredient_family: 'sweetener',       category: 'Baking',         default_unit: 'g',     miskg_id: '311c11c0' },
  { canonical_name: 'honey',          normalized_name: 'honey',          ingredient_family: 'sweetener',       category: 'Baking',         default_unit: 'tbsp',  miskg_id: '9634c65c' },
  { canonical_name: 'maple syrup',    normalized_name: 'syrup',          ingredient_family: 'sweetener',       category: 'Baking',         default_unit: 'tbsp' },
  { canonical_name: 'baking powder',  normalized_name: 'baking powder',  ingredient_family: 'leavener',        category: 'Baking',         default_unit: 'tsp',   miskg_id: 'd4dd4388' },
  { canonical_name: 'baking soda',    normalized_name: 'baking soda',    ingredient_family: 'leavener',        category: 'Baking',         default_unit: 'tsp',   miskg_id: '9d46552d' },
  { canonical_name: 'yeast',          normalized_name: 'yeast',          ingredient_family: 'leavener',        category: 'Baking',         default_unit: 'g',     miskg_id: '80a5bcef' },
  { canonical_name: 'vanilla',        normalized_name: 'vanilla',        ingredient_family: 'flavoring',       category: 'Baking',         default_unit: 'tsp',   miskg_id: '231dd675' },
  { canonical_name: 'vanilla sugar',  normalized_name: 'vanilla',        ingredient_family: 'flavoring',       category: 'Baking',         default_unit: 'tsp',   miskg_id: '7308387a' },
  { canonical_name: 'chocolate',      normalized_name: 'chocolate',      ingredient_family: 'chocolate',       category: 'Baking',         default_unit: 'g',     miskg_id: '5cc6dda9' },
  { canonical_name: 'cocoa powder',   normalized_name: 'cocoa',          ingredient_family: 'chocolate',       category: 'Baking',         default_unit: 'tbsp',  miskg_id: 'f4330a49' },

  // ── Fruit ─────────────────────────────────────────────────────────────────
  { canonical_name: 'lemon',          normalized_name: 'lemon',          ingredient_family: 'citrus',          category: 'Fruit',          default_unit: 'piece', miskg_id: '50772078' },
  { canonical_name: 'lime',           normalized_name: 'lime',           ingredient_family: 'citrus',          category: 'Fruit',          default_unit: 'piece', miskg_id: 'df71ee40' },
  { canonical_name: 'orange',         normalized_name: 'orange',         ingredient_family: 'citrus',          category: 'Fruit',          default_unit: 'piece', miskg_id: 'a059fb9f' },
  { canonical_name: 'mango',          normalized_name: 'mango',          ingredient_family: 'tropical fruit',  category: 'Fruit',          default_unit: 'piece', miskg_id: '8f6884d8' },
  { canonical_name: 'pineapple',      normalized_name: 'pineapple',      ingredient_family: 'tropical fruit',  category: 'Fruit',          default_unit: 'piece', miskg_id: 'a38e0aaf' },
]

// ---------------------------------------------------------------------------
// Seeder — run once to populate the DB with the ingredient library.
// Skips ingredients that already exist by canonical_name.
// ---------------------------------------------------------------------------

export async function seedIngredients(): Promise<{ added: number; skipped: number }> {
  let added = 0
  let skipped = 0

  for (const tmpl of INGREDIENT_LIBRARY) {
    const exists = await db.ingredients
      .where('canonical_name')
      .equals(tmpl.canonical_name)
      .first()

    if (exists) {
      skipped++
      continue
    }

    await db.ingredients.add({
      canonical_name:    tmpl.canonical_name,
      normalized_name:   tmpl.normalized_name,
      ingredient_family: tmpl.ingredient_family,
      category:          tmpl.category,
      default_unit:      tmpl.default_unit,
      miskg_id:          tmpl.miskg_id,
    } as Ingredient)

    added++
  }

  return { added, skipped }
}

// ---------------------------------------------------------------------------
// Legacy export alias — keeps existing imports working during transition
// ---------------------------------------------------------------------------
export const NORWEGIAN_INGREDIENTS = INGREDIENT_LIBRARY
export const seedNorwegianIngredients = seedIngredients
