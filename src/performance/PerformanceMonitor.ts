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
    timestamp: number;
}

interface DrawCallHooks {
    originalDrawSprite: typeof PixelRenderer.prototype.drawSprite;
    originalDrawRect: typeof PixelRenderer.prototype.drawRect;
    originalDrawText: typeof PixelRenderer.prototype.drawText;
    originalDrawLine: typeof PixelRenderer.prototype.drawLine;
}

/**
 * Performance monitoring and measurement system
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor | null = null;
    private metrics: PerformanceMetrics[] = [];
    private maxMetricsHistory = 60;
    private lastFrameTime = 0;
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

        this.renderer.drawSprite = (...args: Parameters<typeof PixelRenderer.prototype.drawSprite>) => {
            if (this.enabled) this.currentDrawCalls.drawSprite++;
            if (this.drawCallHooks) {
                return this.drawCallHooks.originalDrawSprite.apply(this.renderer, args);
            }
            return undefined;
        };

        this.renderer.drawRect = (...args: Parameters<typeof PixelRenderer.prototype.drawRect>) => {
            if (this.enabled) this.currentDrawCalls.drawRect++;
            if (this.drawCallHooks) {
                return this.drawCallHooks.originalDrawRect.apply(this.renderer, args);
            }
        };

        this.renderer.drawText = (...args: Parameters<typeof PixelRenderer.prototype.drawText>) => {
            if (this.enabled) this.currentDrawCalls.drawText++;
            if (this.drawCallHooks) {
                return this.drawCallHooks.originalDrawText.apply(this.renderer, args);
            }
        };

        this.renderer.drawLine = (...args: Parameters<typeof PixelRenderer.prototype.drawLine>) => {
            if (this.enabled) this.currentDrawCalls.drawLine++;
            if (this.drawCallHooks) {
                return this.drawCallHooks.originalDrawLine.apply(this.renderer, args);
            }
        };
    }

    beginFrame(): void {
        if (!this.enabled) return;
        this.lastFrameTime = performance.now();
        this.resetDrawCalls();
    }

    endFrame(): void {
        if (!this.enabled) return;

        const currentTime = performance.now();
        const frameTime = currentTime - this.lastFrameTime;

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

        const metrics: PerformanceMetrics = {
            fps: this.currentFps,
            frameTime: frameTime,
            memoryUsed: this.getMemoryUsage(),
            drawCalls: { ...this.currentDrawCalls },
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

    private getMemoryUsage(): number {
        if ('memory' in performance && performance.memory) {
            return performance.memory.usedJSHeapSize / (1024 * 1024);
        }
        return 0;
    }

    renderOverlay(renderer: PixelRenderer): void {
        if (!this.enabled || !this.showOverlay || this.metrics.length === 0) return;

        const latest = this.metrics[this.metrics.length - 1];
        const x = 5;
        let y = 35;
        const lineHeight = 10;
        const bgWidth = 200;
        const bgHeight = 150;

        renderer.drawRect(x - 2, y - 2, bgWidth, bgHeight, 'rgba(0, 0, 0, 0.8)', true);

        renderer.drawText(`FPS: ${latest.fps.toFixed(1)}`, x, y, '#00FF00', 1, true);
        y += lineHeight;
        
        renderer.drawText(`FRAME TIME: ${latest.frameTime.toFixed(2)}MS`, x, y, '#00FF00', 1, true);
        y += lineHeight;
        
        if (latest.memoryUsed > 0) {
            renderer.drawText(`MEMORY: ${latest.memoryUsed.toFixed(1)}MB`, x, y, '#00FF00', 1, true);
            y += lineHeight;
        }

        y += lineHeight;
        renderer.drawText('DRAW CALLS:', x, y, '#00FF00', 1, true);
        y += lineHeight;
        
        renderer.drawText(`  SPRITES: ${latest.drawCalls.drawSprite}`, x, y, '#00FF00', 1, true);
        y += lineHeight;
        
        renderer.drawText(`  RECTS: ${latest.drawCalls.drawRect}`, x, y, '#00FF00', 1, true);
        y += lineHeight;
        
        renderer.drawText(`  TEXT: ${latest.drawCalls.drawText}`, x, y, '#00FF00', 1, true);
        y += lineHeight;
        
        renderer.drawText(`  TOTAL: ${latest.drawCalls.total}`, x, y, '#00FF00', 1, true);
        y += lineHeight;

        this.renderGraph(renderer, x, y + 10, 190, 40);
    }

    private renderGraph(renderer: PixelRenderer, x: number, y: number, width: number, height: number): void {
        renderer.drawRect(x, y, width, height, 'rgba(0, 0, 0, 0.5)', true);
        renderer.drawRect(x, y, width, height, '#00FF00', false);

        if (this.metrics.length < 2) return;

        const maxFps = 60;
        const step = width / (this.maxMetricsHistory - 1);

        for (let i = 1; i < this.metrics.length; i++) {
            const prev = this.metrics[i - 1];
            const curr = this.metrics[i];
            
            const x1 = x + (i - 1) * step;
            const x2 = x + i * step;
            const y1 = y + height - (prev.fps / maxFps) * height;
            const y2 = y + height - (curr.fps / maxFps) * height;

            const color = curr.fps >= 55 ? '#00FF00' : curr.fps >= 30 ? '#FFFF00' : '#FF0000';
            renderer.drawLine(x1, y1, x2, y2, color, 1);
        }

        renderer.drawText('60', x - 20, y - 4, '#00FF00', 1, true);
        renderer.drawText('0', x - 15, y + height - 4, '#00FF00', 1, true);
    }

    toggle(): void {
        this.showOverlay = !this.showOverlay;
        Logger.log(`[PerformanceMonitor] Overlay ${this.showOverlay ? 'enabled' : 'disabled'}`);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    getLatestMetrics(): PerformanceMetrics | null {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }

    getAverageMetrics(): PerformanceMetrics | null {
        if (this.metrics.length === 0) return null;

        const sum = this.metrics.reduce((acc, metric) => ({
            fps: acc.fps + metric.fps,
            frameTime: acc.frameTime + metric.frameTime,
            memoryUsed: acc.memoryUsed + metric.memoryUsed,
            drawCalls: {
                drawSprite: acc.drawCalls.drawSprite + metric.drawCalls.drawSprite,
                drawRect: acc.drawCalls.drawRect + metric.drawCalls.drawRect,
                drawText: acc.drawCalls.drawText + metric.drawCalls.drawText,
                drawLine: acc.drawCalls.drawLine + metric.drawCalls.drawLine,
                total: acc.drawCalls.total + metric.drawCalls.total
            },
            timestamp: 0
        }), {
            fps: 0,
            frameTime: 0,
            memoryUsed: 0,
            drawCalls: { drawSprite: 0, drawRect: 0, drawText: 0, drawLine: 0, total: 0 },
            timestamp: 0
        });

        const count = this.metrics.length;
        return {
            fps: sum.fps / count,
            frameTime: sum.frameTime / count,
            memoryUsed: sum.memoryUsed / count,
            drawCalls: {
                drawSprite: sum.drawCalls.drawSprite / count,
                drawRect: sum.drawCalls.drawRect / count,
                drawText: sum.drawCalls.drawText / count,
                drawLine: sum.drawCalls.drawLine / count,
                total: sum.drawCalls.total / count
            },
            timestamp: Date.now()
        };
    }

    exportMetrics(): string {
        const headers = ['timestamp', 'fps', 'frameTime', 'memoryUsed', 'drawSprite', 'drawRect', 'drawText', 'drawLine', 'totalDrawCalls'];
        const rows = this.metrics.map(m => [
            m.timestamp,
            m.fps.toFixed(2),
            m.frameTime.toFixed(2),
            m.memoryUsed.toFixed(2),
            m.drawCalls.drawSprite,
            m.drawCalls.drawRect,
            m.drawCalls.drawText,
            m.drawCalls.drawLine,
            m.drawCalls.total
        ].join(','));

        return [headers.join(','), ...rows].join('\n');
    }

    reset(): void {
        this.metrics = [];
        this.frameCount = 0;
        this.currentFps = 0;
        this.lastFpsUpdate = 0;
        this.resetDrawCalls();
    }
}