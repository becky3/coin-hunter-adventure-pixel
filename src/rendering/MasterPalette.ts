/**
 * Master palette containing all available colors for the game
 * Based on retro game color limitations
 */
export class MasterPalette {
    private static readonly colors: Record<number, string> = {
        0x00: '#000000',
        0x01: '#757575',
        0x02: '#BCBCBC',
        0x03: '#FFFFFF',
        
        0x10: '#0000AB',
        0x11: '#233BEF',
        0x12: '#5F73FF',
        0x13: '#C7D7FF',
        
        0x20: '#8F0077',
        0x21: '#BF00BF',
        0x22: '#F77BFF',
        0x23: '#FFC7FF',
        
        0x30: '#AB0013',
        0x31: '#E7005B',
        0x32: '#FF77B7',
        0x33: '#FFC7DB',
        
        0x40: '#A70000',
        0x41: '#DB2B00',
        0x42: '#FF7763',
        0x43: '#FFBFB3',
        
        0x50: '#432F00',
        0x51: '#8B7300',
        0x52: '#F3BF3F',
        0x53: '#FFE7A3',
        
        0x60: '#004700',
        0x61: '#009700',
        0x62: '#83D313',
        0x63: '#E3FFA3',
        
        0x70: '#7B7B00',
        0x71: '#90DB6A',
        0x80: '#1C0092',
        0x81: '#3C37FF',
        0x90: '#3D1C7D',
        0x91: '#8B55FC',
    };

    /**
     * Get color hex value by master palette index
     * @param index Master palette index (0x00-0x91)
     * @returns Color hex string or magenta if undefined
     */
    static getColor(index: number): string {
        if (!(index in this.colors)) {
            throw new Error(`[MasterPalette] Invalid color index 0x${index.toString(16).toUpperCase()}. Valid indices are: ${Object.keys(this.colors).map(k => '0x' + parseInt(k).toString(16).toUpperCase()).join(', ')}`);
        }
        const color = this.colors[index];
        if (!color) {
            throw new Error(`[MasterPalette] Color not found for index 0x${index.toString(16).toUpperCase()}`);
        }
        return color;
    }

    /**
     * Check if index is valid
     * @param index Master palette index
     * @returns True if index exists in master palette
     */
    static isValidIndex(index: number): boolean {
        return index in this.colors;
    }

    /**
     * Get all available color indices
     * @returns Array of all valid indices
     */
    static getAvailableIndices(): number[] {
        return Object.keys(this.colors).map(key => parseInt(key));
    }
}