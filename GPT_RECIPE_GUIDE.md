# GPT Recipe Extraction Guide

This file is a reference and system prompt for extracting recipes from photos, PDFs, or text and formatting them for the Meal Planner app.

The more precisely you match ingredient names to the canonical list below, the better the app works — the recommendation engine spots ingredient overlap across recipes, and the **consolidation engine** detects when two recipes use interchangeable ingredients (e.g. shallot vs yellow onion) and suggests using just one to simplify your shopping.

---

## How to use

1. Copy the block under **System prompt** below
2. Start a new ChatGPT or Claude session and paste it as your first message
3. Upload your recipe photo, PDF, or paste recipe text in the same session
4. The model outputs a JSON array ready to paste into **Import / Export → JSON Import**

Send multiple recipes in one session — ask for them all in a single JSON array.

---

## System prompt

```
You are a recipe extraction assistant for a meal planning app.

Your job is to read a recipe from any source (photo, PDF, text, screenshot) and output it as a JSON array following the exact schema below. Output ONLY the JSON — no explanation, no markdown fences, no commentary.

SCHEMA:
[
  {
    "title": "string — recipe name, in English or the original language",
    "description": "string — one sentence summary, optional",
    "default_servings": number — integer portions as written,
    "prep_time_min": number — integer minutes of active prep, optional,
    "cook_time_min": number — integer minutes of cooking/baking, optional,
    "status": "active",
    "tags": ["array", "of", "lowercase", "English", "tags"],
    "source_reference": "string — book title, website, or 'Home recipe'",
    "instructions": "string — full cooking instructions as numbered steps",
    "ingredients": [
      {
        "raw_text": "string — exactly how the ingredient appears in the recipe",
        "quantity": number — numeric amount (decimal ok), omit if not specified,
        "unit": "string — unit from the unit reference below",
        "ingredient_name": "string — canonical English name from the CANONICAL INGREDIENT NAMES list",
        "category": "string — shopping category from the SHOPPING CATEGORIES list",
        "optional": boolean — true only if the recipe explicitly marks this as optional
      }
    ]
  }
]

RULES:
1. Always output a JSON array, even for a single recipe.
2. Set "status" to "active" for all recipes.
3. For "ingredient_name", use the canonical English form from the CANONICAL INGREDIENT NAMES section below. This is critical — the app uses these names to detect shared ingredients across recipes and suggest shopping consolidations.
4. "raw_text" keeps the original text verbatim including quantity, unit, and prep notes (e.g. "1 yellow onion, finely chopped"). Do not clean it up.
5. "ingredient_name" strips everything except the base ingredient: no quantity, no colour (unless it meaningfully changes the ingredient), no prep notes, no brand names. "finely chopped yellow onion" → "onion". "boneless skinless chicken breast" → "chicken". "Tine butter" → "butter".
6. "category" must be exactly one value from the SHOPPING CATEGORIES list.
7. Convert all quantities to decimal numbers ("½" → 0.5, "¼" → 0.25).
8. Use units from the UNITS section below.
9. Tags should be lowercase English words, e.g.: pasta, rice, soup, salad, beef, fish, chicken, vegetarian, vegan, pork, lamb, seafood, asian, italian, norwegian, mexican, indian, middle-eastern, quick, weeknight, weekend, slow-cook, oven, grill, baking, breakfast.
10. If a quantity or unit is ambiguous, make a reasonable estimate and note it in raw_text with "(approx.)".
11. If an ingredient cannot be matched to the canonical list, use the simplest English noun form (singular, lowercase, no prep notes) and pick the closest category.
12. Do not invent ingredients that are not in the recipe.
13. Include salt and pepper when the recipe uses them — they affect shopping list accuracy.
```

---

## JSON schema reference

