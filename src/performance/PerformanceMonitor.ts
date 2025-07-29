import { PixelRenderer } from '../rendering/PixelRenderer';
import { Logger } from '../utils/Logger';

interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    memoryUsed: number;
    drawCalls: {
        drawSprite: number;
        drawRect: number;
        drawText: number;
        drawLine: number;
        total: number;
    };
    canvasOperations: {
        save: number;
        restore: number;
        setTransform: number;
        scale: number;
        translate: number;
        globalAlpha: number;
        fillRect: number;
        clearRect: number;
        drawImage: number;
    };
    pixelMetrics: {
        totalPixelsDrawn: number;
        overdrawRatio: number;
        offscreenDrawRatio: number;
        fillRectArea: number;
        clearRectArea: number;
    };
    layerMetrics: {
        background: { time: number; calls: number };
        tilemap: { time: number; calls: number };
        entities: { time: number; calls: number };
        hud: { time: number; calls: number };
    };
    gpuMetrics: {
        estimatedLoad: number;
        hardwareAcceleration: boolean;
        webglAvailable: boolean;
        gpuTier: string;
    };
    timestamp: number;
}

interface DrawCallHooks {
    originalDrawSprite: typeof PixelRenderer.prototype.drawSprite;
    originalDrawRect: typeof PixelRenderer.prototype.drawRect;
    originalDrawText: typeof PixelRenderer.prototype.drawText;
    originalDrawLine: typeof PixelRenderer.prototype.drawLine;
}

interface CanvasOperationHooks {
    originalSave: typeof CanvasRenderingContext2D.prototype.save;
    originalRestore: typeof CanvasRenderingContext2D.prototype.restore;
    originalSetTransform: typeof CanvasRenderingContext2D.prototype.setTransform;
    originalScale: typeof CanvasRenderingContext2D.prototype.scale;
    originalTranslate: typeof CanvasRenderingContext2D.prototype.translate;
    originalFillRect: typeof CanvasRenderingContext2D.prototype.fillRect;
    originalClearRect: typeof CanvasRenderingContext2D.prototype.clearRect;
    originalDrawImage: typeof CanvasRenderingContext2D.prototype.drawImage;
}

