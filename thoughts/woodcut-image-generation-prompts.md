# Woodcut Image Generation — Prompt Guide

A complete reference for generating all 48 event-card banner images using an AI image model.
Each card gets its own unique woodcut scene. The result replaces the three shared phase-level
SVGs with per-card raster images that carry specific historical content.

---

## Display mechanics — how the images actually appear

The `.woodcut-band` CSS class controls rendering:

```css
/* desktop */
.woodcut-band {
  width: calc(100% + 52px);   /* bleeds 26px past card edges on each side */
  height: 100px;
  margin: -26px -26px 20px;
  object-fit: cover;           /* crops to fill — center of image always shows */
}

/* mobile (≤ 860px) */
.woodcut-band {
  width: calc(100% + 40px);
  height: 84px;
  margin: -20px -20px 18px;
}
```

`object-fit: cover` with the default `object-position: center` means the browser always
shows the **horizontal center strip** of the source image, scaling to fill width first.

---

## Dimensions — one image per card, no separate mobile asset

**Recommended source size: 1200 × 400 px (3:1 ratio)**

You do not need different images for mobile and desktop. The single 1200×400 file works at
every breakpoint because `object-fit: cover` handles all the scaling automatically.

**What the browser shows:**

| Viewport | Display box | Portion of source visible |
|---|---|---|
| Desktop max (~1180px) | ~1232 × 100 px | center ~83px of the 400px height (21%) |
| Desktop mid (900px) | ~952 × 100 px | center ~83px of the 400px height (21%) |
| Mobile (360px) | ~368 × 84 px | center ~115px of the 400px height (29%) |

**Implication:** The main scene and key figures must live in the **center 30% of the
image's height** — roughly y:140 to y:260 in a 400-tall image. The upper and lower bands
function as bleed (sky, smoke, ground, texture) and will be cropped on desktop.

**Model-specific dimension settings:**

| Model | Setting |
|---|---|
| Midjourney | `--ar 3:1` |
| Flux (ComfyUI / fal.ai) | width=1200, height=400 |
| Stable Diffusion XL | 1536 × 512 or 1152 × 384 |
| DALL-E 3 | Generate at 1792 × 1024; crop to 1792 × 597 after download |
| Adobe Firefly | "Widescreen landscape" → crop to 3:1 manually |

Retina-quality variants: double both dimensions (2400 × 800). The pixelated CSS rendering
(`image-rendering: pixelated`) makes this mostly unnecessary — a sharp 1200×400 looks fine.

---

## The project palette (use these as color anchors in your prompt)

| Name | Hex | Role |
|---|---|---|
| Parchment | `#cdbb92` | Background fill of all woodcut images |
| Ink | `#18110e` | All lines, hatching, figures, text |
| Paper dim | `#978a70` | Mid-tones, shadow wash |
| Red accent | `#9c2229` | Avoid in woodcut images — keep monochrome |

---

## Master style block

Paste this text into **every** card prompt, before or after the card-specific subject:

```
17th-century German woodblock print, woodcut illustration, ink on aged cream parchment,
monochromatic warm sepia palette, parchment background color #cdbb92, dark ink #18110e only,
bold ink outlines with thick exterior strokes and fine interior detail lines,
dense parallel hatching and cross-hatching for all shadow and depth,
Albrecht Dürer printmaking style, Lucas Cranach the Elder figure work,
Holy Roman Empire 1618–1648, period-accurate Habsburg and Protestant iconography,
low-fi pixelated aesthetic, coarse ink grain, woodblock texture visible,
high contrast, flat graphic quality, limited tonal range,
horizontal panoramic banner composition, wide landscape format,
main scene centered vertically in frame, generous sky and ground as bleed above and below,
dramatic historical narrative, fine architectural detail, period-costumed figures
```

---

## Negative prompt

Use this with any model that accepts negative prompts (Midjourney v6 `--no`, SD negative
prompt field, etc.):

```
no color, no gradients, no photography, no photorealism, no modern elements,
no smooth digital painting, no soft airbrushed shading, no glowing effects,
no text or lettering overlaid on image, no watermarks, no decorative borders or frames,
no comic-book style, no anime style, no bright whites or pure black fills
```