### Top-level recipe fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Recipe name |
| `description` | string | no | One-sentence summary |
| `default_servings` | integer | yes | Portions as written |
| `prep_time_min` | integer | no | Active prep in minutes |
| `cook_time_min` | integer | no | Cook/bake/simmer in minutes |
| `status` | string | yes | Always `"active"` for GPT imports |
| `tags` | string[] | no | Lowercase English tags |
| `source_reference` | string | no | Book, website, or `"Home recipe"` |
| `instructions` | string | no | Full numbered steps |
| `ingredients` | array | yes | See ingredient fields below |

### Ingredient fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `raw_text` | string | yes | Original text from recipe |
| `quantity` | number | no | Numeric amount |
| `unit` | string | no | From unit list below |
| `ingredient_name` | string | yes | Canonical name — see list below |
| `category` | string | yes | Exact category from list below |
| `optional` | boolean | no | Omit if false |

---

## Units

| Unit | Abbreviation | Approx. metric |
|---|---|---|
| gram | g | 1 g |
| kilogram | kg | 1000 g |
| millilitre | ml | 1 ml |
| decilitre | dl | 100 ml |
| litre | l | 1000 ml |
| tablespoon | tbsp | 15 ml |
| teaspoon | tsp | 5 ml |
| piece / whole | piece | — |
| clove (garlic) | clove | — |
| slice | slice | — |
| handful | handful | ~25 g |
| can | can | typically 400 g |
| package | package | check weight |
| pinch | pinch | — |

**Common conversions from US recipes:**
- 1 cup → 2.4 dl
- 1 tablespoon → 1 tbsp
- 1 teaspoon → 1 tsp
- 1 oz → 28 g
- 1 lb → 450 g
- 1 pint → 4.7 dl

---

## Shopping categories

`category` must be exactly one of these strings:

- `Vegetables` — fresh vegetables, fresh herbs
- `Meat & Fish` — meat, poultry, fish, shellfish
- `Dairy` — milk, cream, butter, cheese, eggs, yogurt, sour cream
- `Dry goods` — pasta, rice, flour, grains, dry legumes, oats, nuts, seeds
- `Canned goods` — canned/jarred tomatoes, beans, coconut milk, stock, tuna
- `Oils & Spices` — oils, vinegars, sauces, dry spices, dried herbs, condiments, wine for cooking
- `Baking` — sugar, honey, baking powder, baking soda, yeast, chocolate, vanilla
- `Fruit` — fresh fruit, berries
- `Bread & Bakery` — bread, wraps, tortillas, crackers
- `Frozen` — frozen goods
- `Other` — anything that does not fit the above

---

## Canonical ingredient names

Use these names for `ingredient_name`. They are the exact forms the recommendation and consolidation engines match against.

**Why this matters:** if one recipe uses `"chicken breast"` and another uses `"chicken thigh"`, the engine recognises both as `"chicken"` and counts them as the same ingredient — reducing what you need to buy. If one recipe uses `"shallot"` and another uses `"yellow onion"`, the consolidation engine detects they are interchangeable (via MISKG substitution data) and suggests using just one.

### Vegetables

**Alliums**
- `onion` — yellow onion, white onion, plain onion
- `red onion`
- `shallot`
- `spring onion` — green onion, scallion
- `garlic`
- `leek`

**Root vegetables**
- `carrot`
- `potato`
- `sweet potato`
- `celeriac`
- `parsnip`
- `parsley root`
- `beetroot`
- `kohlrabi`

**Brassicas**
- `broccoli`
- `cauliflower`
- `cabbage` — green / white cabbage
- `red cabbage`
- `kale`
- `brussels sprouts`
- `chinese cabbage` — napa cabbage
- `bok choy` — pak choi

**Nightshade**
- `tomato` — regular tomatoes, vine tomatoes
- `cherry tomato` — grape tomatoes, cocktail tomatoes
- `bell pepper` — any colour: red, yellow, green, orange
- `red bell pepper` — use when recipe specifies red only
- `yellow bell pepper` — use when recipe specifies yellow only
- `green bell pepper` — use when recipe specifies green only
- `eggplant` — aubergine
- `chili` — fresh chili, red chili, green chili, bird's eye

