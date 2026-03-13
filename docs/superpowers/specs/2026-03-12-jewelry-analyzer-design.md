# Jewelry Analyzer — Design Spec
**Date:** 2026-03-12
**Version:** 3.0 (final)
**Status:** Approved
**Project:** jewelry-analyzer (new directory)

---

## Overview

A free, no-login Vercel web application that accepts jewelry photos and returns:
1. Accurate material breakdown (metal weight in grams, gemstone weight in carats)
2. Downloadable CAD files (2D DXF, 3D STL, PDF spec sheet)
3. Confidence scores with improvement suggestions

Primary goal: **maximum accuracy from a photo alone**, with optional inputs that progressively improve estimates. Target audience: both end customers and professional jewelers.

---

## Core Technology Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 App Router | Vercel-native, streaming routes |
| Language | TypeScript | Type safety for calculation engine |
| Styling | Tailwind CSS + CSS vars | Luxury theme control |
| 3D / STL / DXF | Three.js + @react-three/fiber (client-side only) | Browser library — no server DOM issues |
| PDF | pdf-lib (server-side) | No DOM deps, actively maintained |
| AI Primary | Claude claude-opus-4-6* | Best vision reasoning |
| AI Secondary | GPT-4o Vision | Cross-validation |
| Rate Limiting | @upstash/ratelimit + @upstash/redis | Vercel-native |
| Image Compression | browser-image-compression | Client-side, tree-shakeable |
| HEIC Conversion | heic2any | Best browser compat, MIT license |
| Animation | Framer Motion | Spring animations |

*Model ID must be set via `AI_MODEL_PRIMARY` env constant and verified against Anthropic API docs at implementation time. Never hardcode.

---

## Pipeline Architecture

### Vercel Timeout Strategy

The analyze route uses **Next.js App Router streaming `ReadableStream`**. Vercel does not apply the function timeout to the duration of an active streaming response — the 60s limit applies to function initialization, not to how long a stream can stay open. This means a streaming route can safely run for several minutes as long as data is being flushed progressively.

Route configuration:
```typescript
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby: 60s init, Pro: 300s
```

For Vercel Pro (recommended for this app), set `maxDuration = 300`. Data is flushed after each LLM call completes — the client receives progressive updates rather than waiting for the full pipeline.

### 3-Call LLM Pipeline

**Call A — Deep Analysis (~15–25s)**
Model: Claude claude-opus-4-6
Input: compressed image (base64) + optional inputs provided by user
Output: structured JSON (see schema below)

Single call replacing the original passes 1–3. Uses `response_format: { type: 'json_object' }` equivalent via a structured JSON output prompt. Returns classification + metal + gemstone + initial dimensions in one coherent analysis.

```typescript
interface CallAResult {
  is_jewelry: boolean;              // rejection gate — if false, pipeline stops
  jewelry_type: 'ring' | 'necklace' | 'bracelet' | 'earring' | 'brooch' | 'pendant' | 'set';
  complexity: 'simple' | 'moderate' | 'complex' | 'elaborate';
  style: string;                    // e.g. "art deco", "contemporary solitaire"
  component_count: number;
  metal: {
    type: 'yellow_gold' | 'rose_gold' | 'white_gold' | 'silver' | 'platinum' | 'palladium' | 'vermeil' | 'unknown';
    purity: '24k' | '18k' | '14k' | '10k' | '925' | '950' | '900' | 'unknown';
    finish: 'high_polish' | 'matte' | 'brushed' | 'hammered' | 'oxidized';
    construction: 'solid' | 'hollow' | 'plated' | 'filled';
    confidence: number;             // 0–100
  };
  stones: Array<{
    type: 'diamond' | 'ruby' | 'emerald' | 'sapphire' | 'amethyst' | 'topaz' | 'pearl' | 'opal' | 'garnet' | 'other' | 'unknown';
    cut: 'round_brilliant' | 'princess' | 'oval' | 'pear' | 'marquise' | 'cushion' | 'emerald_cut' | 'asscher' | 'radiant' | 'cabochon' | 'unknown';
    estimated_diameter_mm: number;
    color_grade: string;            // e.g. "G-H" for diamonds, "medium red" for rubies
    clarity_grade: string;          // e.g. "VS1-VS2" or "eye clean"
    setting_type: 'prong' | 'bezel' | 'pave' | 'channel' | 'tension' | 'flush' | 'invisible';
    count: number;
    confidence: number;             // 0–100
  }>;
  initial_dimensions_mm: {
    length: number; width: number; height: number;
    band_thickness?: number;        // for rings/bracelets
    wire_diameter?: number;         // for chains
  };
  notes: string;                    // any visible hallmarks, unusual features
}
```

