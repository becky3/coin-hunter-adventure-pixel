#!/usr/bin/env node

import { spawn } from 'child_process';
import puppeteer from 'puppeteer';

console.log('=== Startup Performance Measurement ===');
console.log('Starting at:', new Date().toISOString());

const startTime = Date.now();
let viteReady = false;
let browser;

// Viteサーバーを起動
console.log('\n[1] Starting Vite dev server...');
const viteProcess = spawn('npm', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
});

// Viteの出力を監視
viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[Vite] ${output}`);
    
    if (output.includes('ready in')) {
        const readyTime = Date.now() - startTime;
        console.log(`\n[2] Vite ready in ${readyTime}ms from script start`);
        viteReady = true;
        
        // Viteが準備できたらブラウザでアクセス
        performBrowserTest();
    }
});

viteProcess.stderr.on('data', (data) => {
    console.error(`[Vite Error] ${data}`);
});

async function performBrowserTest() {
    console.log('\n[3] Launching browser for first access...');
    const browserLaunchTime = Date.now();
    
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // コンソールログを収集
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            if (text.includes('[Performance]')) {
                console.log(`[Browser] ${text}`);
            }
        });
        
        // ページロード開始
        console.log('\n[4] Navigating to http://localhost:3000...');
        const navigationStartTime = Date.now();
        
        await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });
        
        const navigationEndTime = Date.now();
        console.log(`[5] Page loaded in ${navigationEndTime - navigationStartTime}ms`);
        
        // パフォーマンスメトリクスを取得
        await page.waitForTimeout(2000); // ゲームの初期化を待つ
        
        const metrics = await page.evaluate(() => {
            return window.performanceMetrics;
        });
        
        if (metrics) {
            console.log('\n=== Performance Metrics Summary ===');
            console.log(`Total time from script start: ${Date.now() - startTime}ms`);
            console.log(`Vite startup: ${browserLaunchTime - startTime}ms`);
            console.log(`Browser navigation: ${navigationEndTime - navigationStartTime}ms`);
            console.log('\nDetailed phases:');
            metrics.phases.forEach(phase => {
                console.log(`  ${phase.name}: ${phase.duration.toFixed(2)}ms`);
            });
        }
        
        // ログをファイルに保存
        const fs = await import('fs');
        const logContent = consoleLogs.join('\n');
        fs.writeFileSync('performance-log.txt', logContent);
        console.log('\nFull log saved to performance-log.txt');
        
    } catch (error) {
        console.error('Browser test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
        viteProcess.kill();
        process.exit(0);
    }
}

// エラーハンドリング
process.on('SIGINT', () => {
    console.log('\nCleaning up...');
    if (browser) browser.close();
    viteProcess.kill();
    process.exit(0);
});