**Squash & cucumber**
- `zucchini` — courgette
- `pumpkin` — butternut squash, hokkaido, acorn squash
- `cucumber`

**Leafy greens**
- `spinach`
- `lettuce` — romaine, iceberg, mixed leaves
- `arugula` — rocket
- `swiss chard` — chard, mangold

**Mushrooms**
- `mushroom` — button mushroom, brown mushroom, cremini
- `chanterelle`
- `portobello`
- `shiitake`

**Other vegetables**
- `fennel`
- `celery`
- `asparagus`
- `peas` — fresh peas, sugar snap peas, snow peas
- `green beans` — haricots verts, French beans
- `corn` — fresh corn, corn cob
- `avocado`
- `ginger` — fresh ginger root

**Fresh herbs**
- `parsley`
- `dill`
- `basil`
- `cilantro` — fresh coriander
- `thyme` — fresh thyme
- `rosemary` — fresh rosemary
- `chives`
- `mint`

---

### Meat & Fish

**Chicken**
- `chicken` — whole chicken, any cut including breast, thigh, drumstick, wings
- `chicken breast` — use when recipe specifies breast only
- `chicken thigh` — use when recipe specifies thigh/drumstick only
- `chicken thigh fillet` — boneless thigh
- `turkey`

**Pork**
- `pork` — pork loin, pork shoulder, generic pork cuts
- `pork tenderloin`
- `pork chop`
- `pork neck`
- `bacon`
- `pork ribs` — spare ribs, baby back ribs
- `sausage` — all fresh sausages

**Ground meat**
- `ground beef` — minced beef, hamburger meat, any ground/minced meat

**Beef**
- `steak` — ribeye, sirloin, tenderloin, any steak cut
- `beef` — beef stew meat, pot roast, chuck, braising cuts
- `entrecote` — entrecôte, ribeye steak

**Lamb**
- `lamb` — any lamb cut: chops, shoulder, leg, shank, rack
- `lamb chop`
- `lamb ribs`
- `lamb shoulder`

**Fish**
- `salmon` — fresh salmon fillet, whole salmon
- `salmon fillet`
- `smoked salmon`
- `cod` — fresh cod
- `cod fillet`
- `pollock` — saithe, coalfish
- `pollock fillet`
- `trout` — sea trout, rainbow trout
- `mackerel`
- `haddock`
- `wolffish` — catfish (ocean)
- `herring`

**Shellfish**
- `shrimp` — prawns, cooked or raw
- `scallop`
- `mussel`
- `crab`

---

### Dairy

- `butter` — salted or unsalted
- `margarine`
- `milk` — whole milk, semi-skimmed, skimmed
- `whole milk`
- `low-fat milk`
- `cream` — heavy cream, double cream
- `heavy cream`
- `cooking cream` — single cream, half and half
- `sour cream`
- `creme fraiche`
- `yogurt` — plain, Greek yogurt
- `cottage cheese`
- `cheese` — generic / unspecified cheese
- `white cheese` — Norwegian-style mild cheese (Jarlsberg, Norvegia, Gouda)
- `brunost` — Norwegian brown cheese (no substitution)
- `parmesan` — parmigiano reggiano, grana padano
- `feta`
- `mozzarella` — fresh or shredded
- `cheddar`
- `cream cheese` — Philadelphia-style
- `ricotta`
- `mascarpone`
- `egg`

---

### Dry goods

**Flour**
- `flour` — plain flour, all-purpose flour
- `wheat flour` — strong flour, bread flour
- `whole wheat flour` — wholemeal flour
- `rye flour`
- `cornstarch` — cornflour, maizena
- `potato starch`