**Call B — Dimension Cross-Validation (~10–15s)**
Model: GPT-4o Vision
Input: same compressed image (re-sent to GPT-4o) + Call A structured output as JSON context in system prompt
Cost note: image re-sent means ~$0.03 additional per analysis for GPT-4o vision tokens — included in cost estimate.

```typescript
interface CallBResult {
  dimensions_mm: { length: number; width: number; height: number; band_thickness?: number; wire_diameter?: number };
  stone_diameters_mm: number[];     // one per stone, matching Call A stone array order
  overall_confidence: number;       // GPT-4o's self-reported confidence 0–100
  notes: string;
}
```

**Call C — Synthesis (~8–12s)**
Model: Claude claude-opus-4-6
Input: Call A result + Call B result as structured JSON (no image re-sent)
Returns final `FinalAnalysis` after applying reconciliation algorithm and running deterministic calculations server-side for confidence scoring.

```typescript
interface FinalAnalysis {
  materials: MaterialEstimate[];
  overall_confidence: number;       // 0–100, weighted average across all materials
  accuracy_meter: number;           // 0–100, overall assessment quality
  dimension_conflicts: ConflictFlag[];
  suggestions: string[];            // ordered by accuracy impact
  call_a_raw: CallAResult;
  call_b_raw: CallBResult;
}

interface MaterialEstimate {
  label: string;                    // e.g. "18k Yellow Gold", "Round Brilliant Diamond"
  category: 'metal' | 'gemstone';
  weight_g?: number;                // metals only
  weight_min_g?: number;
  weight_max_g?: number;
  carat?: number;                   // gemstones only
  carat_min?: number;
  carat_max?: number;
  diameter_mm?: number;             // gemstones
  count?: number;                   // gemstones
  confidence: number;               // 0–100
  improve_with: string;             // e.g. "ring_size" — top input to add
}
```

### Cross-Validation Reconciliation Algorithm

Applied in Call C prompt + verified deterministically:

```
For each dimension field where both Call A and Call B have values:
  delta = abs(callA - callB) / max(callA, callB) * 100  // percentage difference

  if delta < 10%:
    final_value = callA * 0.6 + callB * 0.4             // weighted average
    confidence_adjustment = 0

  if 10% <= delta <= 25%:
    final_value = callA                                  // Claude preferred
    confidence_adjustment = -15

  if delta > 25%:
    final_value = min(callA, callB)                      // conservative
    confidence_adjustment = -25
    flag = { field, callA_value, callB_value, severity: 'low_confidence' }
```

### SSE Event Schema

```typescript
// Route: POST /api/analyze
// Content-Type: text/event-stream
// Client reconnects with Last-Event-ID header on drop

type SSEEvent =
  | { event: 'progress';         id: string; data: { stage: 'call_a' | 'call_b' | 'call_c'; label: string; percent: number } }
  | { event: 'call_a_complete';  id: string; data: CallAResult }
  | { event: 'call_b_complete';  id: string; data: CallBResult }
  | { event: 'complete';         id: string; data: FinalAnalysis }
  | { event: 'error';            id: string; data: SSEError }

interface SSEError {
  code: 'non_jewelry' | 'rate_limit' | 'api_unavailable' | 'timeout' | 'invalid_image' | 'internal';
  message: string;             // human-readable
  recoverable: boolean;
  retry_after_seconds?: number; // for rate_limit
}
```

