/**
 * Capitalize a string keeping the original type
 * @param s
 * @returns
 */
export function capitalizeFist<T extends string>(s: T): string {
  return (s[0].toUpperCase() + s.slice(1)).trim() as typeof s;
}

/**
 * Converts a kebab-case string to PascalCase, if it is not already PascalCase.
 * @param input
 * @returns
 */
export function kebabToPascalCase(input: string): string {
  if (!input.includes('-')) {
    // String is already PascalCase, so return it as is
    return capitalizeFist(input).trim();
  }
  const words = input.split('-');
  const pascalWords = words.map((word) =>
    (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).trim(),
  );
  return pascalWords.join('');
}

/**
 * converts a PascalCase string to kebab-case
 * @param input
 * @returns
 */
export function pascalCaseToKebabCase(input: string): string {
  const words = input.split(/(?=[A-Z])/);
  const kebabWords = words.map((word) => word.toLowerCase());
  return kebabWords.join('-').trim();
}
/**
 * Trims dashes from the beginning and end of a string
 * @param input
 * @returns
 * @example trimDashes('---hello---') // 'hello'
 */
export function trimDashes(input: string): string {
  return input
    .trim()
    .replace(/^-+|-+$/g, '')
    .trim();
}