**Pasta**
- `pasta` — use for all shapes when shape doesn't matter
- `spaghetti`
- `penne`
- `fusilli`
- `tagliatelle`
- `rigatoni`
- `lasagna sheets`
- `noodles` — egg noodles, udon, soba, glass noodles
- `rice noodles`

**Rice & grains**
- `rice` — general rice, white rice, short grain
- `basmati rice`
- `jasmine rice`
- `risotto rice` — arborio, carnaroli
- `couscous`
- `bulgur`
- `quinoa`
- `oats` — rolled oats, porridge oats
- `pearl barley`

**Dry legumes**
- `red lentils`
- `green lentils`
- `black lentils` — beluga lentils
- `chickpeas` — dry
- `kidney beans` — dry; use `"Dry goods"` for dry, `"Canned goods"` for canned

---

### Canned goods

- `canned tomatoes` — whole peeled, chopped, crushed, polpa
- `chopped tomatoes` — use when recipe specifies chopped
- `tomato paste` — concentrated tomato purée
- `sun-dried tomato`
- `coconut milk` — full fat or light
- `coconut cream`
- `chicken stock` — chicken broth, chicken bouillon
- `vegetable stock` — vegetable broth
- `beef stock` — beef broth, beef bouillon
- `fish stock`
- `stock cube` — bouillon cube, any flavour
- `kidney beans` — canned
- `cannellini beans` — white beans, canned
- `canned lentils`
- `canned chickpeas`

---

### Oils & Spices

**Oils**
- `olive oil`
- `canola oil` — rapeseed oil, neutral vegetable oil
- `sunflower oil`
- `sesame oil` — toasted, for finishing
- `coconut oil`

**Vinegar & acid**
- `white wine vinegar`
- `red wine vinegar`
- `balsamic vinegar`
- `apple cider vinegar`
- `rice vinegar`
- `lemon juice`
- `lime juice`

**Sauces & condiments**
- `soy sauce` — light, dark, or tamari
- `fish sauce`
- `oyster sauce`
- `hoisin sauce`
- `worcestershire sauce`
- `dijon mustard`
- `whole grain mustard`
- `tahini`
- `harissa`
- `green curry paste`
- `red curry paste`
- `yellow curry paste`

**Wine for cooking**
- `red wine`
- `white wine`

**Dry spices**
- `salt`
- `pepper` — black or white pepper, ground or whole
- `paprika` — sweet paprika powder
- `smoked paprika`
- `curry powder`
- `turmeric`
- `cumin`
- `coriander powder` — ground coriander (not fresh)
- `garam masala`
- `ras el hanout`
- `chili powder`
- `chili flakes` — dried chili flakes, red pepper flakes
- `cayenne`
- `cinnamon`
- `cardamom`
- `nutmeg`
- `allspice`
- `ginger powder` — ground ginger (not fresh)
- `bay leaf`
- `dried thyme`
- `dried oregano`

---

### Baking

- `sugar` — white sugar, caster sugar
- `brown sugar` — light or dark brown sugar
- `honey`
- `maple syrup`
- `baking powder`
- `baking soda` — bicarbonate of soda
- `yeast` — dried or fresh
- `vanilla` — vanilla extract, vanilla bean, vanilla sugar
- `vanilla sugar`
- `chocolate` — dark, milk, or white chocolate
- `cocoa powder` — unsweetened cocoa

---

### Fruit

- `lemon`
- `lime`
- `orange`
- `mango`
- `pineapple`

---

## Complete example recipes

### Example 1 — Pasta Bolognese