Wire format:
```
event: progress
id: 1
data: {"stage":"call_a","label":"Identifying jewelry and materials...","percent":10}

event: call_a_complete
id: 2
data: {"is_jewelry":true,"jewelry_type":"ring",...}

event: progress
id: 3
data: {"stage":"call_b","label":"Cross-validating dimensions...","percent":60}

event: call_b_complete
id: 4
data: {"dimensions_mm":{...},...}

event: progress
id: 5
data: {"stage":"call_c","label":"Calculating material weights...","percent":85}

event: complete
id: 6
data: {"materials":[...],"overall_confidence":82,...}
```

Client reconnect: on `error` or `close`, client waits 2s then reconnects with `Last-Event-ID: {last_received_id}`. Route resumes from the appropriate stage based on last event ID. IDs are sequential integers.

### Non-Jewelry Rejection Criteria

After Call A, if `is_jewelry === false`, pipeline stops immediately (no Call B, no Call C, zero further API tokens consumed). The `is_jewelry` determination in the Call A prompt uses these criteria:

The image contains identifiable jewelry if: it shows a wearable ornament (ring, necklace, bracelet, earring, brooch, pendant, anklet, cuff) OR a loose gemstone or collection of gemstones.

Reject (not jewelry) if: the main subject is clothing, a watch, sunglasses, a bag, a jewelry box without jewelry, a person without visible jewelry, food, a certificate/document, or any non-wearable object. Watches are excluded (different analysis domain).

The prompt must ask the model to be liberal in accepting edge cases — when in doubt, mark `is_jewelry: true` and analyze.

---

## Error Handling Matrix

| Failure | HTTP Status | SSE Event | UI State | Behavior |
|---------|------------|-----------|----------|----------|
| Non-jewelry image | 200 (stream) | `error: non_jewelry` | "No jewelry detected — try a different photo" | Pipeline stops after Call A |
| Rate limit hit | 200 (stream) | `error: rate_limit` | "Too many requests — try again in X minutes" | Include `retry_after_seconds` |
| Claude API down | 200 (stream) | `error: api_unavailable` | "Analysis service unavailable — please try again" | Log, no retry |
| GPT-4o unavailable | 200 (stream) | `call_b_complete` with `confidence: 50` | Proceed with Call A dims only | Call B skipped, confidence -10% |
| Call A timeout | 200 (stream) | `error: timeout` | "Analysis timed out — try a smaller image" | No partial result |
| Invalid image format | 400 | — (pre-stream) | "Unsupported image format" | Rejected before stream |
| Body > 2MB | 413 | — (pre-stream) | "Image too large — compress before uploading" | Rejected before stream |
| PDF generation failure | 500 | — (separate endpoint) | "PDF unavailable — download JSON instead" | JSON fallback offered |
| CAD generation failure | Client-side | — | Toast: "Export failed — try again" | Other downloads unaffected |
| Stream drop (network) | — | Client reconnects | Spinner resumes | Auto-reconnect with Last-Event-ID |

---

## Material Calculation Engine (Client-Side, Deterministic)

Runs after `complete` SSE event. Pure TypeScript math, no AI.

### Confidence Score Formula

```typescript
function calculateConfidence(params: {
  base: number;              // 70 for photo-only
  dimensionUncertaintyPct: number;  // from cross-validation delta
  metalTypeKnown: boolean;
  metalPurityKnown: boolean;
  optionalInputs: OptionalInputs;
}): number {
  const dimPenalty = Math.min(params.dimensionUncertaintyPct / 2, 25);

  const materialPenalty =
    !params.metalTypeKnown ? 15 :
    !params.metalPurityKnown ? 5 : 0;

  const inputBonus = [
    params.optionalInputs.ringSizeProvided && 20,
    params.optionalInputs.knownLengthProvided && 25,
    params.optionalInputs.metalPurityProvided && 15,
    params.optionalInputs.stoneTypeProvided && 12,
    params.optionalInputs.sidePhotoProvided && 18,
    params.optionalInputs.backPhotoProvided && 10,
    params.optionalInputs.hallmarkPhotoProvided && 30,
    params.optionalInputs.knownWeightProvided && 35,
  ].filter(Boolean).reduce((a, b) => (a as number) + (b as number), 0) as number;

  return Math.min(Math.max(params.base - dimPenalty - materialPenalty + inputBonus, 0), 98);
}
```

