export interface AnimationPattern {
    pattern: string;
    frameCount: number;
    duration: number;
    loop: boolean;
    customFrames?: string[];
}

export interface ResolvedAnimation {
    frames: string[];
    duration: number;
    loop: boolean;
}

/**
 * Resolves animation patterns to concrete frame names
 */
export class AnimationResolver {
    resolvePattern(pattern: AnimationPattern): ResolvedAnimation {
        const frames = pattern.customFrames 
            ? pattern.customFrames 
            : this.generateFrameNames(pattern.pattern, pattern.frameCount);
        
        return {
            frames,
            duration: pattern.duration,
            loop: pattern.loop
        };
    }

    private generateFrameNames(pattern: string, frameCount: number): string[] {
        if (frameCount === 1 || frameCount === 0) {
            return [pattern];
        }

        const frames: string[] = [];
        for (let i = 1; i <= frameCount; i++) {
            frames.push(`${pattern}${i}`);
        }
        
        return frames;
    }

    isStaticSprite(pattern: AnimationPattern): boolean {
        return pattern.duration === 0 || pattern.frameCount <= 1;
    }
}