---

## Composition principles

1. **Center the action vertically.** The top and bottom 35% of the image will be cropped
   on desktop. Put figures, faces, and key objects between y:140 and y:260 (in a 400px image).

2. **Fill the width.** The band bleeds past the card edges. Use architecture (castle walls,
   city gates, columns, trees) to anchor the left and right sides and prevent empty corners.

3. **Layer the depth.** Foreground detail (figures, objects) → middle-ground action →
   background architecture or landscape. This creates visual interest even in the narrow
   visible strip.

4. **Silhouettes for sky.** Rooftops, steeples, banners, pike forests against a hatched sky
   read beautifully in woodcut style and look fine when cropped.

5. **Diagonal energy.** Marching armies, processions, and crowds moving at a diagonal
   across the frame give the horizontal band visual momentum.

6. **Period costume markers:** pikeman half-armor (gorget, breastplate), 17th-century
   doublet for courtiers, black clerical robes with biretta for clergy, Jesuit habit for
   priests, Habsburg court dress (ruffs, slashed sleeves, dark velvet), female noble
   (large ruff collar, farthingale skirt).

---

## Full prompt assembly

```
[CARD-SPECIFIC SUBJECT]

[MASTER STYLE BLOCK]
```

Example for `card_1618_prague_defenestration`:

```
Protestant Bohemian nobles in doublets hurling three Habsburg royal councillors from
the tall windows of Hradčany Castle; the men fall toward a moat far below; a crowd of
armed citizens watches from the castle courtyard; Prague's rooftops and cathedral spires
fill the right background.

17th-century German woodblock print, woodcut illustration, ink on aged cream parchment,
[... full master style block ...]
```

---

## Card-by-card scene descriptions

Paste each description as the first paragraph of the prompt, then append the master style block.

---

### Phase: prewar_settlement — 1555–1618

**card_1555_augsburg_settlement** — *The Settlement With Gaps* (1555)
> Imperial diet hall in Augsburg: Catholic bishops in mitre and cope sit on the left, Lutheran princes in dark court dress on the right; an ornate throne holds the imperial banner; a large sealed document is being presented between the two delegations; an empty chair stands in the center aisle; candles and Gothic arches frame the scene.

**card_1608_security_blocs** — *Leagues of Protection* (1608-1609)
> Two separate armed oaths sworn simultaneously on opposite sides of a divided landscape: on the left, Protestant princes raise their right hands before a banner of the Palatinate at Auhausen; on the right, Catholic lords kneel before a crucifix at Munich under Maximilian of Bavaria; armored cavalry and pike columns form behind each group; a cracked line of earth divides the two camps.

**card_1609_letter_of_majesty** — *A Royal Promise in Bohemia* (1609)
> Emperor Rudolf II in a richly carved throne at Prague Castle; a dense crowd of Bohemian Protestant nobles in court dress presses forward; a scribe unrolls a great charter bearing a wax seal the size of a fist; armed guards line the walls; Count Thurn stands close, watching the emperor's hand.

**card_1598_styrian_reform** — *The Styrian Lesson* (1598-1605)
> An 800-man garrison stands at attention outside a Lutheran schoolhouse in Graz; Catholic reform commissioners in black robes force the school door while a Protestant pastor carries his books out; Bishop Brenner raises a crucifix toward a crowd of townspeople; the spire of a demolished church smokes in the far background; Ferdinand as young archduke watches from horseback.

**card_1617_bohemian_enforcement** — *Before the Window* (1617-1618)
> Habsburg royal councillors and Catholic officials nailing shut the doors of an unfinished Protestant church in Braunau; Bohemian Protestant nobles arriving on horseback to protest, reins pulled tight in anger; scaffolding on the uncompleted church wall; the castellan of the royal estate gesturing the order; winter light, bare trees.

---

### Phase: bohemian_revolt — 1618–1620

**card_1618_prague_defenestration** — *Windows in Prague* (May 1618)
> Three men in Habsburg court dress tumbling from the tall windows of the Prague chancellery; Protestant Bohemian nobles leaning from the window frame shouting; the men fall toward a dry moat below; a crowd of citizens and soldiers in the castle yard below looking up; Prague rooftops and St Vitus Cathedral tower in the near background.