Confidence → UI label mapping:
- 85–98: "High confidence" (green)
- 65–84: "Good estimate" (amber)
- 40–64: "Approximate" (orange)
- 0–39: "Rough estimate — add more info" (red)

### Uncertainty Propagation

Volume scales approximately with the square of cross-sectional dimensions. A ±10% linear dimension error yields ±20% volume/weight error.

```typescript
function weightRange(nominalWeight: number, dimensionUncertaintyPct: number) {
  const volumeUncertainty = dimensionUncertaintyPct * 2; // squared relationship
  return {
    nominal: nominalWeight,
    min: nominalWeight * (1 - volumeUncertainty / 100),
    max: nominalWeight * (1 + volumeUncertainty / 100),
  };
}
```

### Metal Volume Formulas (per jewelry type)

**Ring:**
```typescript
// Shank (partial torus, ~270° of full ring)
V_shank = Math.PI * wireRadius² * Math.PI * ringRadius * 0.75;  // 0.75 = 270/360

// Head/setting (box approximation with fill factor)
V_head = headLength * headWidth * headHeight * 0.60;  // 0.60 fill for prong settings

// Stone void displacement
V_stone_void = (4/3) * Math.PI * (stoneRadius * 0.5)³ * stoneCount;  // half-sphere below girdle

V_total_metal = V_shank + V_head - V_stone_void;
```

**Necklace/Chain:** Link-type density ratios × length × wire cross-section:
```typescript
const chainDensityRatio = { cable: 0.52, rope: 0.61, box: 0.48, figaro: 0.55, snake: 0.70, unknown: 0.55 };
V_chain = Math.PI * (wireRadius²) * chainLengthMm * chainDensityRatio[chainType];
// Pendants and clasps added separately as box primitives
```

**Bangle/Rigid Bracelet:** `V = π(R²-r²)h` where R=outer radius, r=inner radius, h=height

**Chain Bracelet:** same as necklace chain formula, shorter length

**Earring:** post cylinder + backing disc + decorative body
```typescript
V_post = Math.PI * (0.4)² * 12;        // standard post: 0.8mm dia, 12mm long
V_back = Math.PI * (3)² * 0.5;          // butterfly back: 6mm dia, 0.5mm thick
V_body = bodyLength * bodyWidth * bodyHeight * fillFactor;  // fillFactor by style
```

**Pendant:** `V = boundingBoxVolume × fillFactor`
- Geometric/solid: 0.80
- Filigree/openwork: 0.35
- Disc/coin: 0.85
- Relief/3D carving: 0.65

### Density Table (MJSA / GIA Material Standards, g/cm³)

```typescript
const METAL_DENSITY: Record<string, number> = {
  gold_24k: 19.32, gold_18k_yellow: 15.58, gold_18k_rose: 15.10,
  gold_18k_white: 14.80, gold_14k_yellow: 13.07, gold_14k_rose: 13.20,
  gold_14k_white: 12.90, gold_10k: 11.57, silver_999: 10.49,
  silver_925: 10.49, platinum_950: 21.45, platinum_900: 20.70,
  palladium: 12.02, vermeil: 10.49
};
```

### GIA Size-to-Carat Tables

```typescript
// Round Brilliant (diameter mm → carats)
const ROUND_BRILLIANT: [number, number][] = [
  [1.0, 0.005], [1.5, 0.015], [2.0, 0.030], [2.5, 0.060], [3.0, 0.110],
  [3.5, 0.170], [4.0, 0.250], [4.5, 0.350], [5.0, 0.500], [5.5, 0.660],
  [6.0, 0.840], [6.5, 1.000], [7.0, 1.250], [7.5, 1.500], [8.0, 2.000],
  [8.5, 2.430], [9.0, 2.750], [9.5, 3.350], [10.0, 3.870]
];

// Princess (mm side length → carats)
const PRINCESS: [number, number][] = [
  [2.0, 0.06], [2.5, 0.12], [3.0, 0.20], [3.5, 0.31], [4.0, 0.46],
  [4.5, 0.66], [5.0, 0.92], [5.5, 1.12], [6.0, 1.41], [6.5, 1.75], [7.0, 2.20]
];

// Oval: use round equivalent × 1.08 factor (same diameter as minor axis)
// Pear: L × W × depth_factor × 0.0018 (depth assumed 60% of width)
// Marquise: L × W × 0.00155 × depth_factor
// Emerald Cut: L × W × 0.0235 × depth_factor (depth assumed 65% of width)
```

