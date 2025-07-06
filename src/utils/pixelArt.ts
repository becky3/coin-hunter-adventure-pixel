type PixelData = number[][];
type ColorMap = { [key: number]: string | null };

class PixelArtSprite {
    private pixelData: PixelData;
    private colors: ColorMap;
    public width: number;
    public height: number;
    public canvas: HTMLCanvasElement | null;
    public flippedCanvas: HTMLCanvasElement | null;

    constructor(pixelData: PixelData, colors: ColorMap) {
        if (!pixelData || !Array.isArray(pixelData) || pixelData.length === 0) {
            throw new Error('PixelArtSprite: pixelData must be a non-empty array');
        }
        if (!pixelData[0] || !Array.isArray(pixelData[0])) {
            throw new Error('PixelArtSprite: pixelData must be a 2D array');
        }
        
        this.pixelData = pixelData;
        this.colors = colors;
        this.width = pixelData[0].length;
        this.height = pixelData.length;
        this.canvas = null;
        this.flippedCanvas = null;
        this._render();
    }
    
    updatePalette(colors: ColorMap): void {
        this.colors = colors;
        this._render();
    }

    private _render(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        ctx.imageSmoothingEnabled = false;
        
        this._drawPixels(ctx, false);
        
        this.flippedCanvas = document.createElement('canvas');
        this.flippedCanvas.width = this.width;
        this.flippedCanvas.height = this.height;
        const flippedCtx = this.flippedCanvas.getContext('2d');
        if (!flippedCtx) {
            throw new Error('Failed to get 2D context from flipped canvas');
        }
        flippedCtx.imageSmoothingEnabled = false;
        
        this._drawPixels(flippedCtx, true);
    }

    private _drawPixels(ctx: CanvasRenderingContext2D, flipped = false): void {
        this.pixelData.forEach((row, y) => {
            row.forEach((pixel, x) => {
                if (pixel > 0 && this.colors[pixel]) {
                    ctx.fillStyle = this.colors[pixel] as string;
                    const drawX = flipped ? (this.width - 1 - x) : x;
                    ctx.fillRect(drawX, y, 1, 1);
                }
            });
        });
    }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, flipped = false, scale = 1): void {
        const source = flipped ? this.flippedCanvas : this.canvas;
        if (source) {
            ctx.drawImage(source, x, y, this.width * scale, this.height * scale);
        }
    }
}

class PixelArtAnimation {
    private frames: PixelArtSprite[];
    private frameDuration: number;
    private currentFrame: number;
    private lastFrameTime: number;

    constructor(frames: PixelData[], colors: ColorMap, frameDuration = 100) {
        this.frames = frames.map(frameData => new PixelArtSprite(frameData, colors));
        this.frameDuration = frameDuration;
        this.currentFrame = 0;
        this.lastFrameTime = 0;
    }

    update(currentTime: number): void {
        if (currentTime - this.lastFrameTime > this.frameDuration) {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            this.lastFrameTime = currentTime;
        }
    }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, flipped = false, scale = 1): void {
        this.frames[this.currentFrame].draw(ctx, x, y, flipped, scale);
    }

    reset(): void {
        this.currentFrame = 0;
        this.lastFrameTime = 0;
    }
}

class PixelArtRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public sprites: Map<string, PixelArtSprite>;
    public animations: Map<string, PixelArtAnimation>;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;
        this.sprites = new Map();
        this.animations = new Map();
    }

    addSprite(name: string, pixelData: PixelData, colors: ColorMap): void {
        this.sprites.set(name, new PixelArtSprite(pixelData, colors));
    }

    addAnimation(name: string, frames: PixelData[], colors: ColorMap, frameDuration = 100): void {
        this.animations.set(name, new PixelArtAnimation(frames, colors, frameDuration));
    }

    drawSprite(name: string, x: number, y: number, flipped = false): void {
        const sprite = this.sprites.get(name);
        if (sprite) {
            sprite.draw(this.ctx, x, y, flipped);
        }
    }

    drawAnimation(name: string, x: number, y: number, currentTime: number, flipped = false): void {
        const animation = this.animations.get(name);
        if (animation) {
            animation.update(currentTime);
            animation.draw(this.ctx, x, y, flipped);
        }
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    fillBackground(color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale = 1, color = '#FFFFFF'): void {
    const numbers: { [key: string]: PixelData } = {
        '0': [
            [1,1,1],
            [1,0,1],
            [1,0,1],
            [1,0,1],
            [1,1,1]
        ],
        '1': [
            [0,1,0],
            [1,1,0],
            [0,1,0],
            [0,1,0],
            [1,1,1]
        ],
        '2': [
            [1,1,1],
            [0,0,1],
            [1,1,1],
            [1,0,0],
            [1,1,1]
        ],
        '3': [
            [1,1,1],
            [0,0,1],
            [1,1,1],
            [0,0,1],
            [1,1,1]
        ],
        '4': [
            [1,0,1],
            [1,0,1],
            [1,1,1],
            [0,0,1],
            [0,0,1]
        ],
        '5': [
            [1,1,1],
            [1,0,0],
            [1,1,1],
            [0,0,1],
            [1,1,1]
        ],
        '6': [
            [1,1,1],
            [1,0,0],
            [1,1,1],
            [1,0,1],
            [1,1,1]
        ],
        '7': [
            [1,1,1],
            [0,0,1],
            [0,1,0],
            [0,1,0],
            [0,1,0]
        ],
        '8': [
            [1,1,1],
            [1,0,1],
            [1,1,1],
            [1,0,1],
            [1,1,1]
        ],
        '9': [
            [1,1,1],
            [1,0,1],
            [1,1,1],
            [0,0,1],
            [1,1,1]
        ]
    };

    ctx.fillStyle = color;
    let offsetX = 0;
    
    for (const char of text) {
        if (numbers[char]) {
            const charData = numbers[char];
            charData.forEach((row, y) => {
                row.forEach((pixel, x) => {
                    if (pixel) {
                        ctx.fillRect(
                            x * scale + offsetX + x,
                            y * scale + y,
                            scale,
                            scale
                        );
                    }
                });
            });
            offsetX += 4 * scale;
        } else if (char === ' ') {
            offsetX += 3 * scale;
        }
    }
}

export { PixelArtRenderer, PixelArtSprite, PixelArtAnimation, drawPixelText };
export type { PixelData, ColorMap };