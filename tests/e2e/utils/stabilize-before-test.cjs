/**
 * Viteのホットリロードが落ち着くのを待つヘルパー
 */
async function stabilizeBeforeTest(waitTime = 2000) {
    console.log(`⏳ Waiting ${waitTime}ms for Vite to stabilize...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    console.log('✅ Ready to run test');
}

module.exports = { stabilizeBeforeTest };