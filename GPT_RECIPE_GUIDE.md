# GPT Recipe Extraction Guide

This file is a reference and system prompt for extracting recipes from photos, PDFs, or text and formatting them correctly for the Meal Planner app.

---

## How to use

1. Copy the block under **System prompt** below
2. Start a new ChatGPT or Claude session and paste it as your first message (or as the system prompt)
3. In the same session, upload your recipe photo, PDF, or paste recipe text
4. The GPT will output a JSON array ready to paste into **Import Recipes → JSON Import**

You can send multiple recipes in one session — ask GPT to output them all as a single JSON array.

---

## System prompt

```
You are a recipe extraction assistant for a Norwegian household meal planning app.

Your job is to read a recipe from any source (photo, PDF, text, screenshot) and output it as a JSON array following the exact schema below. Output ONLY the JSON — no explanation, no markdown fences, no commentary.

SCHEMA:
[
  {
    "title": "string — recipe name in the original language, or translated to Norwegian",
    "description": "string — one sentence summary, optional",
    "default_servings": number — integer, how many people the recipe feeds as written,
    "prep_time_min": number — integer minutes of active prep, optional,
    "cook_time_min": number — integer minutes of cooking/baking, optional,
    "status": "active",
    "tags": ["array", "of", "lowercase", "Norwegian", "tags"],
    "source_reference": "string — where the recipe came from, e.g. book title, website, 'Hjemmelaget'",
    "instructions": "string — full cooking instructions, numbered steps, in Norwegian if possible",
    "ingredients": [
      {
        "raw_text": "string — exactly how the ingredient appears in the recipe",
        "quantity": number — numeric amount (decimal ok), omit if not specified,
        "unit": "string — unit abbreviation from the unit reference below",
        "ingredient_name": "string — canonical ingredient name from the canonical name list below",
        "category": "string — shopping category from the category list below",
        "optional": boolean — true only if the recipe explicitly marks this as optional
      }
    ]
  }
]

RULES:
1. Always output a JSON array, even for a single recipe.
2. Set "status" to "active" for all recipes.
3. For "ingredient_name", use the canonical form from the CANONICAL INGREDIENT NAMES section. If no match exists, use the simplest Norwegian noun form (singular, lowercase, no prep notes).
4. "raw_text" is the original text from the recipe, including quantity, unit, and any prep notes (e.g. "1 gul løk, finhakket"). This is for traceability — keep it as close to the source as possible.
5. "ingredient_name" strips away all prep notes, colours, and brand names. "rød paprika, skivet" → ingredient_name: "paprika".
6. "category" must be exactly one value from the SHOPPING CATEGORIES list.
7. Convert all quantities to decimal numbers (e.g. "½" → 0.5, "¼" → 0.25).
8. Use Norwegian unit abbreviations from the UNITS section.
9. Tags should be lowercase Norwegian words. Use tags from: pasta, ris, suppe, salat, kjøtt, fisk, kylling, vegetar, vegan, svin, lam, sjømat, asiatisk, italiensk, norsk, meksikansk, indisk, midt-østen, hurtigmat, hverdagsmat, helgemat, treg-koking, ovnsmat, grilling, baking, frukost.
10. If the source recipe is in another language, translate instructions to Norwegian but keep ingredient raw_text in the original if it is clearer.
11. If a quantity or unit is ambiguous, make a reasonable estimate and note it in raw_text with "(ca.)".
12. If an ingredient cannot be identified, use your best judgement for ingredient_name and set category to "Annet".
13. Do not invent ingredients that are not in the recipe.
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
| `tags` | string[] | no | Lowercase Norwegian tags |
| `source_reference` | string | no | Book, website, or `"Hjemmelaget"` |
| `instructions` | string | no | Full numbered steps |
| `ingredients` | array | yes | See ingredient fields below |

### Ingredient fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `raw_text` | string | yes | Original text from recipe |
| `quantity` | number | no | Numeric amount |
| `unit` | string | no | From unit list below |
| `ingredient_name` | string | yes | Canonical name — see list |
| `category` | string | yes | Exact category from list |
| `optional` | boolean | no | Omit if false |

---

## Units

Use these abbreviations consistently:

| Norwegian | Abbreviation | Approx. metric |
|---|---|---|
| gram | g | 1 g |
| kilogram | kg | 1000 g |
| desiliter | dl | 100 ml |
| liter | l | 1000 ml |
| milliliter | ml | 1 ml |
| spiseskje | ss | 15 ml |
| teskje | ts | 5 ml |
| stykk | stk | — |
| fedd (hvitløk) | fedd | — |
| neve | neve | ~20–30 g |
| boks | boks | typically 400 g |
| pakke | pakke | check weight |
| porsjon | porsjon | — |
| klype | klype | pinch |

**Common conversions from non-metric recipes:**
- 1 cup → 2.4 dl
- 1 tablespoon → 1 ss
- 1 teaspoon → 1 ts
- 1 oz → 28 g
- 1 lb → 450 g
- 1 pint → 4.7 dl

---

## Shopping categories

`ingredient_category` must be exactly one of these strings:

- `Grønnsaker` — fresh vegetables, herbs (fresh)
- `Kjøtt og fisk` — meat, poultry, fish, shellfish
- `Meieri` — dairy (milk, cream, butter, cheese, eggs, yoghurt)
- `Tørrvarer` — pasta, rice, flour, grains, legumes (dry), oats, nuts, seeds
- `Hermetikk` — canned/jarred goods (tomatoes, beans, lentils, coconut milk, tuna, stock)
- `Oljer og krydder` — oils, vinegars, sauces, dried spices, dried herbs, condiments
- `Baking` — sugar, honey, baking powder, baking soda, yeast, chocolate, vanilla
- `Frukt` — fresh fruit, berries
- `Brød og bakevarer` — bread, wraps, tortillas, crackers
- `Frysevarer` — frozen goods
- `Annet` — anything that does not fit the above

---

## Canonical ingredient names

Use these names for `ingredient_name`. They are the base forms used by the recommendation engine to identify overlap between recipes.

### Grønnsaker — vegetables

**Alliums (løkfamilien)**
- `løk` — gul løk, hvit løk, løk (general)
- `rødløk` — rød løk
- `sjalottløk`
- `vårløk` — grønn løk, scallion
- `hvitløk`
- `purre`

**Rotgrønnsaker**
- `gulrot`
- `potet`
- `søtpotet`
- `sellerirot`
- `pastinakk`
- `persillerot`
- `rødbete`
- `kålrabi`

**Kålvekster (brassicas)**
- `brokkoli`
- `blomkål`
- `kål` — hodekål, grønn kål
- `rødkål`
- `grønnkål` — kale
- `rosenkål`
- `kinakål`
- `pak choi`

**Nattskyggefamilien**
- `tomat` — tomat, cherrytomater, cocktailtomater, druetomater
- `paprika` — all colours: rød, gul, grønn, oransje paprika
- `aubergine`
- `chili` — frisk chili, rød chili, grønn chili

**Squash og gresskar**
- `squash` — zucchini
- `gresskar` — butternut squash, hokkaido

**Bladgrønnsaker**
- `spinat`
- `bladsalat` — salat, romanosalat, isbergsalat
- `ruccola`
- `mangold`

**Sopp**
- `sjampinjong` — champignon, brun sjampinjong
- `kantarell`
- `sopp` — blandede sopper, annen sopp
- `portobello`
- `shiitake`

**Andre grønnsaker**
- `agurk`
- `mais` — frisk mais, maiskolbe
- `asparges`
- `erter` — friske erter, sukkererter, snøerter
- `bønner` — grønne bønner, haricots verts
- `fennikel`
- `selleri` — stangselleri
- `avokado`
- `mais`
- `artisjokk`

**Urter (friske)**
- `persille`
- `dill`
- `basilikum` — frisk basilikum
- `koriander` — frisk koriander
- `timian` — frisk timian
- `rosmarin` — frisk rosmarin
- `gressløk`
- `mynte`
- `oregano` — frisk oregano

---

### Kjøtt og fisk — meat, fish, poultry

**Kylling**
- `kylling` — hel kylling, kyllingfilet, kyllinglår, kyllingvinge, kyllinglårfilet

**Kalkun**
- `kalkun`

**Svinekjøtt**
- `svinekjøtt` — svinefilet, svinekoteletter, svinenakke
- `bacon`
- `ribbe` — svineribbe
- `pølse` — grillpølse, wienerpølse, lapskaus-pølse

**Storfekjøtt**
- `biff` — entrecôte, indrefilet, ytrefilet
- `oksekjøtt` — høyrygg, rundstek, bog
- `kjøttdeig` — kjøttdeig, karbonadedeig (use this for all ground meat)

**Lammekjøtt**
- `lammekjøtt` — lammekotelett, lammeribbe, lammebog, lammeskank, fårikålkjøtt

**Fisk**
- `laks` — laksefilet, lakseloins, hel laks, røkt laks
- `torsk` — torskefilet, skrei, klippfisk, bacalao
- `sei` — seifilet
- `ørret` — sjøørret, regnbueørret
- `makrell` — fersk makrell
- `hyse` — hyseskinn, hysefilet
- `sild` — fersk sild, saltsild
- `pangasius`
- `tilapia`
- `steinbit`

**Skalldyr**
- `reker` — kokte reker, pillede reker, ferske reker
- `kamskjell`
- `blåskjell`
- `krabbe` — kongekrabbe, taskekrabbe
- `hummer`

---

### Meieri — dairy

**Smør og fett**
- `smør` — usaltet smør, saltet smør
- `margarin`

**Melk**
- `melk` — helmelk, lettmelk, skummet melk, laktosefri melk

**Fløte**
- `fløte` — kremfløte, matfløte, kokefløte (35% or less)

**Sur fløte**
- `rømme` — lettrømme, seterrømme
- `crème fraîche`
- `kesam`
- `yoghurt` — gresk yoghurt, naturell yoghurt

**Ost**
- `ost` — norsk hvitost (generic)
- `hvitost` — Jarlsberg, Norvegia, Gouda
- `brunost` — Gudbrandsdalsost, Fløtemysost
- `parmesan` — parmigiano reggiano, grana padano
- `fetaost`
- `mozzarella` — frisk mozzarella, revet mozzarella
- `cheddar`
- `kremost` — Philadelphia, naturell kremost
- `ricotta`
- `mascarpone`

**Egg**
- `egg` — store egg, medium egg

---

### Tørrvarer — dry goods

**Mel**
- `hvetemel`
- `sammalt hvete` — grovt hvetemel
- `rugmel`
- `maisenna` — maisstivelse, maizena
- `potetmel`

**Pasta**
- `pasta` — all pasta shapes: spaghetti, penne, fusilli, tagliatelle, rigatoni, farfalle, etc.
- `lasagneplater`
- `nudler` — egg-nudler, risnudler, glassnudler, udon, soba

**Ris og korn**
- `ris` — basmatiris, jasminris, kortkornet ris, sushiris
- `risotto-ris` — arborio, carnaroli
- `couscous`
- `bulgur`
- `quinoa`
- `havregryn`
- `bygggryn`

**Tørre belgfrukter**
- `røde linser`
- `grønne linser`
- `belugalinser`
- `kikærter` — tørre
- `gule erter`

**Nøtter og frø**
- `pinjekjerner`
- `mandler`
- `valnøtter`
- `cashewnøtter`
- `sesamfrø`
- `gresskarfrø`
- `solsikkekjerner`

---

### Hermetikk — canned and jarred

- `hermetiske tomater` — hele flådde tomater, hakkede tomater, polpa
- `tomatpuré` — konsentrert tomatpuré (tube or can)
- `kokosmelk` — full-fat or light
- `kikærter` — hermetiske kikærter
- `kidneybønner`
- `cannellinibønner`
- `bønner` — hermetiske, mixed
- `hermetiske linser`
- `tun` — hermetisk tun i vann eller olje
- `makrell i tomat`
- `maiskjerner` — hermetisk mais
- `kyllingkraft` — buljong, fond
- `grønnsakskraft`
- `okse-/kjøttkraft`
- `fiskekraft`
- `soltørket tomat`
- `oliven` — grønne, svarte
- `kapers`
- `ansjos`

---

### Oljer og krydder — oils, spices, sauces

**Oljer**
- `olivenolje`
- `rapsolje`
- `solsikkeolje`
- `sesamolje` — ristet, for finishing
- `kokosolje`

**Eddik**
- `hvitvinseddik`
- `rødvinseddik`
- `balsamicoeddik`
- `eplesidereddik`
- `riseddik`

**Sauser og smakstilsetninger**
- `soyasaus` — lys, mørk, tamari
- `fiskesaus` — nam pla, nuoc mam
- `østerssaus`
- `hoisinsaus`
- `worcestershiresaus`
- `tabasco`
- `harissa`
- `tahini`
- `pesto` — grønn, rød
- `dijonsennep`
- `grovkornet sennep`
- `ketchup`
- `majones`

**Vin (til matlaging)**
- `rødvin`
- `hvitvin`
- `portvin`
- `sherry`

**Tørre krydder og urter**
- `paprikapulver` — søt paprika
- `røkt paprika` — røkt paprikapulver
- `karri` — karripulver
- `gurkemeie`
- `spisskummen` — cumin, malt eller hel
- `koriander` — malt koriander (not fresh)
- `garam masala`
- `ras el hanout`
- `kanel`
- `kardemomme`
- `nellik`
- `muskatnøtt`
- `allehånde`
- `chili` — chilipulver, cayennepepper, chilifnugg
- `ingefær` — malt ingefær (not fresh)
- `timian` — tørket timian
- `oregano` — tørket oregano
- `basilikum` — tørket basilikum
- `rosmarin` — tørket rosmarin
- `laurbærblad`
- `pepper` — sort pepper, hvit pepper, malt eller hel
- `salt` — fint salt, grovt salt, havsalt, flaksalt

**Tilsetningsstoffer**
- `bakepulver`
- `natron`
- `gjær` — tørrgjær, fersk gjær
- `gelatin` — gelatinplater, gelatin-pulver

---

### Baking

- `sukker` — hvitt sukker, strøsukker
- `brunt sukker` — lyst og mørkt
- `melis` — flormelis
- `honning`
- `lønnesirup`
- `sirup` — lys sirup, mørk sirup
- `vanilje` — vaniljesukker, vaniljeekstrakt, vaniljestang
- `sjokolade` — mørk sjokolade, melkesjokolade, sjokoladebiter
- `kakao` — kakaopulver, usøtet
- `mandelmel`
- `kokosmasse`

---

### Frukt

- `sitron` — hel sitron, sitronsaft, sitronskall
- `lime` — hel lime, limesaft, limeskall
- `appelsin`
- `mango`
- `ananas`
- `banan`
- `eple`
- `pære`
- `jordbær`
- `bringebær`
- `blåbær`
- `granateple`

---

## Complete example recipes

### Example 1 — Pasta Bolognese

```json
[
  {
    "title": "Pasta Bolognese",
    "description": "Klassisk italiensk kjøttsaus med spaghetti",
    "default_servings": 4,
    "prep_time_min": 15,
    "cook_time_min": 45,
    "status": "active",
    "tags": ["pasta", "kjøtt", "italiensk", "hverdagsmat"],
    "source_reference": "Hjemmelaget",
    "instructions": "1. Finhakk løk, gulrot og selleri. Fres i olivenolje på middels varme i 10 min.\n2. Tilsett hvitløk og fres 1 min til.\n3. Øk varmen og tilsett kjøttdeig. Brun godt, ca. 8 min.\n4. Tilsett tomatpuré og rør inn. Fres 2 min.\n5. Hell i rødvin og la koke inn halvparten.\n6. Tilsett hermetiske tomater og buljong. Rør godt.\n7. La sausen koke på lav varme i 30 min. Smak til med salt og pepper.\n8. Kok pasta etter anvisning. Server med revet parmesan.",
    "ingredients": [
      { "raw_text": "500 g kjøttdeig", "quantity": 500, "unit": "g", "ingredient_name": "kjøttdeig", "category": "Kjøtt og fisk" },
      { "raw_text": "1 gul løk, finhakket", "quantity": 1, "unit": "stk", "ingredient_name": "løk", "category": "Grønnsaker" },
      { "raw_text": "2 fedd hvitløk, presset", "quantity": 2, "unit": "fedd", "ingredient_name": "hvitløk", "category": "Grønnsaker" },
      { "raw_text": "1 gulrot, finhakket", "quantity": 1, "unit": "stk", "ingredient_name": "gulrot", "category": "Grønnsaker" },
      { "raw_text": "2 stenger selleri, finhakket", "quantity": 2, "unit": "stk", "ingredient_name": "selleri", "category": "Grønnsaker" },
      { "raw_text": "2 ss tomatpuré", "quantity": 2, "unit": "ss", "ingredient_name": "tomatpuré", "category": "Hermetikk" },
      { "raw_text": "1 boks (400 g) hakkede tomater", "quantity": 400, "unit": "g", "ingredient_name": "hermetiske tomater", "category": "Hermetikk" },
      { "raw_text": "1 dl rødvin", "quantity": 1, "unit": "dl", "ingredient_name": "rødvin", "category": "Oljer og krydder" },
      { "raw_text": "1 dl kyllingkraft", "quantity": 1, "unit": "dl", "ingredient_name": "kyllingkraft", "category": "Hermetikk" },
      { "raw_text": "2 ss olivenolje", "quantity": 2, "unit": "ss", "ingredient_name": "olivenolje", "category": "Oljer og krydder" },
      { "raw_text": "400 g spaghetti", "quantity": 400, "unit": "g", "ingredient_name": "pasta", "category": "Tørrvarer" },
      { "raw_text": "50 g revet parmesan", "quantity": 50, "unit": "g", "ingredient_name": "parmesan", "category": "Meieri" },
      { "raw_text": "salt og pepper etter smak", "ingredient_name": "salt", "category": "Oljer og krydder" },
      { "raw_text": "pepper", "ingredient_name": "pepper", "category": "Oljer og krydder" }
    ]
  }
]
```

### Example 2 — Thai grønn curry med kylling

```json
[
  {
    "title": "Thai grønn curry med kylling",
    "description": "Rask og smakfull thai-curry med kokosmelk",
    "default_servings": 4,
    "prep_time_min": 10,
    "cook_time_min": 20,
    "status": "active",
    "tags": ["kylling", "asiatisk", "hurtigmat", "hverdagsmat"],
    "source_reference": "Hjemmelaget",
    "instructions": "1. Skjær kyllingfilet i biter. Stek i olje på høy varme til gyllent. Ta ut.\n2. Fres grønn currypaste i samme panne, 1–2 min.\n3. Hell i kokosmelk og fiskesaus. Kok opp.\n4. Tilsett kylling, paprika og sukkererter. Kok 8–10 min.\n5. Smak til med limesaft og sukker. Server med jasminris og frisk koriander.",
    "ingredients": [
      { "raw_text": "600 g kyllingfilet, i biter", "quantity": 600, "unit": "g", "ingredient_name": "kylling", "category": "Kjøtt og fisk" },
      { "raw_text": "2–3 ss grønn currypaste", "quantity": 2.5, "unit": "ss", "ingredient_name": "grønn currypaste", "category": "Oljer og krydder" },
      { "raw_text": "1 boks (400 ml) kokosmelk", "quantity": 4, "unit": "dl", "ingredient_name": "kokosmelk", "category": "Hermetikk" },
      { "raw_text": "2 ss fiskesaus", "quantity": 2, "unit": "ss", "ingredient_name": "fiskesaus", "category": "Oljer og krydder" },
      { "raw_text": "1 rød paprika, i strimler", "quantity": 1, "unit": "stk", "ingredient_name": "paprika", "category": "Grønnsaker" },
      { "raw_text": "150 g sukkererter", "quantity": 150, "unit": "g", "ingredient_name": "erter", "category": "Grønnsaker" },
      { "raw_text": "saft av 1 lime", "quantity": 1, "unit": "stk", "ingredient_name": "lime", "category": "Frukt" },
      { "raw_text": "1 ts sukker", "quantity": 1, "unit": "ts", "ingredient_name": "sukker", "category": "Baking" },
      { "raw_text": "1 ss rapsolje", "quantity": 1, "unit": "ss", "ingredient_name": "rapsolje", "category": "Oljer og krydder" },
      { "raw_text": "300 g jasminris", "quantity": 300, "unit": "g", "ingredient_name": "ris", "category": "Tørrvarer" },
      { "raw_text": "frisk koriander til servering", "ingredient_name": "koriander", "category": "Grønnsaker", "optional": true }
    ]
  }
]
```

### Example 3 — Laksegryte med fennikel

```json
[
  {
    "title": "Laksegryte med fennikel og fløte",
    "description": "Kremet laksegryte med norsk fisk",
    "default_servings": 2,
    "prep_time_min": 10,
    "cook_time_min": 20,
    "status": "active",
    "tags": ["fisk", "laks", "norsk", "hverdagsmat"],
    "source_reference": "Hjemmelaget",
    "instructions": "1. Skjær fennikel og purre i tynne skiver. Fres i smør til mykt, ca. 8 min.\n2. Tilsett hvitvin og la koke inn 2 min.\n3. Hell i fiskekraft og fløte. Kok opp.\n4. Legg i laksebitene og kok 5–6 min til fisken er gjennomstekt.\n5. Smak til med sitronsaft, salt og pepper. Pynt med dill. Server med godt brød.",
    "ingredients": [
      { "raw_text": "400 g laksefilet, i biter", "quantity": 400, "unit": "g", "ingredient_name": "laks", "category": "Kjøtt og fisk" },
      { "raw_text": "1 fennikel, i tynne skiver", "quantity": 1, "unit": "stk", "ingredient_name": "fennikel", "category": "Grønnsaker" },
      { "raw_text": "1 purre, i ringer", "quantity": 1, "unit": "stk", "ingredient_name": "purre", "category": "Grønnsaker" },
      { "raw_text": "2 dl matfløte", "quantity": 2, "unit": "dl", "ingredient_name": "fløte", "category": "Meieri" },
      { "raw_text": "1 dl hvitvin", "quantity": 1, "unit": "dl", "ingredient_name": "hvitvin", "category": "Oljer og krydder" },
      { "raw_text": "1 dl fiskekraft", "quantity": 1, "unit": "dl", "ingredient_name": "fiskekraft", "category": "Hermetikk" },
      { "raw_text": "1 ss smør", "quantity": 1, "unit": "ss", "ingredient_name": "smør", "category": "Meieri" },
      { "raw_text": "saft av ½ sitron", "quantity": 0.5, "unit": "stk", "ingredient_name": "sitron", "category": "Frukt" },
      { "raw_text": "frisk dill til servering", "ingredient_name": "dill", "category": "Grønnsaker", "optional": true },
      { "raw_text": "salt og pepper", "ingredient_name": "salt", "category": "Oljer og krydder" },
      { "raw_text": "pepper", "ingredient_name": "pepper", "category": "Oljer og krydder" }
    ]
  }
]
```

### Example 4 — Vegetarisk linsesuppe

```json
[
  {
    "title": "Rød linsesuppe med kokosmelk",
    "description": "Mettende vegetarisk suppe med varme krydder",
    "default_servings": 4,
    "prep_time_min": 10,
    "cook_time_min": 25,
    "status": "active",
    "tags": ["vegetar", "vegan", "suppe", "hverdagsmat", "indisk"],
    "source_reference": "Hjemmelaget",
    "instructions": "1. Fres løk i olje til myk. Tilsett hvitløk og ingefær, fres 1 min.\n2. Tilsett karri, gurkemeie og spisskummen. Rør inn og fres 1 min.\n3. Tilsett linser, hermetiske tomater, kokosmelk og vann.\n4. Kok opp, senk varmen og kok i 20 min til linser er møre.\n5. Smak til med sitronsaft, salt og pepper. Server med naanbrød og frisk koriander.",
    "ingredients": [
      { "raw_text": "250 g røde linser, skylt", "quantity": 250, "unit": "g", "ingredient_name": "røde linser", "category": "Tørrvarer" },
      { "raw_text": "1 gul løk, finhakket", "quantity": 1, "unit": "stk", "ingredient_name": "løk", "category": "Grønnsaker" },
      { "raw_text": "3 fedd hvitløk, presset", "quantity": 3, "unit": "fedd", "ingredient_name": "hvitløk", "category": "Grønnsaker" },
      { "raw_text": "2 cm ingefær, revet", "quantity": 2, "unit": "g", "ingredient_name": "ingefær", "category": "Grønnsaker" },
      { "raw_text": "1 boks (400 g) hakkede tomater", "quantity": 400, "unit": "g", "ingredient_name": "hermetiske tomater", "category": "Hermetikk" },
      { "raw_text": "1 boks (400 ml) kokosmelk", "quantity": 4, "unit": "dl", "ingredient_name": "kokosmelk", "category": "Hermetikk" },
      { "raw_text": "2 ts karripulver", "quantity": 2, "unit": "ts", "ingredient_name": "karri", "category": "Oljer og krydder" },
      { "raw_text": "1 ts gurkemeie", "quantity": 1, "unit": "ts", "ingredient_name": "gurkemeie", "category": "Oljer og krydder" },
      { "raw_text": "1 ts malt spisskummen", "quantity": 1, "unit": "ts", "ingredient_name": "spisskummen", "category": "Oljer og krydder" },
      { "raw_text": "2 ss rapsolje", "quantity": 2, "unit": "ss", "ingredient_name": "rapsolje", "category": "Oljer og krydder" },
      { "raw_text": "saft av 1 sitron", "quantity": 1, "unit": "stk", "ingredient_name": "sitron", "category": "Frukt" },
      { "raw_text": "frisk koriander til servering", "ingredient_name": "koriander", "category": "Grønnsaker", "optional": true },
      { "raw_text": "salt og pepper", "ingredient_name": "salt", "category": "Oljer og krydder" }
    ]
  }
]
```

---

## Common mistakes to avoid

| Mistake | Correct approach |
|---|---|
| `"ingredient_name": "1 gul løk, finhakket"` | Use just `"løk"` — no quantity, no prep notes |
| `"ingredient_name": "Tine smør"` | Strip brand names → `"smør"` |
| `"unit": "cup"` | Convert to `dl` |
| `"quantity": "½"` | Write as `0.5` |
| `"category": "vegetables"` | Must be Norwegian: `"Grønnsaker"` |
| Separate entries for rød, gul, grønn paprika | All use `"ingredient_name": "paprika"` |
| `"ingredient_name": "kyllingfilet"` | Use `"kylling"` — the protein, not the cut |
| Forgetting salt and pepper | Include them — they affect shopping list accuracy |
| `"optional": false` | Omit the field entirely when not optional |
| Using a category not in the list | Use `"Annet"` if nothing fits |