**card_1618_remove_klesl** — *The Cardinal in the Way* (July 1618)
> Vienna palace corridor: Cardinal Khlesl in scarlet cassock and biretta being seized by two armored imperial guards; his papers scatter to the floor; courtiers step back against the wall; Archduke Maximilian Ernst watches from a doorway; candlelit vaulted ceiling above.

**card_1618_mediation_channel** — *Terms Carried Between Courts* (Late 1618)
> A solitary diplomatic courier on a galloping horse in deep winter, snow on bare branches; he carries a leather satchel of dispatches; in the far left distance a castle with Habsburg eagle banner; in the far right distance another castle with a Protestant banner; the road between them curves across the center.

**card_1619_stormy_petition** — *The Storm at Vienna* (June 1619)
> Protestant Hungarian and Austrian noble delegates pressing in a mass through the gates of the Vienna Hofburg; guards with halberds trying to hold them back; the crowd is armed, pushing forward; Ferdinand II visible through an inner doorway, surrounded by Catholic councillors; the scene is tense, compressed, near-riot.

**card_1619_imperial_election** — *The Crown and the Electors* (August 1619)
> The seven imperial electors seated in the Frankfurt election hall in high-backed chairs; the crown of the Holy Roman Empire rests on a velvet cushion on the central table; Ferdinand II stands to receive the vote; across the hall Frederick V of the Palatinate stands, hands clasped, watching; heralds with banners of each electorate line the walls.

**card_1619_frankfurt_coronation** — *Frankfurt's Oath* (August-September 1619)
> Frederick V being crowned King of Bohemia in St Vitus Cathedral, Prague; a Protestant pastor places the Bohemian crown on his head; the nave is packed with jubilant Protestant nobles; Frederick's wife Elizabeth Stuart stands beside him; above the altar a Habsburg double-headed eagle carved in stone watches from the vault.

**card_1620_bavarian_army** — *The Bavarian Bargain* (1619-1620)
> Maximilian of Bavaria on horseback reviewing an immense Catholic League army on a flat plain; pike columns stretching back to the horizon; cavalry on the flanks; a Habsburg imperial envoy presents a document scroll to Maximilian; coin sacks and a war chest beside the negotiating party in the foreground.

**card_1620_saxon_question** — *Saxony and the Union* (1620)
> Elector John George of Saxony and his court watching from a wooded hilltop while two separate armies march in opposite directions below; to the left Protestant forces with Palatinate banners; to the right Catholic League banners; John George stands with arms folded, making no move to join either column.

**card_1620_march_on_prague** — *The Road to Prague* (Autumn 1620)
> An immense imperial and Catholic League army marching in column along a road converging on Prague visible on the horizon; banners of the League, Tilly's forces, Spanish troops; cannons on wheeled carriages; the army fills the full width of the image, a great horizontal mass of men and iron.

---

### Phase: palatinate_consolidation — 1620–1623

**card_1620_white_mountain_aftermath** — *After White Mountain* (November 1620)
> The hilltop of White Mountain outside Prague: Catholic League soldiers standing victorious amid abandoned pike staves and discarded armor; Frederick V fleeing on horseback in the middle distance, Prague's silhouette behind him; Tilly on horseback gesturing to the city; a Habsburg banner being raised over a captured redoubt.

**card_1621_blood_court** — *The Blood Court* (May-June 1621)
> Prague's Old Town Square: a wide scaffold bearing 27 condemned Protestant leaders; the executioner's sword raised; the crowd of citizens is dense, silent, horrified; Habsburg officials watch from a raised platform; the towers of the Tyn Church frame the background; heads displayed on iron spikes along the bridge tower.

**card_1621_confiscations** — *Lands for Loyalty* (1621)
> A Bohemian manor house: Habsburg commissioners at a long table with estate deeds and inventory rolls; Protestant noble families carrying bundles toward the gate in exile; new Catholic grantees receiving title documents and keys; a Jesuit priest blessing the new owners; soldiers at the gatehouse ensuring the transfer.

