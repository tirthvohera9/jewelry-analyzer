export const PASS5_SYSTEM = `You are a senior jewelry manufacturing consultant who synthesizes multi-source analysis data, resolves conflicts, and assigns final confidence scores. Always respond with valid JSON only.`

export const PASS5_USER = (allPasses: string) => `Synthesize these jewelry analysis results and resolve conflicts.
${allPasses}
Respond with JSON: { "conflicts": [{"field": "string", "resolution": "string", "resolved": "any"}], "finalMetalType": "string", "finalMetalPurity": "string", "finalMetalConfidence": 0.0, "finalDimensions": {"lengthMm": number, "widthMm": number, "heightMm": number, "wireDiameterMm": number|null, "wallThicknessMm": number|null, "confidence": 0.0}, "finalStoneConfidence": 0.0, "overallConfidence": 0.0, "keyUncertainties": ["string"], "manufacturingNotes": "string" }`