Minimum reliable stone size: **< 1.0mm diameter** → flagged as "accent stones — count only, weight listed as trace."

Interpolation: linear between table entries.

### Setting Metal Allowance

```typescript
const SETTING_ALLOWANCE_G: Record<string, number> = {
  prong_4: 0.20, prong_6: 0.28, pave_per_stone: 0.06,
  tension: 0.05
};
// Bezel: computed — perimeterMm × heightMm × 0.8mm × metalDensity / 1000
// Channel: sideWallArea × 0.7mm × metalDensity / 1000
```

---

## CAD & File Generation (Client-Side except PDF)

### 2D DXF — Manual R2010 Text Generation

Written as plain text string in TypeScript. No external library. DXF R2010 format.

Layer structure:
- `OUTLINE` — main jewelry profile (LWPOLYLINE entities, color: white)
- `STONES` — stone positions as CIRCLE entities (color: cyan)
- `DIMENSIONS` — dimension lines (LINE entities, color: yellow)
- `ANNOTATIONS` — dimension text (MTEXT entities, color: yellow)

Units: mm (INSUNITS header: 4)

Three views generated: TOP (XY plane), FRONT (XZ plane), SIDE (YZ plane), offset by `max_dimension + 20mm` spacing.

Template structure:
```
0
SECTION
2
HEADER
9
$ACADVER
1
AC1024
... (INSUNITS, EXTMIN, EXTMAX, LIMMIN, LIMMAX headers)
0
ENDSEC
0
SECTION
2
TABLES
... (LAYER table with 4 layers defined)
0
ENDSEC
0
SECTION
2
ENTITIES
... (generated entities: LWPOLYLINEs, CIRCLEs, LINEs, MTEXTs)
0
ENDSEC
0
EOF
```

### 3D STL — Three.js Client-Side

Union of geometric primitives — **no CSG/boolean operations required** for v1. Each component is its own mesh; stones are represented as OctahedronGeometry inset at the metal surface as visual reference. Manufacturing-ready boolean subtraction is explicitly out of scope for v1.

Geometry builders per jewelry type:
```typescript
// Ring
const shank = new THREE.TorusGeometry(ringRadiusMm, wireRadiusMm, 16, 64, Math.PI * 1.5);
const stone = new THREE.OctahedronGeometry(stoneDiameterMm / 2);
stone.position.set(0, ringRadiusMm, 0);
const group = new THREE.Group(); group.add(shank, stone);

// Chain/Necklace: TubeGeometry along CatmullRomCurve3 arc
// Earring: assembled primitive group
```

STLExporter from `three-stdlib`:
```typescript
import { STLExporter } from 'three-stdlib';
const exporter = new STLExporter();
const stlString = exporter.parse(scene, { binary: true });
const blob = new Blob([stlString], { type: 'model/stl' });
```

### PDF Spec Sheet — pdf-lib (Server-Side)

Page size: A4 (595 × 842 pts)
Fonts: embedded subset of Inter (regular, bold) via pdf-lib font loading

Layout (top to bottom):
```
[Header bar — dark background, gold text: "JEWELRY MATERIAL ANALYSIS"]
[Subheader: Date, Analysis ID, Jewelry Type]
[Horizontal rule: gold]

[LEFT COLUMN 50%]                    [RIGHT COLUMN 50%]
Original photo (max 240px wide)      Annotated photo with material labels

[Full-width section: MATERIAL BREAKDOWN]
Table columns: Material | Quantity | Weight/Carat | Range | Confidence
One row per material estimate.

[Full-width section: GEMSTONE SPECIFICATIONS]
Table columns: Stone | Cut | Diameter | Color | Clarity | Setting | Count | Est. Carat

[Full-width section: DIMENSION ESTIMATES]
Text block: jewelry type, overall dimensions, band thickness, notes

[Full-width section: CALCULATION METHODOLOGY]
Brief text: "Metal weight calculated using [formula]. Gemstone weight from GIA size tables."

[Footer — italic, small]
"This report is an AI-generated estimate for reference purposes only.
 Accuracy varies with image quality and resolution. All figures represent
 approximate values with ranges shown. Not suitable for direct manufacturing
 use without professional verification. © Jewelry Analyzer [year]"
```