**card_1621_spanish_rhine** — *The Spanish Road* (1621)
> Spanish tercio columns in full formation marching north through the Rhine valley; officers on horseback; long pike shafts and matchlock muskets over shoulders; a Palatinate village watches from the roadside in fear; Spanish royal banner prominent; the Rhine river curves in the middle distance under a cloudy sky.

**card_1622_league_finance** — *Who Pays the League?* (1622)
> Interior of a campaign paymaster's tent: Bavarian financial officers at a table with coin scales and ledger books; stacks of silver coin being counted; a delegation of Maximilian of Bavaria's colonels waiting with arms folded, unpaid; Ferdinand II's envoy seated across with an empty purse visible on the table edge.

**card_1621_ban_of_frederick** — *The Ban of Frederick* (January 1621)
> A market square in a German imperial city: a Habsburg herald in livery reading the imperial ban against Frederick V from an official proclamation nailed to a post; townspeople and merchants crowded around to listen; soldiers keeping order; a portrait of Frederick on a broadsheet being torn down nearby.

**card_1622_palatine_settlement** — *The Paladins Remain in the Field* (1622-1623)
> A Rhine valley battle scene: Palatinate cavalry charging in a desperate rear-guard action; pikemen and musketeers in Palatinate colors pressing forward; mansfeld's forces visible; a burning village behind them; the army fighting on even as news of the ban spreads.

**card_1623_electoral_transfer** — *Maximilian's Price* (1623)
> Ferdinand II in imperial robes placing the electoral hat on the kneeling Maximilian of Bavaria in a formal investiture ceremony; displaced Calvinist electors watching from the gallery above; Catholic bishops and imperial princes as witnesses; the Palatinate electoral symbol being transferred in full ceremony.

**card_1623_peace_feelers** — *A Victory That Will Not End* (Late 1623)
> A diplomatic council chamber, exhausted: envoys from half a dozen German states slumped around a table covered with proposals and counterproposals; maps of devastated territories visible; candles burning low; one figure still arguing while the others hold their heads; no peace has been signed.

---

### Phase: danish_wallenstein — 1624–1629

**card_1625_lower_saxon_neutrality** — *Lower Saxony Will Not Stay Quiet* (1625)
> Christian IV of Denmark, dressed as a German Protestant prince, addressing a military convention of Lower Saxon Circle states; maps of northern Germany spread on the table; Protestant princes seated around him, some skeptical, some nodding; Danish cavalry visible through a tall window behind them.

**card_1625_wallenstein_army** — *A Field Army of Ferdinand's Own* (1625)
> Albrecht von Wallenstein on a black horse reviewing an enormous self-raised imperial army on a plain; banners with the imperial eagle; regiment after regiment of infantry and cavalry stretching to the horizon; Ferdinand II on a raised platform in the background watching with courtiers; the army dwarfs the landscape.

**card_1627_palatine_peace_opening** — *Frederick Nearly Bends* (1627)
> The exiled Frederick V at his court in The Hague; an imperial envoy across the table from him presenting a scroll of terms for restoration to the Palatinate; Frederick's hand hesitates over the document; behind him his wife Elizabeth Stuart stands with her hand on his shoulder, cautioning him; maps of the Palatinate on the wall.

**card_1627_restoration_mandates** — *Mandates in the Hereditary Lands* (1627-1628)
> Imperial commissioners delivering Counter-Reformation mandates in a Bohemian market town: Catholic priests returning to the parish church while Protestant families carry their possessions out of town in carts; a Jesuit leading a procession into the newly restored church; Bohemian townspeople watching in silence.

**card_1628_mecklenburg_reward** — *Mecklenburg as Payment* (1627-1628)
> Ferdinand II in imperial robes presenting the ducal documents of Mecklenburg to Wallenstein; Wallenstein bowing deeply, armored, commanding; the dispossessed Protestant dukes of Mecklenburg standing to one side, stripped of their coronets; imperial and Wallenstein banners above the ceremonial hall.

**card_1629_lubeck_peace** — *Peace at Lubeck* (1629)
> The Treaty of Lübeck signing room: Danish and imperial envoys at a long table before a great city window overlooking Lübeck harbor; Christian IV's secretary signs while the Danish king looks on; imperial commissioners stand opposite; Danish ships visible through the window, preparing to depart.

---

