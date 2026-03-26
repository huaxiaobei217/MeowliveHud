// index.js —— 最小可用版，只负责开关面板

(function () {
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    onReady(() => {
        const floatBtn  = document.getElementById('meow-live-float-btn');
        const container = document.getElementById('meow-live-container');

        console.log('[MeowLiveHUD] floatBtn=', floatBtn, 'container=', container);

        if (!floatBtn || !container) {
            console.warn('[MeowLiveHUD] 找不到 meow-live-float-btn 或 meow-live-container');
            return;
        }

        // 点击小球，显示/隐藏面板
        floatBtn.addEventListener('click', () => {
            const hidden = container.classList.toggle('meow-hud-hidden');
            console.log('[MeowLiveHUD] 面板现在：', hidden ? '隐藏' : '显示');
        });

        console.log('[MeowLiveHUD] 初始化完成');
    });
})();
