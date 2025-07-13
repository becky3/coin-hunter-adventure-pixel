import { BackgroundElement } from './BackgroundRenderer';

/**
 * Object pool for background elements to reduce GC pressure
 */
export class BackgroundElementPool {
    private activeElements: Set<BackgroundElement> = new Set();
    private inactiveElements: BackgroundElement[] = [];
    private elementType: 'cloud' | 'tree';
    
    constructor(elementType: 'cloud' | 'tree') {
        this.elementType = elementType;
    }
    
    acquire(x: number, y: number, spriteKey: string): BackgroundElement {
        let element: BackgroundElement;
        
        if (this.inactiveElements.length > 0) {
            element = this.inactiveElements.pop() as BackgroundElement;
            element.x = x;
            element.y = y;
            element.spriteKey = spriteKey;
        } else {
            element = {
                type: this.elementType,
                x,
                y,
                spriteKey
            };
        }
        
        this.activeElements.add(element);
        return element;
    }
    
    release(element: BackgroundElement): void {
        if (this.activeElements.has(element)) {
            this.activeElements.delete(element);
            this.inactiveElements.push(element);
        }
    }
    
    releaseAll(): void {
        this.activeElements.forEach(element => {
            this.inactiveElements.push(element);
        });
        this.activeElements.clear();
    }
    
    getActiveElements(): BackgroundElement[] {
        return Array.from(this.activeElements);
    }
    
    getActiveCount(): number {
        return this.activeElements.size;
    }
}