### Phase: restitution_overreach — March 1629

**card_1629_restitution_edict** — *The Edict of Restitution* (March 1629)
> Imperial heralds reading the Edict of Restitution in a great German city square: Catholic clergy arriving to reclaim cathedral and monastery buildings; Lutheran pastors and their families leaving under escort with their children and belongings; a crowd of Protestant citizens watching; the imperial decree on a post above the scene.

---

### Phase: swedish_wallenstein_crisis — 1630–1634

**card_1630_regensburg_wallenstein** — *Regensburg: The Price of Consent* (1630)
> The Regensburg Diet hall: Catholic electors and princes confronting Ferdinand II in formal session, demanding Wallenstein's dismissal as the price of cooperation; Wallenstein depicted in a broadsheet being torn from the wall; Ferdinand II alone at the center, his supporters sparse; the electors' chairs arrayed against him.

**card_1631_intervention_crisis** — *The Door Stands Open* (1631)
> Gustav Adolf of Sweden in full armor leading Swedish troops ashore at Usedom on the Pomeranian coast; Swedish Vasa banners unfurling in the Baltic wind; a mass of disciplined Swedish infantry and cavalry disembarking from flat-bottomed boats; German Protestant observers watching from the shore as the intervention begins.

**card_1631_saxon_break** — *Saxony Crosses the Line* (1631)
> John George of Saxony in armor, finally crossing a bridge at the head of Saxon forces to join the Swedish alliance after the sack of Magdeburg; Swedish and Saxon banners intermingled; burned villages visible in the distance; the elector rides with grim determination, his hesitation finally ended.

**card_1632_recall_wallenstein** — *Gollersdorf* (1632)
> Wallenstein at his Gitschin palace receiving Ferdinand II's envoys; the general seated at a desk covered in maps and papers; imperial commissioners presenting a new commission sealed with the great imperial seal; Wallenstein's conditions written on a separate sheet, his finger pointing to them; aides and generals waiting in the doorway behind him.

**card_1633_wallenstein_peace** — *The General Makes His Own Peace* (1633)
> Wallenstein's private council chamber deep in night: a Swedish envoy, a Saxon envoy, and one of Wallenstein's trusted colonels exchanging coded documents under candlelight; another Wallenstein general visible in the shadows, watching with visible unease; maps of Bohemia and Saxony marked with troop positions spread on the table.

**card_1634_remove_wallenstein** — *Dead or Alive* (January-February 1634)
> The assassination at Eger: Irish and Scottish soldiers of fortune breaking into Wallenstein's chamber in the night; the general rises in his nightgown, unarmed; candlelight catches the blade; Wallenstein's few remaining loyal officers already cut down in the hall outside; the scene stark, compressed, final.

---

### Phase: prague_succession — 1634–1637

**card_1635_prague_peace** — *The Peace of Prague* (1635)
> Ferdinand II and Elector John George of Saxony signing the Peace of Prague at a formal treaty table; German princes and Catholic and Lutheran dignitaries witnessing; the Saxon chancellor with quill in hand; the imperial seal being applied; a moment of unexpected unity — French and Swedish envoys conspicuously absent from the scene.

**card_1636_hessen_amnesty** — *The Amnesty Question* (1635-1636)
> Landgravine Amalia Elisabeth of Hesse-Kassel at her desk, regent for her young son: an imperial envoy presenting the Prague Peace terms for her signature; she holds the document but does not sign; Swedish alliance correspondence visible behind her; her advisers stand with her, their posture firm; the decision hangs in the air.

**card_1637_ferdinand_iii_election** — *Regensburg Again* (1636-1637)
> The election hall at Regensburg: the young Ferdinand III being presented to the seven imperial electors, the crown of the Romans being offered; his aging father Ferdinand II watches from a throne beside him, visibly ill; the electors in their ceremonial robes; the moment of dynastic succession in progress.

---

### Threshold cards — event-triggered, appear when pressure conditions are met

**card_threshold_estates_offer_credit** — *Credit Still Offered by the Estates* (palatinate phase)
> A Habsburg council chamber: loyal Bohemian and Austrian estate representatives bringing account books, letters of credit, and tax rolls to the imperial court; Ferdinand II's finance councillors receiving them with evident relief; an atmosphere of cooperative goodwill, rare in these years; coin and documents being formally offered.

