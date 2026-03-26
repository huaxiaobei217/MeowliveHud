// SillyTavern 扩展入口：创建右下角小球 + 浮窗面板 + 初始化 HUD

(function () {
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    // 把原网页 <script> 里的那一大坨 JS 放进这个函数里面
    function initMeowHud() {
        const root = document.getElementById('ktApp');
        if (!root) {
            console.warn('[MeowLiveHUD] 未找到 #ktApp，HUD 初始化跳过');
            return;
        }

        // ===================== 这里开始粘你的大脚本 =====================
        // 注意：不要再写 function initMeowHud，不要再包一层函数
        // 从 “// 🔧 全局热复写记忆缓存” 开始，到 “(function initMobilePerformanceGuard() { ... })();” 结束

        // 🔧 全局热复写记忆缓存
        // window.ktModifiedData = {};
        // let currentEditTarget = null;
        // let currentEditKey = "";
        // let isEditingText = false;
        //
        // ... 你的巨大脚本全部粘在这里 ...
        //
        // (function initMobilePerformanceGuard() { ... })();

        // ===================== 粘完就到这里结束 =====================
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

        // 这里的 HTML，你之前已经按照我说的换成了那一大坨 HUD 结构
        // 现在先用一个占位，确认猫猫球先回来
        container.innerHTML = `
<div class="raw-data" id="rawData"></div>
<div id="copyToast">指令已复制！</div>

<div class="kt-safe-guard" id="ktSafeGuard">
    <div class="kitten-bar-wrapper" id="ktApp">
        <div style="padding:10px;color:#fff;">
            <h3>猫猫面板测试</h3>
            <p>如果你看到这行字，说明 DOM 创建正常，JS 也在运行。</p>
            <p>下一步再把完整 HUD HTML 换回来。</p>
        </div>
    </div>
</div>
        `;

        // 3. 把两个节点挂到 SillyTavern 页面上
        document.body.appendChild(floatBtn);
        document.body.appendChild(container);

        // 4. 点击小球：开关面板 + 第一次打开时初始化 HUD
        floatBtn.addEventListener('click', () => {
            const hidden = container.classList.toggle('meow-hud-hidden');
            console.log('[MeowLiveHUD] 面板现在：', hidden ? '隐藏' : '显示');

            if (!hidden && !window.__meowHudInited) {
                window.__meowHudInited = true;
                try {
                    initMeowHud();
                    console.log('[MeowLiveHUD] initMeowHud 已执行');
                } catch (e) {
                    console.error('[MeowLiveHUD] initMeowHud 运行失败:', e);
                }
            }
        });

        console.log('[MeowLiveHUD] DOM 已插入（SillyTavern 模式）');
    }

    onReady(() => {
        console.log('[MeowLiveHUD] SillyTavern 扩展初始化');
        createHudDom();
    });
})();