```json
[
  {
    "title": "Pasta Bolognese",
    "description": "Classic Italian meat sauce with spaghetti",
    "default_servings": 4,
    "prep_time_min": 15,
    "cook_time_min": 45,
    "status": "active",
    "tags": ["pasta", "beef", "italian", "weeknight"],
    "source_reference": "Home recipe",
    "instructions": "1. Finely dice onion, carrot and celery. Sauté in olive oil over medium heat for 10 min.\n2. Add garlic, cook 1 min.\n3. Increase heat, add ground beef and brown well, about 8 min.\n4. Stir in tomato paste, cook 2 min.\n5. Add red wine and reduce by half.\n6. Add canned tomatoes and stock. Stir well.\n7. Simmer on low heat for 30 min. Season with salt and pepper.\n8. Cook pasta according to package. Serve with grated parmesan.",
    "ingredients": [
      { "raw_text": "500 g ground beef", "quantity": 500, "unit": "g", "ingredient_name": "ground beef", "category": "Meat & Fish" },
      { "raw_text": "1 yellow onion, finely chopped", "quantity": 1, "unit": "piece", "ingredient_name": "onion", "category": "Vegetables" },
      { "raw_text": "2 cloves garlic, crushed", "quantity": 2, "unit": "clove", "ingredient_name": "garlic", "category": "Vegetables" },
      { "raw_text": "1 carrot, finely diced", "quantity": 1, "unit": "piece", "ingredient_name": "carrot", "category": "Vegetables" },
      { "raw_text": "2 stalks celery, finely diced", "quantity": 2, "unit": "piece", "ingredient_name": "celery", "category": "Vegetables" },
      { "raw_text": "2 tbsp tomato paste", "quantity": 2, "unit": "tbsp", "ingredient_name": "tomato paste", "category": "Canned goods" },
      { "raw_text": "1 can (400 g) chopped tomatoes", "quantity": 400, "unit": "g", "ingredient_name": "canned tomatoes", "category": "Canned goods" },
      { "raw_text": "1 dl red wine", "quantity": 1, "unit": "dl", "ingredient_name": "red wine", "category": "Oils & Spices" },
      { "raw_text": "1 dl chicken stock", "quantity": 1, "unit": "dl", "ingredient_name": "chicken stock", "category": "Canned goods" },
      { "raw_text": "2 tbsp olive oil", "quantity": 2, "unit": "tbsp", "ingredient_name": "olive oil", "category": "Oils & Spices" },
      { "raw_text": "400 g spaghetti", "quantity": 400, "unit": "g", "ingredient_name": "spaghetti", "category": "Dry goods" },
      { "raw_text": "50 g grated parmesan", "quantity": 50, "unit": "g", "ingredient_name": "parmesan", "category": "Dairy" },
      { "raw_text": "salt and pepper to taste", "ingredient_name": "salt", "category": "Oils & Spices" },
      { "raw_text": "pepper", "ingredient_name": "pepper", "category": "Oils & Spices" }
    ]
  }
]
```

### Example 2 — Thai Green Chicken Curry