**card_threshold_estate_guarantees** — *Guarantees Before Obedience* (swedish phase)
> A negotiating chamber: estate representatives presenting a written list of constitutional demands before agreeing to anything; they place the paper on the table and fold their arms; Ferdinand II's envoys look at the document with discomfort; a draft constitution lies beside the troop requisition form; the estates will not yield without guarantees first.

**card_threshold_army_arrears** — *Arrears on Every Table* (danish phase)
> A military encampment in winter: soldiers confronting their colonels over unpaid wages; arrears ledgers spread on drums and mess tables; men holding up empty purses; an officer gesturing helplessly toward an empty military chest; the army on the edge of mutiny, order barely maintained.

**card_threshold_treasury_bargain** — *Ready Money, Rare Freedom* (danish phase)
> Ferdinand II's imperial treasury chamber: finance officials counting a surprisingly full chest of silver coin; the emperor enters with his councillors and surveys the wealth with quiet satisfaction; for once, the balance sheets show credit; servants carrying in additional strongboxes; a moment of financial breathing room, visibly rare.

**card_threshold_military_creditors** — *The Price of Armed Servants* (swedish phase)
> Wallenstein-style war entrepreneurs and military financiers in a council room presenting Ferdinand II with their invoices: lists of debts, garrison costs, officer commissions; the emperor at the table surrounded by military contractors who have become indispensable; courtiers behind him visibly uncomfortable at the dependency on display.

**card_threshold_foreign_courts** — *Foreign Courts Find Their Cause* (swedish phase)
> A split scene: on the left, French Cardinal Richelieu reviewing a map of the Empire with his council; on the right, Swedish and Dutch envoys in their own chambers reading the same reports; each court drawing circles of interest around different German territories; the Empire shown as an object of foreign attention, its borders already being sketched.

**card_threshold_succession_breathing_space** — *A Crown Not Yet in Panic* (prague phase)
> Ferdinand II and his son Ferdinand III at the Vienna court, the succession secure: father and son at a high table reviewing the affairs of the dynasty; the imperial crown and regalia displayed; loyal Habsburg court members gathered around; a moment of dynastic confidence, the line unbroken, the panic of a contested succession not yet arrived.

**card_threshold_devastation_petitions** — *The Lands Petition Against Ruin* (prague phase)
> A long procession of petitioners — scarred peasants, burned-out townspeople, widows, orphaned children — approaching the imperial chancellery with rolled petitions; burned farmsteads and ruined mills in the horizon behind them; an imperial secretary accepting the rolls at the gate; the human cost of thirty years of war made visible.

**card_1637_ferdinand_death** — *The Emperor Dies* (February 1637)
> Ferdinand II on his deathbed at the Vienna Hofburg: Jesuit confessor at his side, court physicians at the foot of the bed; Ferdinand III kneels by his father's hand; the imperial crown and orb rest on a cushion nearby; the room is crowded with silent court figures; candles burn around a crucifix on the wall above.

---

## Naming convention for output files

Save generated images as:

```
public/assets/woodcuts/{card_id}.png
```

Examples:
- `public/assets/woodcuts/card_1618_prague_defenestration.png`
- `public/assets/woodcuts/card_1629_restitution_edict.png`
- `public/assets/woodcuts/card_threshold_army_arrears.png`

Once all 48 files are in place, update `App.tsx` to look up `card.id` instead of
`card.phase_id` in the `woodcutFor` function:

```ts
// replace the phase-level lookup with per-card lookup
function woodcutFor(cardId: string) {
  return `${import.meta.env.BASE_URL}assets/woodcuts/${cardId}.png`;
}
```

---

## Quick checklist before running the model

- [ ] Source image will be **1200 × 400 px** (or best supported 3:1 equivalent)
- [ ] Subject description places the main scene in the **center third** of the image height
- [ ] Master style block is appended to every prompt
- [ ] Negative prompt is provided where the model supports it
- [ ] Output format: PNG or WebP, RGB (not RGBA — no transparency needed)
- [ ] File saved to `public/assets/woodcuts/{card_id}.png`