/**
 * Performance monitoring and measurement system
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor | null = null;
    private metrics: PerformanceMetrics[] = [];
    private maxMetricsHistory = 60;
    private lastRealFrameTime = 0;
    private frameCount = 0;
    private fpsUpdateInterval = 1000;
    private lastFpsUpdate = 0;
    private currentFps = 0;
    private enabled = false;
    private showOverlay = false;
    private renderer?: PixelRenderer;
    private drawCallHooks?: DrawCallHooks;
    private currentDrawCalls = {
        drawSprite: 0,
        drawRect: 0,
        drawText: 0,
        drawLine: 0,
        total: 0
    };
    
    private canvasOperationHooks?: CanvasOperationHooks;
    private currentCanvasOperations = {
        save: 0,
        restore: 0,
        setTransform: 0,
        scale: 0,
        translate: 0,
        globalAlpha: 0,
        fillRect: 0,
        clearRect: 0,
        drawImage: 0
    };
    
    private currentPixelMetrics = {
        totalPixelsDrawn: 0,
        overdrawMap: new Map<string, number>(),
        offscreenPixels: 0,
        onscreenPixels: 0,
        fillRectArea: 0,
        clearRectArea: 0
    };
    
    private currentLayerMetrics = {
        background: { time: 0, calls: 0, startTime: 0 },
        tilemap: { time: 0, calls: 0, startTime: 0 },
        entities: { time: 0, calls: 0, startTime: 0 },
        hud: { time: 0, calls: 0, startTime: 0 }
    };
    
    private gpuInfo = {
        estimatedLoad: 0,
        hardwareAcceleration: false,
        webglAvailable: false,
        gpuTier: 'unknown'
    };
    
    private currentLayer: keyof typeof this.currentLayerMetrics | null = null;
    private globalAlphaStack: number[] = [];

    private constructor() {}

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    initialize(renderer: PixelRenderer): void {
        this.renderer = renderer;
        this.enabled = true;
        this.installDrawCallHooks();
        this.installCanvasOperationHooks();
        this.detectGPUCapabilities();
        Logger.log('[PerformanceMonitor] Initialized');
    }

    private installDrawCallHooks(): void {
        if (!this.renderer) return;

        this.drawCallHooks = {
            originalDrawSprite: this.renderer.drawSprite.bind(this.renderer),
            originalDrawRect: this.renderer.drawRect.bind(this.renderer),
            originalDrawText: this.renderer.drawText.bind(this.renderer),
            originalDrawLine: this.renderer.drawLine.bind(this.renderer)
        };

        this.renderer.drawSprite = ((original => {
            return (...args: Parameters<typeof original>) => {
                if (this.enabled) {
                    this.currentDrawCalls.drawSprite++;
                    this.trackPixelMetrics('sprite', args[1], args[2], 16, 16);
                }
                return original.apply(this.renderer, args);
            };
        })(this.drawCallHooks.originalDrawSprite));

        this.renderer.drawRect = ((original => {
            return (...args: Parameters<typeof original>) => {
                if (this.enabled) {
                    this.currentDrawCalls.drawRect++;
                    this.trackPixelMetrics('rect', args[0], args[1], args[2], args[3]);
                }
                return original.apply(this.renderer, args);
            };
        })(this.drawCallHooks.originalDrawRect));

        this.renderer.drawText = ((original => {
            return (...args: Parameters<typeof original>) => {
                if (this.enabled) this.currentDrawCalls.drawText++;
                return original.apply(this.renderer, args);
            };
        })(this.drawCallHooks.originalDrawText));

        this.renderer.drawLine = ((original => {
            return (...args: Parameters<typeof original>) => {
                if (this.enabled) this.currentDrawCalls.drawLine++;
                return original.apply(this.renderer, args);
            };
        })(this.drawCallHooks.originalDrawLine));
    }
    
    private installCanvasOperationHooks(): void {
        if (!this.renderer || !this.renderer.ctx) return;
        
        const ctx = this.renderer.ctx;
        
        this.canvasOperationHooks = {
            originalSave: ctx.save.bind(ctx),
            originalRestore: ctx.restore.bind(ctx),
            originalSetTransform: ctx.setTransform.bind(ctx),
            originalScale: ctx.scale.bind(ctx),
            originalTranslate: ctx.translate.bind(ctx),
            originalFillRect: ctx.fillRect.bind(ctx),
            originalClearRect: ctx.clearRect.bind(ctx),
            originalDrawImage: ctx.drawImage.bind(ctx)
        };
        
        ctx.save = (() => {
            const original = this.canvasOperationHooks.originalSave;
            return function (this: CanvasRenderingContext2D) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.save++;
                    PerformanceMonitor.getInstance().globalAlphaStack.push(ctx.globalAlpha);
                }
                return original.call(this);
            };
        })();
        
        ctx.restore = (() => {
            const original = this.canvasOperationHooks.originalRestore;
            return function (this: CanvasRenderingContext2D) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.restore++;
                    PerformanceMonitor.getInstance().globalAlphaStack.pop();
                }
                return original.call(this);
            };
        })();
        
        ctx.setTransform = ((original => {
            return function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.setTransform++;
                }
                return original.apply(this, args);
            } as typeof original;
        })(this.canvasOperationHooks.originalSetTransform));
        
        ctx.scale = ((original => {
            return function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.scale++;
                }
                return original.apply(this, args);
            } as typeof original;
        })(this.canvasOperationHooks.originalScale));
        
        ctx.translate = ((original => {
            return function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.translate++;
                }
                return original.apply(this, args);
            } as typeof original;
        })(this.canvasOperationHooks.originalTranslate));
        
        ctx.fillRect = ((original => {
            return function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.fillRect++;
                    const [_x, _y, width, height] = args;
                    PerformanceMonitor.getInstance().currentPixelMetrics.fillRectArea += width * height;
                }
                return original.apply(this, args);
            } as typeof original;
        })(this.canvasOperationHooks.originalFillRect));
        
        ctx.clearRect = ((original => {
            return function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.clearRect++;
                    const [_x, _y, width, height] = args;
                    PerformanceMonitor.getInstance().currentPixelMetrics.clearRectArea += width * height;
                }
                return original.apply(this, args);
            } as typeof original;
        })(this.canvasOperationHooks.originalClearRect));
        
        ctx.drawImage = ((original => {
            return function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
                if (PerformanceMonitor.getInstance().enabled) {
                    PerformanceMonitor.getInstance().currentCanvasOperations.drawImage++;
                }
                return original.apply(this, args);
            } as typeof original;
        })(this.canvasOperationHooks.originalDrawImage));
        
    }
    
    private detectGPUCapabilities(): void {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
            
            this.gpuInfo.webglAvailable = !!gl;
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    Logger.log(`[PerformanceMonitor] GPU: ${vendor} - ${renderer}`);
                    
                    this.gpuInfo.gpuTier = this.estimateGPUTier(renderer);
                }
            }
            
            const ctx = this.renderer?.ctx;
            if (ctx) {
                this.gpuInfo.hardwareAcceleration = this.detectHardwareAcceleration(ctx);
            }
        } catch (error) {
            Logger.warn('[PerformanceMonitor] Failed to detect GPU capabilities:', error);
        }
    }
    
    private estimateGPUTier(renderer: string): string {
        const lowEndPatterns = /intel.*hd|intel.*uhd|mali|adreno [0-9]{1,3}[^0-9]/i;
        const midEndPatterns = /gtx 10[0-9]{2}|gtx 16[0-9]{2}|rx 5[0-9]{2}/i;
        const highEndPatterns = /rtx|gtx 20[0-9]{2}|rx 6[0-9]{2}|rx 7[0-9]{2}/i;
        
        if (highEndPatterns.test(renderer)) return 'high';
        if (midEndPatterns.test(renderer)) return 'mid';
        if (lowEndPatterns.test(renderer)) return 'low';
        return 'unknown';
    }
    
    private detectHardwareAcceleration(_ctx: CanvasRenderingContext2D): boolean {
        try {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            const testCtx = testCanvas.getContext('2d', { willReadFrequently: true });
            
            if (!testCtx) return false;
            
            testCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            testCtx.fillRect(0, 0, 1, 1);
            const imageData = testCtx.getImageData(0, 0, 1, 1);
            
            return imageData.data[3] === 128;
        } catch {
            return false;
        }
    }
    
    private trackPixelMetrics(_type: string, x: number, y: number, width: number, height: number): void {
        if (!this.renderer) return;
        
        const scale = this.renderer.scale;
        const screenWidth = this.renderer.ctx.canvas.width;
        const screenHeight = this.renderer.ctx.canvas.height;
        
        const scaledX = x * scale;
        const scaledY = y * scale;
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        
        const pixelCount = scaledWidth * scaledHeight;
        this.currentPixelMetrics.totalPixelsDrawn += pixelCount;
        
        const isOffscreen = scaledX + scaledWidth < 0 || scaledX > screenWidth ||
                          scaledY + scaledHeight < 0 || scaledY > screenHeight;
        
        if (isOffscreen) {
            this.currentPixelMetrics.offscreenPixels += pixelCount;
        } else {
            this.currentPixelMetrics.onscreenPixels += pixelCount;
            
            const key = `${Math.floor(scaledX / 32)},${Math.floor(scaledY / 32)}`;
            this.currentPixelMetrics.overdrawMap.set(key, 
                (this.currentPixelMetrics.overdrawMap.get(key) || 0) + 1);
        }
    }

    beginFrame(): void {
        if (!this.enabled) return;
        this.resetDrawCalls();
        this.resetCanvasOperations();
        this.resetPixelMetrics();
        this.resetLayerMetrics();
    }
    
    startLayer(layer: keyof typeof this.currentLayerMetrics): void {
        if (!this.enabled) return;
        this.currentLayer = layer;
        this.currentLayerMetrics[layer].startTime = performance.now();
    }
    
    endLayer(): void {
        if (!this.enabled || !this.currentLayer) return;
        const layer = this.currentLayer;
        const endTime = performance.now();
        this.currentLayerMetrics[layer].time += endTime - this.currentLayerMetrics[layer].startTime;
        this.currentLayerMetrics[layer].calls++;
        this.currentLayer = null;
    }

    endFrame(): void {
        if (!this.enabled) return;

        const currentTime = performance.now();
        const realFrameTime = this.lastRealFrameTime > 0 ? currentTime - this.lastRealFrameTime : 16.67;
        this.lastRealFrameTime = currentTime;

        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.currentFps = (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate);
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        this.currentDrawCalls.total = 
            this.currentDrawCalls.drawSprite +
            this.currentDrawCalls.drawRect +
            this.currentDrawCalls.drawText +
            this.currentDrawCalls.drawLine;

        const overdrawRatio = this.calculateOverdrawRatio();
        const offscreenRatio = this.currentPixelMetrics.totalPixelsDrawn > 0 ? 
            this.currentPixelMetrics.offscreenPixels / this.currentPixelMetrics.totalPixelsDrawn : 0;
        
        this.updateGPUEstimation();
        
        const metrics: PerformanceMetrics = {
            fps: this.currentFps,
            frameTime: realFrameTime,
            memoryUsed: this.getMemoryUsage(),
            drawCalls: { ...this.currentDrawCalls },
            canvasOperations: { ...this.currentCanvasOperations },
            pixelMetrics: {
                totalPixelsDrawn: this.currentPixelMetrics.totalPixelsDrawn,
                overdrawRatio: overdrawRatio,
                offscreenDrawRatio: offscreenRatio,
                fillRectArea: this.currentPixelMetrics.fillRectArea,
                clearRectArea: this.currentPixelMetrics.clearRectArea
            },
            layerMetrics: {
                background: { ...this.currentLayerMetrics.background },
                tilemap: { ...this.currentLayerMetrics.tilemap },
                entities: { ...this.currentLayerMetrics.entities },
                hud: { ...this.currentLayerMetrics.hud }
            },
            gpuMetrics: { ...this.gpuInfo },
            timestamp: currentTime
        };

        this.metrics.push(metrics);
        if (this.metrics.length > this.maxMetricsHistory) {
            this.metrics.shift();
        }
    }

    private resetDrawCalls(): void {
        this.currentDrawCalls.drawSprite = 0;
        this.currentDrawCalls.drawRect = 0;
        this.currentDrawCalls.drawText = 0;
        this.currentDrawCalls.drawLine = 0;
        this.currentDrawCalls.total = 0;
    }
    
    private resetCanvasOperations(): void {
        this.currentCanvasOperations.save = 0;
        this.currentCanvasOperations.restore = 0;
        this.currentCanvasOperations.setTransform = 0;
        this.currentCanvasOperations.scale = 0;
        this.currentCanvasOperations.translate = 0;
        this.currentCanvasOperations.globalAlpha = 0;
        this.currentCanvasOperations.fillRect = 0;
        this.currentCanvasOperations.clearRect = 0;
        this.currentCanvasOperations.drawImage = 0;
    }
    
    private resetPixelMetrics(): void {
        this.currentPixelMetrics.totalPixelsDrawn = 0;
        this.currentPixelMetrics.overdrawMap.clear();
        this.currentPixelMetrics.offscreenPixels = 0;
        this.currentPixelMetrics.onscreenPixels = 0;
        this.currentPixelMetrics.fillRectArea = 0;
        this.currentPixelMetrics.clearRectArea = 0;
    }
    
    private resetLayerMetrics(): void {
        for (const layer in this.currentLayerMetrics) {
            this.currentLayerMetrics[layer as keyof typeof this.currentLayerMetrics].time = 0;
            this.currentLayerMetrics[layer as keyof typeof this.currentLayerMetrics].calls = 0;
            this.currentLayerMetrics[layer as keyof typeof this.currentLayerMetrics].startTime = 0;
        }
    }
    
    private calculateOverdrawRatio(): number {
        if (this.currentPixelMetrics.overdrawMap.size === 0) return 0;
        
        let totalOverdraw = 0;
        let totalCells = 0;
        
        for (const [_key, count] of this.currentPixelMetrics.overdrawMap) {
            if (count > 1) {
                totalOverdraw += count - 1;
            }
            totalCells++;
        }
        
        return totalCells > 0 ? totalOverdraw / totalCells : 0;
    }
    
    private updateGPUEstimation(): void {
        const pixelThroughput = this.currentPixelMetrics.totalPixelsDrawn;
        const operations = this.currentCanvasOperations.save + this.currentCanvasOperations.restore +
                         this.currentCanvasOperations.setTransform + this.currentCanvasOperations.scale +
                         this.currentCanvasOperations.translate;
        
        const baseLoad = (pixelThroughput / 1000000) * 10;
        const operationLoad = (operations / 100) * 5;
        const overdrawPenalty = this.calculateOverdrawRatio() * 20;
        
        this.gpuInfo.estimatedLoad = Math.min(100, baseLoad + operationLoad + overdrawPenalty);
    }

    private getMemoryUsage(): number {
        if ('memory' in performance && performance.memory) {
            const memory = performance.memory as { usedJSHeapSize: number };
            return memory.usedJSHeapSize / (1024 * 1024);
        }
        return 0;
    }

    renderOverlay(renderer: PixelRenderer): void {
        if (!this.enabled || !this.showOverlay || this.metrics.length === 0) return;

        const latest = this.metrics[this.metrics.length - 1];
        if (!latest) {
            return;
        }
        const x = 5;
        let y = 35;
        const lineHeight = 10;
        const bgWidth = 200;
        const bgHeight = 150;

        renderer.drawRect(x - 2, y - 2, bgWidth, bgHeight, 0x00, true);

        renderer.drawText(`FPS: ${latest.fps.toFixed(1)}`, x, y, 0x62, 1, true);
        y += lineHeight;
        
        renderer.drawText(`FRAME TIME: ${latest.frameTime.toFixed(2)}MS`, x, y, 0x62, 1, true);
        y += lineHeight;
        
        if (latest.memoryUsed > 0) {
            renderer.drawText(`MEMORY: ${latest.memoryUsed.toFixed(1)}MB`, x, y, 0x62, 1, true);
            y += lineHeight;
        }

        y += lineHeight;
        renderer.drawText('DRAW CALLS:', x, y, 0x62, 1, true);
        y += lineHeight;
        
        renderer.drawText(`  SPRITES: ${latest.drawCalls.drawSprite}`, x, y, 0x62, 1, true);
        y += lineHeight;
        
        renderer.drawText(`  RECTS: ${latest.drawCalls.drawRect}`, x, y, 0x62, 1, true);
        y += lineHeight;
        
        renderer.drawText(`  TEXT: ${latest.drawCalls.drawText}`, x, y, 0x62, 1, true);
        y += lineHeight;
        
        renderer.drawText(`  TOTAL: ${latest.drawCalls.total}`, x, y, 0x62, 1, true);
        y += lineHeight;

        this.renderGraph(renderer, x, y + 10, 190, 40);
    }

    private renderGraph(renderer: PixelRenderer, x: number, y: number, width: number, height: number): void {
        renderer.drawRect(x, y, width, height, 0x00, true);
        renderer.drawRect(x, y, width, height, 0x62, false);

        if (this.metrics.length < 2) return;

        const maxFps = 60;
        const step = width / (this.maxMetricsHistory - 1);

        for (let i = 1; i < this.metrics.length; i++) {
            const prev = this.metrics[i - 1];
            const curr = this.metrics[i];
            if (!prev || !curr) {
                continue;
            }
            
            const x1 = x + (i - 1) * step;
            const x2 = x + i * step;
            const y1 = y + height - (prev.fps / maxFps) * height;
            const y2 = y + height - (curr.fps / maxFps) * height;

            const color = curr.fps >= 55 ? '#00FF00' : curr.fps >= 30 ? '#FFFF00' : '#FF0000';
            renderer.drawLine(x1, y1, x2, y2, color, 1);
        }

        renderer.drawText('60', x - 20, y - 4, 0x62, 1, true);
        renderer.drawText('0', x - 15, y + height - 4, 0x62, 1, true);
    }

    toggle(): void {
        this.showOverlay = !this.showOverlay;
        Logger.log(`[PerformanceMonitor] Overlay ${this.showOverlay ? 'enabled' : 'disabled'}`);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    getLatestMetrics(): PerformanceMetrics | null {
        if (this.metrics.length === 0) return null;
        const latest = this.metrics[this.metrics.length - 1];
        return latest !== undefined ? latest : null;
    }

    getAverageMetrics(): PerformanceMetrics | null {
        if (this.metrics.length === 0) return null;

        const sum = this.metrics.reduce((acc, metric) => {
            acc.fps += metric.fps;
            acc.frameTime += metric.frameTime;
            acc.memoryUsed += metric.memoryUsed;
            
            for (const key in metric.drawCalls) {
                acc.drawCalls[key as keyof typeof acc.drawCalls] += metric.drawCalls[key as keyof typeof metric.drawCalls];
            }
            
            for (const key in metric.canvasOperations) {
                acc.canvasOperations[key as keyof typeof acc.canvasOperations] += metric.canvasOperations[key as keyof typeof metric.canvasOperations];
            }
            
            acc.pixelMetrics.totalPixelsDrawn += metric.pixelMetrics.totalPixelsDrawn;
            acc.pixelMetrics.overdrawRatio += metric.pixelMetrics.overdrawRatio;
            acc.pixelMetrics.offscreenDrawRatio += metric.pixelMetrics.offscreenDrawRatio;
            acc.pixelMetrics.fillRectArea += metric.pixelMetrics.fillRectArea;
            acc.pixelMetrics.clearRectArea += metric.pixelMetrics.clearRectArea;
            
            for (const layer in metric.layerMetrics) {
                acc.layerMetrics[layer as keyof typeof acc.layerMetrics].time += metric.layerMetrics[layer as keyof typeof metric.layerMetrics].time;
                acc.layerMetrics[layer as keyof typeof acc.layerMetrics].calls += metric.layerMetrics[layer as keyof typeof metric.layerMetrics].calls;
            }
            
            acc.gpuMetrics.estimatedLoad += metric.gpuMetrics.estimatedLoad;
            
            return acc;
        }, this.createEmptyMetrics());

        const count = this.metrics.length;
        const avgMetrics = this.createEmptyMetrics();
        
        avgMetrics.fps = sum.fps / count;
        avgMetrics.frameTime = sum.frameTime / count;
        avgMetrics.memoryUsed = sum.memoryUsed / count;
        
        for (const key in sum.drawCalls) {
            avgMetrics.drawCalls[key as keyof typeof avgMetrics.drawCalls] = sum.drawCalls[key as keyof typeof sum.drawCalls] / count;
        }
        
        for (const key in sum.canvasOperations) {
            avgMetrics.canvasOperations[key as keyof typeof avgMetrics.canvasOperations] = sum.canvasOperations[key as keyof typeof sum.canvasOperations] / count;
        }
        
        avgMetrics.pixelMetrics.totalPixelsDrawn = sum.pixelMetrics.totalPixelsDrawn / count;
        avgMetrics.pixelMetrics.overdrawRatio = sum.pixelMetrics.overdrawRatio / count;
        avgMetrics.pixelMetrics.offscreenDrawRatio = sum.pixelMetrics.offscreenDrawRatio / count;
        avgMetrics.pixelMetrics.fillRectArea = sum.pixelMetrics.fillRectArea / count;
        avgMetrics.pixelMetrics.clearRectArea = sum.pixelMetrics.clearRectArea / count;
        
        for (const layer in sum.layerMetrics) {
            avgMetrics.layerMetrics[layer as keyof typeof avgMetrics.layerMetrics].time = sum.layerMetrics[layer as keyof typeof sum.layerMetrics].time / count;
            avgMetrics.layerMetrics[layer as keyof typeof avgMetrics.layerMetrics].calls = sum.layerMetrics[layer as keyof typeof sum.layerMetrics].calls / count;
        }
        
        avgMetrics.gpuMetrics = this.gpuInfo;
        avgMetrics.timestamp = Date.now();
        
        return avgMetrics;
    }
    
    private createEmptyMetrics(): PerformanceMetrics {
        return {
            fps: 0,
            frameTime: 0,
            memoryUsed: 0,
            drawCalls: { drawSprite: 0, drawRect: 0, drawText: 0, drawLine: 0, total: 0 },
            canvasOperations: {
                save: 0, restore: 0, setTransform: 0, scale: 0, translate: 0,
                globalAlpha: 0, fillRect: 0, clearRect: 0, drawImage: 0
            },
            pixelMetrics: {
                totalPixelsDrawn: 0, overdrawRatio: 0, offscreenDrawRatio: 0,
                fillRectArea: 0, clearRectArea: 0
            },
            layerMetrics: {
                background: { time: 0, calls: 0 },
                tilemap: { time: 0, calls: 0 },
                entities: { time: 0, calls: 0 },
                hud: { time: 0, calls: 0 }
            },
            gpuMetrics: {
                estimatedLoad: 0, hardwareAcceleration: false,
                webglAvailable: false, gpuTier: 'unknown'
            },
            timestamp: 0
        };
    }

    exportMetrics(): string {
        const headers = [
            'timestamp', 'fps', 'frameTime', 'memoryUsed',
            'drawSprite', 'drawRect', 'drawText', 'drawLine', 'totalDrawCalls',
            'save', 'restore', 'setTransform', 'scale', 'translate', 'globalAlpha',
            'fillRect', 'clearRect', 'drawImage',
            'totalPixelsDrawn', 'overdrawRatio', 'offscreenDrawRatio',
            'fillRectArea', 'clearRectArea',
            'bgTime', 'bgCalls', 'tilemapTime', 'tilemapCalls',
            'entitiesTime', 'entitiesCalls', 'hudTime', 'hudCalls',
            'gpuLoad', 'hardwareAccel', 'webGL', 'gpuTier'
        ];
        
        const rows = this.metrics.map(m => [
            m.timestamp,
            m.fps.toFixed(2),
            m.frameTime.toFixed(2),
            m.memoryUsed.toFixed(2),
            m.drawCalls.drawSprite,
            m.drawCalls.drawRect,
            m.drawCalls.drawText,
            m.drawCalls.drawLine,
            m.drawCalls.total,
            m.canvasOperations.save,
            m.canvasOperations.restore,
            m.canvasOperations.setTransform,
            m.canvasOperations.scale,
            m.canvasOperations.translate,
            m.canvasOperations.globalAlpha,
            m.canvasOperations.fillRect,
            m.canvasOperations.clearRect,
            m.canvasOperations.drawImage,
            m.pixelMetrics.totalPixelsDrawn,
            m.pixelMetrics.overdrawRatio.toFixed(3),
            m.pixelMetrics.offscreenDrawRatio.toFixed(3),
            m.pixelMetrics.fillRectArea,
            m.pixelMetrics.clearRectArea,
            m.layerMetrics.background.time.toFixed(2),
            m.layerMetrics.background.calls,
            m.layerMetrics.tilemap.time.toFixed(2),
            m.layerMetrics.tilemap.calls,
            m.layerMetrics.entities.time.toFixed(2),
            m.layerMetrics.entities.calls,
            m.layerMetrics.hud.time.toFixed(2),
            m.layerMetrics.hud.calls,
            m.gpuMetrics.estimatedLoad.toFixed(1),
            m.gpuMetrics.hardwareAcceleration,
            m.gpuMetrics.webglAvailable,
            m.gpuMetrics.gpuTier
        ].join(','));

        return [headers.join(','), ...rows].join('\n');
    }
    
    logDetailedMetrics(): void {
        const avg = this.getAverageMetrics();
        if (!avg) return;
        
        Logger.log('[PerformanceMonitor] === DETAILED PERFORMANCE METRICS ===');
        Logger.log(`[PerformanceMonitor] FPS: ${avg.fps.toFixed(1)} | Frame Time: ${avg.frameTime.toFixed(2)}ms`);
        Logger.log(`[PerformanceMonitor] Memory: ${avg.memoryUsed.toFixed(1)}MB`);
        
        Logger.log('[PerformanceMonitor] -- Draw Calls --');
        Logger.log(`  Sprites: ${avg.drawCalls.drawSprite.toFixed(0)} | Rects: ${avg.drawCalls.drawRect.toFixed(0)}`);
        Logger.log(`  Text: ${avg.drawCalls.drawText.toFixed(0)} | Lines: ${avg.drawCalls.drawLine.toFixed(0)}`);
        Logger.log(`  Total: ${avg.drawCalls.total.toFixed(0)}`);
        
        Logger.log('[PerformanceMonitor] -- Canvas Operations --');
        Logger.log(`  Save/Restore: ${avg.canvasOperations.save.toFixed(0)}/${avg.canvasOperations.restore.toFixed(0)}`);
        Logger.log(`  Transforms: ${avg.canvasOperations.setTransform.toFixed(0)} | Scale: ${avg.canvasOperations.scale.toFixed(0)} | Translate: ${avg.canvasOperations.translate.toFixed(0)}`);
        Logger.log(`  Global Alpha Changes: ${avg.canvasOperations.globalAlpha.toFixed(0)}`);
        Logger.log(`  FillRect: ${avg.canvasOperations.fillRect.toFixed(0)} | ClearRect: ${avg.canvasOperations.clearRect.toFixed(0)}`);
        
        Logger.log('[PerformanceMonitor] -- Pixel Metrics --');
        Logger.log(`  Total Pixels Drawn: ${(avg.pixelMetrics.totalPixelsDrawn / 1000000).toFixed(2)}M`);
        Logger.log(`  Overdraw Ratio: ${avg.pixelMetrics.overdrawRatio.toFixed(3)}`);
        Logger.log(`  Offscreen Draw Ratio: ${(avg.pixelMetrics.offscreenDrawRatio * 100).toFixed(1)}%`);
        
        Logger.log('[PerformanceMonitor] -- Layer Performance --');
        Logger.log(`  Background: ${avg.layerMetrics.background.time.toFixed(2)}ms (${avg.layerMetrics.background.calls} calls)`);
        Logger.log(`  Tilemap: ${avg.layerMetrics.tilemap.time.toFixed(2)}ms (${avg.layerMetrics.tilemap.calls} calls)`);
        Logger.log(`  Entities: ${avg.layerMetrics.entities.time.toFixed(2)}ms (${avg.layerMetrics.entities.calls} calls)`);
        Logger.log(`  HUD: ${avg.layerMetrics.hud.time.toFixed(2)}ms (${avg.layerMetrics.hud.calls} calls)`);
        
        Logger.log('[PerformanceMonitor] -- GPU Info --');
        Logger.log(`  Estimated GPU Load: ${avg.gpuMetrics.estimatedLoad.toFixed(1)}%`);
        Logger.log(`  Hardware Acceleration: ${avg.gpuMetrics.hardwareAcceleration}`);
        Logger.log(`  WebGL Available: ${avg.gpuMetrics.webglAvailable}`);
        Logger.log(`  GPU Tier: ${avg.gpuMetrics.gpuTier}`);
        Logger.log('[PerformanceMonitor] ===================================');
    }

    reset(): void {
        this.metrics = [];
        this.frameCount = 0;
        this.currentFps = 0;
        this.lastFpsUpdate = 0;
        this.resetDrawCalls();
    }
}