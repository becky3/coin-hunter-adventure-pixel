import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true
    },
    server: {
        port: 3000,
        open: true,
        // ホットリロードの設定
        hmr: {
            overlay: true
        },
        // ファイル変更の監視設定
        watch: {
            usePolling: true,
            interval: 100
        }
    },
    // 開発時のキャッシュ設定
    optimizeDeps: {
        force: true // 依存関係のキャッシュを常に再構築
    },
    // ESBuildの設定
    esbuild: {
        // インクリメンタルビルドを無効化（より確実な更新）
        incremental: false
    }
});