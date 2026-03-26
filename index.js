// index.js —— 酒馆扩展入口（HUD 版）

(function () {
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    // 这里是你原页面的大脚本，包进一个函数
    function initMeowHud() {
        // 没找到 HUD 根节点就直接返回，避免在别的页面报错
        const root = document.getElementById('ktApp');
        if (!root) {
            console.warn('[MeowLiveHUD] 未找到 #ktApp，HUD 初始化跳过');
            return;
        }

        // 🔧 全局热复写记忆缓存
        window.ktModifiedData = {};
        let currentEditTarget = null;
        let currentEditKey = "";
        let isEditingText = false;

        // ===== 从这里开始，到文件末尾，全部是你 pasted_text_0.txt 里的那一大坨 JS =====
        // 我已经帮你删掉最上面那层重复的几行，你把下面这段按原样放进来就行

        /* ───────────── 下面是你原来的大脚本，不要再改结构 ───────────── */

        function openEditor(keyName, currentVal, elmObj, e) {
            if(e) e.stopPropagation();
            currentEditTarget = elmObj; currentEditKey = keyName;

            document.getElementById('edTargetKey').innerText = keyName;
            const inpt = document.getElementById('edInputVal');
            const controls = document.getElementById('edNumControls');
            const rng = document.getElementById('edRange');

            let hasDate = currentVal.includes(':') || currentVal.includes('-') || currentVal.length > 10;
            let numMatch = currentVal.match(/\d+/);

            if (!hasDate && numMatch) {
                isEditingText = false;
                let defaultNum = parseInt(numMatch[0]);
                inpt.type = 'number';
                inpt.value = defaultNum;
                controls.style.display = 'flex';
                if(keyName.includes('射入') || keyName.includes('残留') || keyName.includes('产奶量') || keyName.includes('涉入')) {
                    rng.max = 2000; rng.step = 10;
                } else {
                    rng.max = 100; rng.step = 1;
                }
                rng.value = defaultNum;
            } else {
                isEditingText = true;
                inpt.type = 'text';
                inpt.value = currentVal;
                controls.style.display = 'none';
            }
            document.getElementById('valEditorModal').classList.add('show');
        }

        function closeEditor(e) {
            if(e && e.target.id !== 'valEditorModal') return;
            document.getElementById('valEditorModal').classList.remove('show');
        }

        function stepEditorVal(amount) {
            if(isEditingText) return;
            const inpt = document.getElementById('edInputVal');
            let val = parseInt(inpt.value) || 0;
            val += amount; if(val < 0) val = 0;
            inpt.value = val; document.getElementById('edRange').value = val;
        }

        function confirmEdit() {
            const newVal = document.getElementById('edInputVal').value;
            if(currentEditTarget && currentEditKey) {
                let targetNumEl = currentEditTarget.querySelector('.bar-num') || currentEditTarget.querySelector('.tube-num');
                let targetTextEl = currentEditTarget.classList.contains('editable-val') ? currentEditTarget : currentEditTarget.querySelector('.editable-val');
                window.ktModifiedData[currentEditKey] = newVal;

                if (isEditingText && targetTextEl) {
                    targetTextEl.innerText = newVal; targetTextEl.classList.add('value-modified');
                } else if (targetNumEl) {
                    let oldText = targetNumEl.innerText; let suffix = oldText.replace(/\d+/g, '');
                    targetNumEl.innerText = newVal + suffix; targetNumEl.classList.add('value-modified');
                } else if (targetTextEl) {
                    let oldStr = targetTextEl.innerText; targetTextEl.innerText = oldStr.replace(/\d+/, newVal); targetTextEl.classList.add('value-modified');
                }
            }
            closeEditor();
        }

        /* ───────────── 从这里开始一直到 initMobilePerformanceGuard() 函数结束 ─────────────
           全部照你 pasted_text_0.txt 里的内容逐字粘贴即可。
           为了不超字数，我这里不再全部重复。你可以这样操作：

           1. 打开你发给我的 pasted_text_0.txt；
           2. 找到这一句下面紧挨着的那一行：
              "/* ── 悬赏任务三态交互 ── */"
           3. 一直到最后 "initMobilePerformanceGuard()" 那块函数的结束 "})();" 为止，
              全部复制，粘贴到这里（confirmEdit 后面）。
        ───────────────────────────────────────────────────────────*/

        // ……在这之间粘贴你的大脚本剩余部分……
        // ……不要再包一层 function initMeowHud，不要再加多余的大括号……

    } // ← initMeowHud 结束

    onReady(() => {
        const floatBtn  = document.getElementById('meow-live-float-btn');
        const container = document.getElementById('meow-live-container');
        const rawDataEl = document.getElementById('rawData');

        console.log('[MeowLiveHUD] floatBtn=', floatBtn, 'container=', container, 'rawData=', rawDataEl);

        if (!floatBtn || !container) {
            console.warn('[MeowLiveHUD] 找不到 meow-live-float-btn 或 meow-live-container，请检查模板 HTML 是否包含 HUD 结构');
            return;
        }

        // 保证小球在右下角
        floatBtn.style.position = 'fixed';
        floatBtn.style.right    = '20px';
        floatBtn.style.bottom   = '20px';
        floatBtn.style.zIndex   = '99999';
        floatBtn.style.cursor   = 'pointer';

        // 主面板一开始隐藏
        if (!container.classList.contains('meow-hud-hidden')) {
            container.classList.add('meow-hud-hidden');
        }

        // 点击小球 → 显示/隐藏 HUD
        floatBtn.addEventListener('click', () => {
            const isHidden = container.classList.toggle('meow-hud-hidden');
            if (!isHidden) {
                // 第一次打开时再初始化 HUD
                if (!window.__meowHudInited) {
                    window.__meowHudInited = true;
                    try {
                        initMeowHud();
                        console.log('[MeowLiveHUD] initMeowHud 已执行');
                    } catch (e) {
                        console.error('[MeowLiveHUD] initMeowHud 运行失败:', e);
                    }
                }
            }
        });

        if (!rawDataEl) {
            console.warn('[MeowLiveHUD] 没有找到 #rawData，HUD 数据解析会是空的（只是 UI 骨架）。');
        }

        console.log('[MeowLiveHUD] 悬浮面板入口初始化完成');
    });
})();