---

## Security & Rate Limiting

**Rate limits via Upstash Redis (`@upstash/ratelimit`):**
- 5 analyses per IP per hour (sliding window)
- 20 analyses per IP per day (fixed window)
- Rate limit is per pipeline run (one full 3-call sequence = one request)
- State is global across Vercel edge regions (Upstash is globally replicated)

**Behavior mid-pipeline:** Rate limit is checked once, before any LLM calls begin. If rate limit is hit mid-pipeline (race condition), the pipeline stops and returns `error: rate_limit` SSE event.

**Additional security:**
- Server-side file type validation (magic bytes check, not just MIME type)
- Body size hard limit: 2MB (Vercel default override in `next.config.js`)
- Non-jewelry early exit after Call A (no further token spend)
- Call A validates `is_jewelry` before proceeding to Call B/C

**Cost estimate per analysis:**
- Claude claude-opus-4-6 Call A (vision, ~1500 output tokens): ~$0.045
- GPT-4o Call B (vision re-send, ~500 output tokens): ~$0.030
- Claude claude-opus-4-6 Call C (no image, ~800 output tokens): ~$0.020
- pdf-lib PDF generation: $0 (compute only)
- **Total: ~$0.095/analysis** (range: $0.07–0.15 depending on complexity)

At 5 requests/IP/hour, max theoretical cost per active IP: ~$0.50/hour.

---

## Optional Inputs — Progressive Accuracy

| Input | Accuracy Boost | Implementation |
|-------|---------------|----------------|
| Ring size (US / UK / EU / diameter mm) | +20% | Converts to inner diameter mm → feeds ring geometry |
| Known length in cm or inches | +25% | Direct dimension override for necklace/bracelet |
| Metal purity (karat / fineness) | +15% | Overrides AI purity guess → exact density |
| Stone type (dropdown) | +12% | Overrides AI stone identification |
| Side-view photo | +18% | Sent alongside primary in Call A for dual-angle analysis |
| Back-view photo | +10% | Reveals clasp, backing components; sent in Call A |
| Hallmark close-up photo | +30% | Sent in Call A; AI reads hallmark directly |
| Known total weight in grams | +35% | Back-calculation: metal_weight = total - stone_weights |

**Accuracy Meter calculation:**
```typescript
const accuracyMeter = Math.min(65 + Object.values(inputBonuses).reduce((a, b) => a + b, 0), 98);
```

Displayed as a gold arc gauge (0–100) that animates upward as inputs are added.

---

## Image Upload — Client-Side Constraints

**HEIC handling:** `heic2any` (MIT license, good Safari/iOS support). Converts HEIC → JPEG blob before compression.

**Compression pipeline:**
```typescript
// 1. HEIC → JPEG if needed
const jpegBlob = file.type === 'image/heic' ? await heic2any({ blob: file, toType: 'image/jpeg' }) : file;

// 2. Compress
const compressed = await imageCompression(jpegBlob, {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: 'image/jpeg',
  exifOrientation: -1,    // strip EXIF
});

// 3. Base64 encode
const base64 = await toBase64(compressed);
```

Accepted: JPEG, PNG, WebP, HEIC. Max original size: 20MB. Min recommended resolution: 800×800px. Max images per request: 3 (primary + side + back).

---

## UI/UX Design

