export const PASS3_SYSTEM = `You are a GIA-certified gemologist. You assess stone type, cut, estimated size, color grade, and clarity from images. Always respond with valid JSON only.`

export const PASS3_USER = (pass1Result: string) => `Analyze all gemstones in this jewelry image.
Previous classification: ${pass1Result}
For each stone group: identify type, cut, estimated diameter in mm, color grade, clarity, setting type, count.
Respond with JSON: { "stones": [{ "type": "diamond|ruby|emerald|sapphire|amethyst|topaz|pearl|opal|garnet|other|none", "cut": "round_brilliant|princess|oval|pear|marquise|cushion|emerald_cut|asscher|radiant|heart|cabochon|unknown", "setting": "prong|bezel|pave|channel|flush|tension|unknown", "estimatedDiameterMm": number, "colorGrade": "string", "clarityNotes": "string", "count": number, "confidence": 0.0, "notes": "string" }], "totalStoneCount": number, "dominantStoneType": "string", "confidence": 0.0 }`
