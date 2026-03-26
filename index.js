// SillyTavern 扩展入口：创建右下角小球 + 浮窗面板
// 文件名：index.js（manifest.json 里 js 指向它）

(function () {
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function createHudDom() {
        // 防止重复创建
        if (document.getElementById('meow-live-float-btn')) return;

        // 1. 创建右下角小球
        const floatBtn = document.createElement('div');
        floatBtn.id = 'meow-live-float-btn';
        floatBtn.className = 'meow-float-btn';
        floatBtn.title = '打开/关闭 猫猫面板';

        const icon = document.createElement('div');
        icon.className = 'meow-float-icon';
        icon.textContent = '🐱';
        floatBtn.appendChild(icon);

        // 2. 创建 HUD 容器
        const container = document.createElement('div');
        container.id = 'meow-live-container';
        container.className = 'meow-hud-hidden';

        container.innerHTML = `
            <div class="kt-safe-guard" id="ktSafeGuard">
                <div class="kitten-bar-wrapper" id="ktApp">
                    <h3 style="margin:0 0 8px;">猫猫面板测试（SillyTavern）</h3>
                    <p style="margin:0 0 8px;font-size:13px;color:#ccc;">
                        如果你看到这块面板，说明扩展已经正确插入 SillyTavern 页面。
                    </p>
                    <p style="margin:0;font-size:12px;color:#999;">
                        下一步再把你那一大坨 HUD 塞进来。现在只是测试开关。
                    </p>
                </div>
            </div>
        `;

        // 3. 把两个节点挂到 SillyTavern 页面上
        document.body.appendChild(floatBtn);
        document.body.appendChild(container);

        // 4. 绑定点击事件：开关面板
        floatBtn.addEventListener('click', () => {
            const hidden = container.classList.toggle('meow-hud-hidden');
            console.log('[MeowLiveHUD] 面板现在：', hidden ? '隐藏' : '显示');
        });

        console.log('[MeowLiveHUD] DOM 已插入（SillyTavern 模式）');
    }

    onReady(() => {
        console.log('[MeowLiveHUD] SillyTavern 扩展初始化');

        // SillyTavern 主页面加载好之后再插入 DOM
        // 这里简单一点：直接调用 createHudDom
        createHudDom();
    });
})();
