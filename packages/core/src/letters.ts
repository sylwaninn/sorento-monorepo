const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const extractVariables = (template: string): string[] => {
  const variables = new Set<string>();
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    // Stryker disable next-line ConditionalExpression: equivalent mutant. The capture group is
    // mandatory, so a match always carries it; the guard exists for noUncheckedIndexedAccess.
    if (name) variables.add(name);
  }
  return [...variables];
};

export interface LetterResolution {
  body: string;
  missingVariables: string[];
}

// Missing/empty variables stay visible in the body so the UI can highlight them (E15).
export const resolveLetterVariables = (
  template: string,
  values: Record<string, string>,
): LetterResolution => {
  const missingVariables: string[] = [];
  const body = template.replace(VARIABLE_PATTERN, (fullMatch, name: string) => {
    const value = values[name];
    if (value === undefined || value === "") {
      if (!missingVariables.includes(name)) missingVariables.push(name);
      return fullMatch;
    }
    return value;
  });
  return { body, missingVariables };
};
