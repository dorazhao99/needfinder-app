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
