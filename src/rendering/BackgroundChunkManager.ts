/**
 * Manages background elements in spatial chunks for efficient culling
 */
export interface ElementPosition {
    x: number;
    y: number;
    spriteKey: string;
}

/**
 * Manages background elements in spatial chunks for efficient culling
 */
export class BackgroundChunkManager {
    private chunkSize: number;
    private chunks: Map<number, ElementPosition[]> = new Map();
    
    constructor(chunkSize: number = 512) {
        this.chunkSize = chunkSize;
    }
    
    addElement(x: number, y: number, spriteKey: string): void {
        const chunkIndex = this.getChunkIndex(x);
        
        if (!this.chunks.has(chunkIndex)) {
            this.chunks.set(chunkIndex, []);
        }
        
        const chunk = this.chunks.get(chunkIndex);
        if (chunk) {
            chunk.push({ x, y, spriteKey });
        }
    }
    
    getElementsInRange(startX: number, endX: number): ElementPosition[] {
        const startChunk = this.getChunkIndex(startX);
        const endChunk = this.getChunkIndex(endX);
        
        const elements: ElementPosition[] = [];
        
        for (let chunk = startChunk; chunk <= endChunk; chunk++) {
            const chunkElements = this.chunks.get(chunk);
            if (chunkElements) {
                for (const element of chunkElements) {
                    if (element.x >= startX && element.x <= endX) {
                        elements.push(element);
                    }
                }
            }
        }
        
        return elements;
    }
    
    private getChunkIndex(x: number): number {
        return Math.floor(x / this.chunkSize);
    }
    
    clear(): void {
        this.chunks.clear();
    }
    
    getTotalElements(): number {
        let count = 0;
        this.chunks.forEach(chunk => {
            count += chunk.length;
        });
        return count;
    }
}