### Visual Theme — Luxury Dark
```css
--bg-primary:     #0a0a0a;
--bg-secondary:   #111111;
--bg-card:        #161616;
--gold-primary:   #D4AF37;
--gold-secondary: #C9A84C;
--gold-muted:     #8A7A5A;
--text-primary:   #F5F0E8;
--text-secondary: #A89880;
--border:         rgba(212, 175, 55, 0.2);
```
Fonts: Playfair Display (headings) + Inter (body/data)

### Page 1: Hero + Upload (`/`)
- Full-screen dark hero, animated gold particle canvas background
- Drag-and-drop upload zone, gold dashed border
- Tagline: *"Upload a photo. We'll tell you exactly what it's made of."*
- Optional inputs panel (collapsible, shows accuracy meter)
- Below fold: 3-step explainer + 3 sample result cards

### Page 2: Live Analysis (`/analyze/[id]`)
- 3 cards animate in as each call completes (Call A, B, C)
- Gold shimmer skeleton → populated data per card
- Accuracy meter animates as optional inputs are added
- Auto-reconnect on stream drop (silent, no UI flash)

### Page 3: Full Results (`/results/[id]`)
- Left: original photo ↔ annotated overlay toggle
- Right: material cards (weight + range + confidence bar + label)
- 3D viewer (OrbitControls: spin, zoom, pan)
- Download row: DXF / STL / PDF buttons (gold outlined)
- Collapsible calculation methodology
- Always-visible accuracy disclaimer

---

## API Routes

```
POST /api/analyze
  Headers: Content-Type: application/json
  Body: { imageBase64: string; mimeType: string; additionalImages?: string[]; inputs?: OptionalInputs }
  Response: text/event-stream (SSE, see event schema above)
  Rate limit: 5/IP/hour

POST /api/generate/pdf
  Body: { analysisData: FinalAnalysis; imageBase64: string }
  Response: application/pdf
  Rate limit: shared quota (one PDF per completed analysis)
```

DXF and STL: generated entirely client-side — no API routes needed.

---

## Project Structure

```
jewelry-analyzer/
├── app/
│   ├── page.tsx
│   ├── analyze/[id]/page.tsx
│   ├── results/[id]/page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts
│       └── generate/pdf/route.ts
├── lib/
│   ├── ai/
│   │   ├── pipeline.ts
│   │   ├── callA-deep-analysis.ts
│   │   ├── callB-dimensions.ts
│   │   ├── callC-synthesis.ts
│   │   ├── reconciliation.ts
│   │   └── prompts/
│   │       ├── callA.prompt.ts
│   │       ├── callB.prompt.ts
│   │       └── callC.prompt.ts
│   ├── calculations/
│   │   ├── metalWeight.ts
│   │   ├── gemstoneWeight.ts
│   │   ├── settingAllowance.ts
│   │   ├── confidence.ts
│   │   └── densityTable.ts
│   └── generators/
│       ├── dxfGenerator.ts          (manual R2010 text)
│       ├── stlGenerator.ts          (Three.js client-side)
│       └── pdfGenerator.ts          (pdf-lib server-side)
├── components/
│   ├── Upload/
│   │   ├── DropZone.tsx
│   │   └── OptionalInputs.tsx
│   ├── Analysis/
│   │   ├── CallCard.tsx
│   │   └── ProgressStream.tsx       (SSE client, auto-reconnect)
│   ├── Results/
│   │   ├── MaterialCard.tsx
│   │   ├── AnnotatedPhoto.tsx
│   │   ├── AccuracyMeter.tsx
│   │   └── DownloadButtons.tsx
│   └── Viewer3D/
│       ├── JewelryViewer.tsx
│       └── geometryBuilders.ts
├── middleware.ts                     (Upstash rate limiting)
├── types/analysis.ts
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=
AI_MODEL_PRIMARY=claude-opus-4-6         # verify at implementation time
OPENAI_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Accuracy Targets

| Scenario | Target Accuracy |
|----------|----------------|
| Photo only, good lighting | 65–75% |
| Photo + ring size | 80–85% |
| Photo + ring size + side view | 85–90% |
| Photo + known weight + purity | 90–95% |
| Photo + all inputs | 95%+ |

All weight/carat outputs include min–max ranges. Single-number estimates are never shown without bounds. Every result page shows the accuracy disclaimer prominently.
