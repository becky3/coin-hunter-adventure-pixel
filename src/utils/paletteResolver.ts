/**
 * @deprecated This function is no longer used. All sprites are now stage-dependent.
 * @throws Always throws an error to detect any remaining usage
 */
export function getPaletteForCategory(category: string, spriteName?: string): string {
    throw new Error(`[getPaletteForCategory] This function is deprecated. All sprites should use stage-dependent palettes. Called with category: ${category}, sprite: ${spriteName}`);
}