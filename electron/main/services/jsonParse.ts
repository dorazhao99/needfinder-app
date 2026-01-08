export function replacePlaceholders(
    template: string,
    placeholders: Record<string, string | number>
  ): string {
    let result = template;
  
    for (const [key, value] of Object.entries(placeholders)) {
      const stringValue = String(value);
      
      // Replace double brackets: {{key}}
      result = result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        stringValue
      );
      
      // Replace single brackets: {key}
      result = result.replace(
        new RegExp(`\\{${key}\\}`, 'g'),
        stringValue
      );
      
      // Replace without brackets: key
      result = result.replace(
        new RegExp(`\\b${key}\\b`, 'g'),
        stringValue
      );
    }
  
    return result;
  }

export function isEmptyString(str: string): boolean {
    // Remove all quotes (single and double) and whitespace
    const cleaned = str.replace(/["'\s]/g, '');
    return cleaned.length === 0;
}

// Regular expression to match JSON blocks in Markdown code fences
const JSON_BLOCK_RE = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;

// Smart quotes translation map
const SMART_QUOTES_MAP: Record<string, string> = {
    '\u201c': '"', // Left double quotation mark
    '\u201d': '"', // Right double quotation mark
    '\u2018': "'", // Left single quotation mark
    '\u2019': "'", // Right single quotation mark
};

/**
 * Extract the most likely JSON snippet from model output.
 * 
 * Tries to handle Markdown code fences and extra commentary commonly added by LLMs.
 */
function extractJsonSnippet(text: string): string {
    if (!text) {
        throw new Error("No text supplied for JSON extraction.");
    }

    const match = JSON_BLOCK_RE.exec(text);
    let candidate: string;
    
    if (match) {
        candidate = match[1];
    } else {
        // Fall back to slicing from the first opening brace/bracket to the last closing one.
        const braceMatch = text.match(/[{\[]/);
        if (!braceMatch) {
            throw new Error("No JSON object or array detected in model response.");
        }
        
        const opening = braceMatch[0];
        const closing = opening === "{" ? "}" : "]";
        const start = braceMatch.index!;
        const end = text.lastIndexOf(closing);
        
        if (end === -1) {
            throw new Error("Could not find matching closing bracket for JSON payload.");
        }
        
        candidate = text.substring(start, end + 1);
    }

    candidate = candidate.trim();
    if (!candidate) {
        throw new Error("Extracted JSON snippet is empty.");
    }
    
    return candidate;
}


export function parseModelJson(
    text: string, 
    logger?: (message: string) => void
): any {
    const snippet = extractJsonSnippet(text);

    const tryParse = (payload: string): any => {
        return JSON.parse(payload);
    };

    try {
        return tryParse(snippet);
    } catch (error) {
        // Replace smart quotes
        let sanitised = snippet;
        for (const [smartQuote, normalQuote] of Object.entries(SMART_QUOTES_MAP)) {
            sanitised = sanitised.replace(new RegExp(smartQuote, 'g'), normalQuote);
        }
        
        // Strip trailing commas before closing braces/brackets
        sanitised = sanitised.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unquoted identifiers in arrays: [IDENTIFIER] -> ["IDENTIFIER"]
        // Matches [ followed by optional whitespace, then an unquoted identifier (word starting with letter/underscore),
        // then optional whitespace and ]. The identifier can be uppercase, lowercase, or mixed case.
        sanitised = sanitised.replace(/\[\s*([A-Za-z_][A-Za-z0-9_]*)\s*\]/g, '["$1"]');
        
        // Fix unquoted identifiers as array elements: [..., IDENTIFIER, ...] -> [..., "IDENTIFIER", ...]
        // This handles cases like [item1, item2, TEXTBOX] where TEXTBOX is unquoted
        // Match unquoted identifiers that appear after a comma or at the start of an array
        sanitised = sanitised.replace(/(\[[^\]]*?),\s*([A-Za-z_][A-Za-z0-9_]*)\s*([,\]])/g, '$1, "$2"$3');
        sanitised = sanitised.replace(/(\[)\s*([A-Za-z_][A-Za-z0-9_]*)\s*([,\]])/g, '$1"$2"$3');
        
        // Fix unquoted identifiers as property values: "key": IDENTIFIER -> "key": "IDENTIFIER"
        // This handles cases like "modality": TEXTBOX (without brackets)
        // Also handles single quotes: 'modality': TEXTBOX
        sanitised = sanitised.replace(/(["']:\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*[,\}])/g, '$1"$2"$3');
        console.log('Sanitised', sanitised, 'Pre-parsed', snippet);
        try {
            if (logger) {
                logger("Parsed JSON after sanitising LLM output.");
            }
            return tryParse(sanitised);
        } catch (exc) {
            throw new Error(
                `Unable to parse JSON from model response: ${exc instanceof Error ? exc.message : exc}`
            );
        }
    }
}
