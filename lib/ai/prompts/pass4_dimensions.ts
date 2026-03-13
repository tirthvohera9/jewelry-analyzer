export const PASS4_SYSTEM = `You are a precision measurement specialist who estimates jewelry dimensions from photographs using proportional analysis and anatomical references. Always respond with valid JSON only.`

export const PASS4_USER = (pass1Result: string, pass3Result: string, optionalInputs: string) => `Estimate precise dimensions of this jewelry piece in mm.
Classification: ${pass1Result}
Stone analysis: ${pass3Result}
${optionalInputs ? `User measurements (prioritize these): ${optionalInputs}` : ''}
References: women's ring finger ~17mm, men's ~20mm, standard necklace 400-460mm, bracelet 180-200mm inner.
Respond with JSON: { "lengthMm": number, "widthMm": number, "heightMm": number, "wireDiameterMm": number|null, "wallThicknessMm": number|null, "stonesDiameterMm": number|null, "scalingReference": "string", "confidence": 0.0, "confidencePerDimension": { "length": 0.0, "width": 0.0, "height": 0.0 } }`
