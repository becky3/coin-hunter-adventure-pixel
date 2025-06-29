import { InputSystem } from './InputSystem';
import { GameStateManager } from '../states/GameStateManager';
import { AssetLoader } from '../assets/AssetLoader';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PixelArtRenderer } from '../utils/pixelArt';
import { LevelLoader } from '../levels/LevelLoader';
import { Player } from '../entities/Player';
import { MusicSystem } from '../audio/MusicSystem';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { MenuState } from '../states/MenuState';
import { PlayState } from '../states/PlayState';
import { TestPlayState } from '../states/TestPlayState';
import { FPS, GAME_RESOLUTION } from '../constants/gameConstants';

interface DebugElements {
    panel: HTMLElement | null;
    fps: HTMLElement | null;
    frameTime: HTMLElement | null;
    gameState: HTMLElement | null;
    entityCount: HTMLElement | null;
    cameraPos: HTMLElement | null;
    activeKeys: HTMLElement | null;
    musicStatus: HTMLElement | null;
    playerSection: HTMLElement | null;
    playerPos: HTMLElement | null;
    playerVel: HTMLElement | null;
    playerHealth: HTMLElement | null;
    playerGrounded: HTMLElement | null;
}

// Extend window interface for global game reference
declare global {
    interface Window {
        game: Game;
    }
}

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private running: boolean;
    private lastTime: number;
    private targetFPS: number;
    private frameTime: number;
    private debug: boolean;
    private testGroundY?: number;
    private debugElements: DebugElements | null;
    
    public inputSystem: InputSystem;
    public stateManager: GameStateManager;
    public assetLoader: AssetLoader;
    public renderer: PixelRenderer;
    public levelLoader: LevelLoader;
    public musicSystem: MusicSystem;
    public physicsSystem: PhysicsSystem;
    public pixelArtRenderer: PixelArtRenderer;
    public player: Player | null;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
        
        this.running = false;
        this.lastTime = 0;
        
        this.targetFPS = FPS.TARGET;
        this.frameTime = FPS.FRAME_TIME;
        this.inputSystem = new InputSystem();
        this.stateManager = new GameStateManager();
        this.assetLoader = new AssetLoader();
        this.renderer = new PixelRenderer(canvas);
        this.levelLoader = new LevelLoader();
        this.musicSystem = new MusicSystem();
        this.physicsSystem = new PhysicsSystem();
        this.pixelArtRenderer = new PixelArtRenderer(canvas);
        this.renderer.pixelArtRenderer = this.pixelArtRenderer;
        this.renderer.assetLoader = this.assetLoader;
        this.assetLoader.setRenderer(this.pixelArtRenderer);
        this.debug = false;
        window.game = this;
        this.player = null;
        this.debugElements = null;
    }
    
    async initialize(): Promise<boolean> {
        console.log('Initializing game...');
        
        try {
            this.assetLoader.setRenderer(this.pixelArtRenderer);
            console.log('Music system will be initialized on user interaction');
            console.log('Loading test assets...');
            await this.loadTestAssets();
            console.log('Loading stage list...');
            try {
                await this.levelLoader.loadStageList();
            } catch (error) {
                console.warn('Stage list loading failed, using defaults:', error);
            }
            console.log('Creating test player...');
            this.createTestPlayer();
            this.setupAudioEvents();
            this.registerStates();
            this.stateManager.setState('menu');
            
            console.log('Game initialized successfully!');
            return true;
        } catch (error) {
            console.error('Game initialization failed:', error);
            return false;
        }
    }
    
    private async loadTestAssets(): Promise<void> {
        try {
            await this.assetLoader.preloadGameAssets((loaded: number, total: number) => {
                console.log(`Loading assets: ${loaded}/${total}`);
            });
            console.log('All game assets loaded successfully');
        } catch (error) {
            console.warn('Could not load some assets:', error);
        }
    }
    
    private createTestPlayer(): void {
        this.player = new Player(50, 150);
        this.player.setInputManager(this.inputSystem);
        this.player.setMusicSystem(this.musicSystem);
        this.player.setAssetLoader(this.assetLoader);
        console.log('Test player created at:', this.player.x, this.player.y);
        console.log('Player size:', this.player.width, 'x', this.player.height);
        this.testGroundY = GAME_RESOLUTION.HEIGHT - 40;
    }
    
    private registerStates(): void {
        const menuState = new MenuState(this);
        this.stateManager.registerState('menu', menuState);
        const playState = new PlayState(this);
        this.stateManager.registerState('play', playState);
        const testPlayState = new TestPlayState(this);
        this.stateManager.registerState('testplay', testPlayState);
    }
    
    private setupAudioEvents(): void {
        let musicStarted = false;
        
        const startMusic = async () => {
            if (musicStarted) return;
            musicStarted = true;
            
            try {
                if (!this.musicSystem.isInitialized) {
                    console.log('Initializing music system on user interaction...');
                    const initialized = await this.musicSystem.init();
                    if (!initialized) {
                        console.warn('Failed to initialize music system');
                        return;
                    }
                }
                console.log('Starting title BGM...');
                this.musicSystem.playTitleBGM();
            } catch (error) {
                console.error('Error starting music:', error);
            }
        };
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });
        
        console.log('Audio events setup complete - waiting for user interaction');
    }
    
    start(): void {
        console.log('Starting game...');
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }
    
    private gameLoop = (currentTime: number): void => {
        if (!this.running) return;
        
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.frameTime) {
            this.update(deltaTime);
            this.render();
            
            this.lastTime = currentTime - (deltaTime % this.frameTime);
        }
        
        requestAnimationFrame(this.gameLoop);
    };
    
    private update(deltaTime: number): void {
        this.inputSystem.update();
        if (this.inputSystem.isActionJustPressed('debug')) {
            this.debug = !this.debug;
            this.renderer.setDebugMode(this.debug);
            console.log('Debug mode:', this.debug ? 'ON' : 'OFF');
        }
        this.stateManager.update(deltaTime);
    }
    
    private updateTestMode(): void {
        if (this.inputSystem.isActionPressed('jump') && this.debug) {
            console.log('===== JUMP KEY DETECTED IN GAME.JS =====');
        }
        this.stateManager.update(this.frameTime);
        if (this.player && this.testGroundY !== undefined) {
            this.player.update(this.frameTime);
            if (this.player.y + this.player.height > this.testGroundY) {
                this.player.y = this.testGroundY - this.player.height;
                if (this.player.vy > 0) {
                    this.player.vy = 0;
                    this.player.grounded = true;
                    this.player.isJumping = false;
                }
            } else if (Math.abs(this.player.y + this.player.height - this.testGroundY) < 1) {
                this.player.grounded = true;
            } else {
                this.player.grounded = false;
            }
            if (this.player.x < 0) {
                this.player.x = 0;
                this.player.vx = 0;
            }
            if (this.player.x > GAME_RESOLUTION.WIDTH - this.player.width) {
                this.player.x = GAME_RESOLUTION.WIDTH - this.player.width;
                this.player.vx = 0;
            }
        }
    }
    
    private render(): void {
        this.stateManager.render(this.renderer);
        this.renderDebugOverlay();
    }
    
    private renderTestMode(): void {
        this.renderer.clear('#5C94FC');
        if (this.testGroundY !== undefined) {
            this.renderer.drawRect(0, this.testGroundY, GAME_RESOLUTION.WIDTH, GAME_RESOLUTION.HEIGHT - this.testGroundY, '#8B4513');
        }
        if (this.player) {
            this.player.render(this.renderer);
        }
        this.renderDebugInfo();
    }
    
    private renderDebugOverlay(): void {
        const fps = this.frameTime > 0 ? Math.round(1000 / this.frameTime) : 0;
        this.updateHTMLDebugInfo(fps);
    }
    
    private cacheDebugElements(): void {
        this.debugElements = {
            panel: document.getElementById('debugPanel'),
            fps: document.getElementById('fps'),
            frameTime: document.getElementById('frameTime'),
            gameState: document.getElementById('gameState'),
            entityCount: document.getElementById('entityCount'),
            cameraPos: document.getElementById('cameraPos'),
            activeKeys: document.getElementById('activeKeys'),
            musicStatus: document.getElementById('musicStatus'),
            playerSection: document.getElementById('playerSection'),
            playerPos: document.getElementById('playerPos'),
            playerVel: document.getElementById('playerVel'),
            playerHealth: document.getElementById('playerHealth'),
            playerGrounded: document.getElementById('playerGrounded')
        };
    }
    
    private updateHTMLDebugInfo(fps: number): void {
        if (!this.debugElements) {
            this.cacheDebugElements();
        }
        
        const { panel } = this.debugElements;
        if (!panel) return;
        
        if (this.debug) {
            panel.classList.add('active');
            if (this.debugElements.fps) {
                this.debugElements.fps.textContent = fps.toString();
                if (fps >= 55) {
                    this.debugElements.fps.className = 'debug-value success';
                } else if (fps >= 30) {
                    this.debugElements.fps.className = 'debug-value warning';
                } else {
                    this.debugElements.fps.className = 'debug-value error';
                }
            }
            if (this.debugElements.frameTime) {
                this.debugElements.frameTime.textContent = `${this.frameTime.toFixed(1)}ms`;
            }
            if (this.debugElements.gameState) {
                this.debugElements.gameState.textContent = (this.stateManager as any).currentStateName || 'none';
            }
            if (this.debugElements.entityCount) {
                this.debugElements.entityCount.textContent = this.player ? '1' : '0';
            }
            if (this.debugElements.cameraPos) {
                const cameraPos = this.renderer.getCameraPosition();
                this.debugElements.cameraPos.textContent = `${Math.floor(cameraPos.x)}, ${Math.floor(cameraPos.y)}`;
            }
            const keys: string[] = [];
            if (this.inputSystem.isActionPressed('left')) keys.push('←');
            if (this.inputSystem.isActionPressed('right')) keys.push('→');
            if (this.inputSystem.isActionPressed('up')) keys.push('↑');
            if (this.inputSystem.isActionPressed('down')) keys.push('↓');
            if (this.inputSystem.isActionPressed('jump')) keys.push('SPACE');
            if (this.inputSystem.isActionPressed('action')) keys.push('ENTER');
            
            if (this.debugElements.activeKeys) {
                this.debugElements.activeKeys.textContent = keys.length > 0 ? keys.join(' ') : '-';
            }
            if (this.debugElements.musicStatus) {
                if (this.musicSystem.isInitialized) {
                    this.debugElements.musicStatus.textContent = this.musicSystem.getMuteState() ? 'MUTED' : 'ON';
                    this.debugElements.musicStatus.className = this.musicSystem.getMuteState() ? 'debug-value warning' : 'debug-value success';
                } else {
                    this.debugElements.musicStatus.textContent = 'OFF';
                    this.debugElements.musicStatus.className = 'debug-value';
                }
            }
            if (this.debugElements.playerSection && this.player) {
                this.debugElements.playerSection.style.display = 'block';
                
                const playerState = this.player.getState();
                if (this.debugElements.playerPos) {
                    this.debugElements.playerPos.textContent = `${Math.floor(playerState.x)}, ${Math.floor(playerState.y)}`;
                }
                if (this.debugElements.playerVel) {
                    this.debugElements.playerVel.textContent = `${playerState.vx.toFixed(1)}, ${playerState.vy.toFixed(1)}`;
                }
                if (this.debugElements.playerHealth) {
                    this.debugElements.playerHealth.textContent = `${playerState.health}/${playerState.maxHealth}`;
                    if (playerState.health === playerState.maxHealth) {
                        this.debugElements.playerHealth.className = 'debug-value success';
                    } else if (playerState.health > 1) {
                        this.debugElements.playerHealth.className = 'debug-value warning';
                    } else {
                        this.debugElements.playerHealth.className = 'debug-value error';
                    }
                }
                if (this.debugElements.playerGrounded) {
                    this.debugElements.playerGrounded.textContent = playerState.grounded ? 'Yes' : 'No';
                    this.debugElements.playerGrounded.className = playerState.grounded ? 'debug-value success' : 'debug-value';
                }
            } else if (this.debugElements.playerSection) {
                this.debugElements.playerSection.style.display = 'none';
            }
        } else {
            panel.classList.remove('active');
        }
    }
    
    private renderDebugInfo(): void {
        if (!this.musicSystem.isInitialized) {
            const centerX = GAME_RESOLUTION.WIDTH / 2;
            const centerY = GAME_RESOLUTION.HEIGHT / 2;
            this.renderer.drawTextCentered('PRESS ANY KEY', centerX, centerY - 8, '#FFFF00');
            this.renderer.drawTextCentered('TO START MUSIC', centerX, centerY + 8, '#FFFF00');
        }
    }
    
    stop(): void {
        this.running = false;
        if (this.musicSystem) {
            this.musicSystem.stopBGM();
            this.musicSystem.destroy();
        }
    }
}