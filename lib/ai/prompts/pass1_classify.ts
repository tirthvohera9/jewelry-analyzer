export const PASS1_SYSTEM = `You are a professional jewelry appraiser and gemologist with 20 years of experience. Analyze jewelry photographs with extreme precision. Always respond with valid JSON only. No markdown. No explanation outside the JSON.`

export const PASS1_USER = (optionalInputs: string) => `Analyze this jewelry image. Identify jewelry type, design style, approximate era, number of metal components, presence of gemstones, overall complexity, visible hallmarks, and surface treatments.
${optionalInputs ? `User provided context: ${optionalInputs}` : ''}
Respond with JSON: { "jewelryType": "ring|necklace|bracelet|earring|pendant|brooch|unknown", "designStyle": "string", "era": "string", "metalComponentCount": number, "hasStones": boolean, "estimatedStoneCount": number, "complexity": "simple|moderate|complex|elaborate", "visibleHallmarks": "string or null", "surfaceTreatments": ["string"], "confidence": 0.0, "notes": "string" }`