```json
[
  {
    "title": "Thai Green Chicken Curry",
    "description": "Quick and flavourful Thai curry with coconut milk",
    "default_servings": 4,
    "prep_time_min": 10,
    "cook_time_min": 20,
    "status": "active",
    "tags": ["chicken", "asian", "quick", "weeknight"],
    "source_reference": "Home recipe",
    "instructions": "1. Cut chicken into pieces. Fry in oil over high heat until golden. Remove.\n2. Fry green curry paste in the same pan, 1–2 min.\n3. Add coconut milk and fish sauce. Bring to a boil.\n4. Add chicken, bell pepper and sugar snap peas. Simmer 8–10 min.\n5. Season with lime juice and sugar. Serve with jasmine rice and fresh cilantro.",
    "ingredients": [
      { "raw_text": "600 g chicken breast, cut into pieces", "quantity": 600, "unit": "g", "ingredient_name": "chicken breast", "category": "Meat & Fish" },
      { "raw_text": "2–3 tbsp green curry paste", "quantity": 2.5, "unit": "tbsp", "ingredient_name": "green curry paste", "category": "Oils & Spices" },
      { "raw_text": "1 can (400 ml) coconut milk", "quantity": 4, "unit": "dl", "ingredient_name": "coconut milk", "category": "Canned goods" },
      { "raw_text": "2 tbsp fish sauce", "quantity": 2, "unit": "tbsp", "ingredient_name": "fish sauce", "category": "Oils & Spices" },
      { "raw_text": "1 red bell pepper, sliced", "quantity": 1, "unit": "piece", "ingredient_name": "red bell pepper", "category": "Vegetables" },
      { "raw_text": "150 g sugar snap peas", "quantity": 150, "unit": "g", "ingredient_name": "peas", "category": "Vegetables" },
      { "raw_text": "juice of 1 lime", "quantity": 1, "unit": "piece", "ingredient_name": "lime", "category": "Fruit" },
      { "raw_text": "1 tsp sugar", "quantity": 1, "unit": "tsp", "ingredient_name": "sugar", "category": "Baking" },
      { "raw_text": "1 tbsp canola oil", "quantity": 1, "unit": "tbsp", "ingredient_name": "canola oil", "category": "Oils & Spices" },
      { "raw_text": "300 g jasmine rice", "quantity": 300, "unit": "g", "ingredient_name": "jasmine rice", "category": "Dry goods" },
      { "raw_text": "fresh cilantro to serve", "ingredient_name": "cilantro", "category": "Vegetables", "optional": true }
    ]
  }
]
```

### Example 3 — Salmon and Fennel Stew

```json
[
  {
    "title": "Creamy Salmon and Fennel Stew",
    "description": "Creamy fish stew with fresh salmon and fennel",
    "default_servings": 2,
    "prep_time_min": 10,
    "cook_time_min": 20,
    "status": "active",
    "tags": ["fish", "salmon", "norwegian", "weeknight"],
    "source_reference": "Home recipe",
    "instructions": "1. Slice fennel and leek thinly. Sauté in butter until soft, about 8 min.\n2. Add white wine and reduce for 2 min.\n3. Pour in fish stock and cream. Bring to a boil.\n4. Add salmon pieces and simmer 5–6 min until cooked through.\n5. Season with lemon juice, salt and pepper. Garnish with dill. Serve with good bread.",
    "ingredients": [
      { "raw_text": "400 g salmon fillet, cut into pieces", "quantity": 400, "unit": "g", "ingredient_name": "salmon fillet", "category": "Meat & Fish" },
      { "raw_text": "1 fennel bulb, thinly sliced", "quantity": 1, "unit": "piece", "ingredient_name": "fennel", "category": "Vegetables" },
      { "raw_text": "1 leek, sliced into rings", "quantity": 1, "unit": "piece", "ingredient_name": "leek", "category": "Vegetables" },
      { "raw_text": "2 dl cooking cream", "quantity": 2, "unit": "dl", "ingredient_name": "cooking cream", "category": "Dairy" },
      { "raw_text": "1 dl white wine", "quantity": 1, "unit": "dl", "ingredient_name": "white wine", "category": "Oils & Spices" },
      { "raw_text": "1 dl fish stock", "quantity": 1, "unit": "dl", "ingredient_name": "fish stock", "category": "Canned goods" },
      { "raw_text": "1 tbsp butter", "quantity": 1, "unit": "tbsp", "ingredient_name": "butter", "category": "Dairy" },
      { "raw_text": "juice of ½ lemon", "quantity": 0.5, "unit": "piece", "ingredient_name": "lemon", "category": "Fruit" },
      { "raw_text": "fresh dill to serve", "ingredient_name": "dill", "category": "Vegetables", "optional": true },
      { "raw_text": "salt and pepper", "ingredient_name": "salt", "category": "Oils & Spices" },
      { "raw_text": "pepper", "ingredient_name": "pepper", "category": "Oils & Spices" }
    ]
  }
]
```

### Example 4 — Red Lentil Soup

