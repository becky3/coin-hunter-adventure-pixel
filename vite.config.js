import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    // 静的アセットの処理
    assetsInclude: ['**/*.json'],
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
        // force: true を削除して、キャッシュを有効化
        // 明示的に最適化する依存関係を指定
        include: [
            'playwright'
        ],
        // 除外する依存関係
        exclude: []
    },
    // ESBuildの設定
    esbuild: {
        // TypeScript設定
        target: 'es2022'
    }
});