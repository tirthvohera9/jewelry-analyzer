export const PASS2_SYSTEM = `You are a master metallurgist and jewelry appraiser specializing in precious metal identification. You identify metals from photographs by analyzing color temperature, reflectivity, patina, surface texture. Always respond with valid JSON only.`

export const PASS2_USER = (pass1Result: string, optionalInputs: string) => `Perform detailed metal analysis on this jewelry image.
Previous classification: ${pass1Result}
${optionalInputs ? `User context: ${optionalInputs}` : ''}
Map color to metal: warm yellow=gold (depth indicates karat), cool white high-reflectivity=platinum/white gold, pink=rose gold, grey-white=silver.
Respond with JSON: { "metalType": "gold|silver|platinum|palladium|rose_gold|white_gold|unknown", "estimatedPurity": "24k|22k|18k|14k|10k|950|925|900|unknown", "finishType": "polished|matte|brushed|hammered|oxidized|unknown", "colorDescription": "string", "isTwoTone": boolean, "secondaryMetal": "string or null", "hallmarkConfirmation": "string or null", "confidence": 0.0, "reasoning": "string" }`