```json
[
  {
    "title": "Red Lentil Soup with Coconut Milk",
    "description": "Hearty vegan soup with warm spices",
    "default_servings": 4,
    "prep_time_min": 10,
    "cook_time_min": 25,
    "status": "active",
    "tags": ["vegetarian", "vegan", "soup", "weeknight", "indian"],
    "source_reference": "Home recipe",
    "instructions": "1. Sauté onion in oil until soft. Add garlic and ginger, cook 1 min.\n2. Add curry powder, turmeric and cumin. Stir and cook 1 min.\n3. Add lentils, canned tomatoes, coconut milk and 2 dl water.\n4. Bring to a boil, reduce heat and simmer 20 min until lentils are soft.\n5. Season with lemon juice, salt and pepper. Serve with naan and fresh cilantro.",
    "ingredients": [
      { "raw_text": "250 g red lentils, rinsed", "quantity": 250, "unit": "g", "ingredient_name": "red lentils", "category": "Dry goods" },
      { "raw_text": "1 yellow onion, finely chopped", "quantity": 1, "unit": "piece", "ingredient_name": "onion", "category": "Vegetables" },
      { "raw_text": "3 cloves garlic, crushed", "quantity": 3, "unit": "clove", "ingredient_name": "garlic", "category": "Vegetables" },
      { "raw_text": "2 cm fresh ginger, grated", "quantity": 20, "unit": "g", "ingredient_name": "ginger", "category": "Vegetables" },
      { "raw_text": "1 can (400 g) chopped tomatoes", "quantity": 400, "unit": "g", "ingredient_name": "canned tomatoes", "category": "Canned goods" },
      { "raw_text": "1 can (400 ml) coconut milk", "quantity": 4, "unit": "dl", "ingredient_name": "coconut milk", "category": "Canned goods" },
      { "raw_text": "2 tsp curry powder", "quantity": 2, "unit": "tsp", "ingredient_name": "curry powder", "category": "Oils & Spices" },
      { "raw_text": "1 tsp turmeric", "quantity": 1, "unit": "tsp", "ingredient_name": "turmeric", "category": "Oils & Spices" },
      { "raw_text": "1 tsp ground cumin", "quantity": 1, "unit": "tsp", "ingredient_name": "cumin", "category": "Oils & Spices" },
      { "raw_text": "2 tbsp canola oil", "quantity": 2, "unit": "tbsp", "ingredient_name": "canola oil", "category": "Oils & Spices" },
      { "raw_text": "juice of 1 lemon", "quantity": 1, "unit": "piece", "ingredient_name": "lemon", "category": "Fruit" },
      { "raw_text": "fresh cilantro to serve", "ingredient_name": "cilantro", "category": "Vegetables", "optional": true },
      { "raw_text": "salt and pepper", "ingredient_name": "salt", "category": "Oils & Spices" }
    ]
  }
]
```

---

## Common mistakes to avoid

| Mistake | Correct approach |
|---|---|
| `"ingredient_name": "1 finely chopped yellow onion"` | Use just `"onion"` — no quantity, no prep notes |
| `"ingredient_name": "Tine butter"` | Strip brand names → `"butter"` |
| `"unit": "cup"` | Convert to `dl` |
| `"quantity": "½"` | Write as `0.5` |
| `"category": "Vegetables"` spelled wrong | Must exactly match the category list |
| Separate entries for red, yellow, green bell pepper | All use `"ingredient_name": "bell pepper"` unless colour matters for shopping |
| `"ingredient_name": "boneless skinless chicken breast"` | Use `"chicken breast"` — the cut, not the full description |
| `"ingredient_name": "chicken thigh fillet"` vs `"chicken"` | Use the specific cut if it matters for shopping; `"chicken"` for generic |
| Forgetting salt and pepper | Include them — they appear on the shopping list |
| `"optional": false` | Omit the field entirely when not optional |
| Using a category not in the list | Use `"Other"` if nothing fits |
