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

    // ① 大脚本：从原网页 <script> 里拿出来，包在 initMeowHud 里面
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

/* ── 悬赏任务三态交互 ── */
window.handleBounty = function(el, e) {
        const state = el.dataset.state;
        // 已接取或已完成，一律锁死，严禁二次点击作弊
        if (state === 'accepted' || state === 'b-done') return;
        e.stopPropagation();
        spawnBountyRipple(el, e);
        // 只允许 idle → accepted 单向流转，完成判定由AI负责
        el.dataset.state = 'accepted';
        el.classList.add('b-accepted');
        el.querySelector('.b-icon').textContent = '⏳';
        const _taskMsg = `[玩家指令：接取悬赏任务「${el.querySelector('.b-body .b-desc').textContent.trim()}」，请在下一轮剧情中主动推进此任务的完成，并在完成后自动结算喵币]`;
        _ktCopyText(_taskMsg,
            function() { showToast('已接取！指令已同步，AI将主动推进 ✦'); },
            function() { showToast('已接取！请长按复制指令 ✦'); }
        );
        // 持久化：把这条任务的描述存进本地
        const _acceptedTasks = JSON.parse(localStorage.getItem('cat_accepted_tasks') || '[]');
        const _thisDesc = el.querySelector('.b-body .b-desc').textContent.trim();
        if (!_acceptedTasks.includes(_thisDesc)) {
            _acceptedTasks.push(_thisDesc);
            localStorage.setItem('cat_accepted_tasks', JSON.stringify(_acceptedTasks));
        }
    }
    function spawnBountyRipple(el, e) {
        const rect = el.getBoundingClientRect();
        const r = document.createElement('div');
        r.className = 'b-ripple-el';
        const size = Math.max(rect.width, rect.height);
        r.style.width = r.style.height = size + 'px';
        r.style.left = (e.clientX - rect.left - size / 2) + 'px';
        r.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
        el.appendChild(r);
        setTimeout(() => r.remove(), 550);
    }

/* ── 赎买权利交互 ── */
    window._bbCoins = (function() {
        // 优先读本地持久化的余额
        const _saved = localStorage.getItem('cat_bb_coins');
        if (_saved !== null && /^\d+$/.test(_saved)) {
            return parseInt(_saved);
        }
        // 没有本地存储时，读AI给出的余额
        const _aiBalance = document.querySelector('[data-field="喵币余额"]');
        if (_aiBalance && /\d/.test(_aiBalance.textContent)) {
            return parseInt(_aiBalance.textContent.replace(/[^\d]/g, '')) || 0;
        }
        return 0;
    })();
window.handleBuyback = function(el, e) {
        if (el.classList.contains('spent')) return;
        e.stopPropagation();
        const cost = parseInt(el.dataset.cost) || 0;
        if (cost > window._bbCoins) {
            el.classList.add('no-cash');
            setTimeout(() => el.classList.remove('no-cash'), 500);
            showToast('喵币余额不足 🐟');
            return;
        }
        const rect = el.getBoundingClientRect();
        const floatEl = document.createElement('div');
        floatEl.className = 'deduct-float-el';
        floatEl.textContent = '-' + cost.toLocaleString() + ' 🐟';
        floatEl.style.left = (rect.right - 30) + 'px';
        floatEl.style.top  = (rect.top + rect.height / 2) + 'px';
        document.body.appendChild(floatEl);
        setTimeout(() => floatEl.remove(), 1200);

        const target = window._bbCoins - cost;
        const steps = 16;
        const stepVal = (window._bbCoins - target) / steps;
        const valEl = document.getElementById('bbCoinVal');
        let s = 0;
        const ticker = setInterval(() => {
            s++;
            const v = Math.round(window._bbCoins - stepVal * s);
            if (valEl) {
                valEl.textContent = Math.max(v, target).toLocaleString();
                valEl.classList.add('bb-tick');
                setTimeout(() => valEl.classList.remove('bb-tick'), 90);
            }
            if (s >= steps) {
                clearInterval(ticker);
                window._bbCoins = target;
                if (valEl) valEl.textContent = window._bbCoins.toLocaleString();
            }
        }, 35);

        setTimeout(() => {
            el.classList.add('spent');
            _ktCopyText(el.dataset.cmd,
                function() { showToast('权利兑换成功，指令已同步 💜'); },
                function() { showToast('权利兑换成功！请长按复制指令 💜'); }
            );
            // 持久化喵币余额
            localStorage.setItem('cat_bb_coins', String(window._bbCoins));
            // 持久化已兑换的赎买卡片（用卡片描述文字作为key）
            const _spentList = JSON.parse(localStorage.getItem('cat_spent_buybacks') || '[]');
            const _buybackDesc = el.querySelector('.buyback-desc')?.textContent?.trim() || '';
            if (_buybackDesc && !_spentList.includes(_buybackDesc)) {
                _spentList.push(_buybackDesc);
                localStorage.setItem('cat_spent_buybacks', JSON.stringify(_spentList));
            }
            // 同步更新总资产显示（总资产 = 余额 + 已花费，此处用余额直接覆盖显示）
            const totalEl = document.getElementById('liveTotalCoins');
            if (totalEl) {
                // 从总资产原文中提取旧总额数字
                const oldTotalMatch = totalEl.textContent.match(/\d[\d,]*/);
                const oldTotal = oldTotalMatch ? parseInt(oldTotalMatch[0].replace(/,/g, '')) : null;
                if (oldTotal !== null) {
                    // 总资产不变，仅在旁边追加已扣费提示
                    totalEl.innerHTML = `💰 总资产: ${oldTotal.toLocaleString()} 喵币 <span style="color:#f0abfc;font-size:0.8em;text-shadow:0 0 4px rgba(240,171,252,0.7);">(-${cost.toLocaleString()} 已兑换)</span>`;
                }
            }
        }, 350);
    }

    function packAndCopyMods() {
        let keys = Object.keys(window.ktModifiedData);
        if(keys.length === 0) { showToast("你还没有修改任何数值哦！"); return; }
        let output = "系统，请绝对依据以下后台调试数值覆写设定，并在后续角色扮演推演中完美继承这些数值！绝对不许忽略：\n[数值修正覆写]\n";
        for(let k of keys) { output += `${k}: ${window.ktModifiedData[k]}\n`; }
        copyAction(output, "📦 已将修改项打包复制到剪贴板！请发送给AI。");
    }

function toggleAdminConsole(e) { e.stopPropagation(); document.getElementById('adminConsole').classList.toggle('show'); }

// 管理员控制台：左滑退出
(function initAdminSwipeClose() {
    const console_el = document.getElementById('adminConsole');
    if (!console_el) return;
    let _swTouchStartX = 0;
    let _swTouchStartY = 0;

    console_el.addEventListener('touchstart', function(e) {
        _swTouchStartX = e.touches[0].clientX;
        _swTouchStartY = e.touches[0].clientY;
    }, { passive: true });

    console_el.addEventListener('touchend', function(e) {
        const dx = e.changedTouches[0].clientX - _swTouchStartX;
        const dy = e.changedTouches[0].clientY - _swTouchStartY;
        // 左滑：水平位移 < -50px，且水平方向比垂直方向更明显
        if (dx < -50 && Math.abs(dx) > Math.abs(dy)) {
            console_el.classList.remove('show');
        }
    }, { passive: true });
})()	
// 🔧 核心修复：阻断控制台内部 touch 事件冒泡到 kitten-bar-wrapper
// 防止父层的 touchstart 记录器劫持控制台内部的垂直滑动
(function fixAdminScrollCapture() {
    const console_el = document.getElementById('adminConsole');
    if (!console_el) return;

    // 拦截纵向滑动，不让其传播到父容器
    console_el.addEventListener('touchmove', function(e) {
        // 只在控制台显示状态下拦截，避免影响隐藏时的其他交互
        if (console_el.classList.contains('show')) {
            e.stopPropagation();
            // 注意：不调用 preventDefault，保留原生滚动能力
        }
    }, { passive: true });

    // touchstart 同样需要拦截冒泡，否则父层会抢占 touch ownership
    console_el.addEventListener('touchstart', function(e) {
        if (console_el.classList.contains('show')) {
            e.stopPropagation();
        }
    }, { passive: true });
})();
function _ktCopyText(text, onSuccess, onFail) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            if (onSuccess) onSuccess();
        }).catch(function() {
            _ktCopyFallback(text, onSuccess, onFail);
        });
    } else {
        _ktCopyFallback(text, onSuccess, onFail);
    }
}
function _ktCopyFallback(text, onSuccess, onFail) {
    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok && onSuccess) onSuccess();
        else if (!ok && onFail) onFail();
    } catch(e) {
        if (onFail) onFail();
    }
}
function showToast(msg) { const toast = document.getElementById('copyToast'); toast.innerText = msg; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 1800); }
function copyAction(text, msg) {
    msg = msg || '已复制指令！';
    _ktCopyText(text,
        function() {
            showToast(msg);
            var cons = document.getElementById('adminConsole');
            if (cons && cons.classList.contains('show')) cons.classList.remove('show');
        },
        function() { showToast('复制失败，请长按手动复制'); }
    );
}
    document.addEventListener('click', function(e) {
        if(!e.target.closest('#adminConsole') && !e.target.closest('#breathDot') && !e.target.closest('#valEditorModal')) {
            let ac = document.getElementById('adminConsole'); if(ac && ac.classList.contains('show')) ac.classList.remove('show');
        }
    });

    document.addEventListener('click', function(e) {
if(e.target.closest('.bounty-card') || e.target.closest('.buyback-card') || e.target.closest('.cmd-btn') || e.target.closest('.dirt-stain') || e.target.closest('#breathDot') || e.target.closest('.editable-val') || e.target.closest('.editor-card') || e.target.closest('.nav-tabs') || e.target.closest('.bar-row-wrap') || e.target.closest('.danmaku-item') || e.target.closest('.soul-bubble') || e.target.closest('#verdictBanner')) return;
        const _dx = Math.abs((e.clientX || 0) - _clickStartX);
        const _dy = Math.abs((e.clientY || 0) - _clickStartY);
        if (_dx > 12 || _dy > 12) return;
        // ── 点击粒子 emoji 根据场景切换 ──
        const _cpAmb  = (window._ktAmbientMode || '').toLowerCase();
        const _cpEsc  = !!(window._lastEscapeMode);
        const _cpSex  = (typeof estrousNum !== 'undefined' && estrousNum > 15) ||
                        (typeof climaxNum  !== 'undefined' && climaxNum  > 0);
        let emojis;
        if (_cpEsc) {
            emojis = ['💨','👣','⚡','🌀','❗','✦'];
        } else if (/romance|心动|恋爱|悸动/.test(_cpAmb)) {
            emojis = ['💗','💕','✨','🌸','🥰','💫'];
        } else if (/rain|shower|ocean|雨|海|水/.test(_cpAmb)) {
            emojis = ['💧','🌊','✦','💙','❄️','⋆'];
        } else if (/sakura|maple|dawn|花|叶|秋/.test(_cpAmb)) {
            emojis = ['🌸','🍂','✦','🍃','💮','⋆'];
        } else if (/snow|winter|冬|雪/.test(_cpAmb)) {
            emojis = ['❄️','⋆','✦','🌨️','💙','✧'];
        } else if (/golden|starry|moonlit|star|星|月|金/.test(_cpAmb)) {
            emojis = ['✦','✧','⋆','⭐','💫','✨'];
        } else if (/confetti|library|magic|书|魔|彩/.test(_cpAmb)) {
            emojis = ['✨','🎀','⭐','💫','🪄','✦'];
        } else if (/cozy|暖|惬意/.test(_cpAmb)) {
            emojis = ['☕','🧸','✦','🕯️','💛','⋆'];
        } else if (_cpSex) {
            emojis = ['💦', '🎀', '⭐', '✨', '💗', '🥺', '🥰', '🐱'];
        } else {
            emojis = ['🎀', '⭐', '✨', '💗', '🥰', '🐱', '✦', '💫'];
        }
        const numParticles = Math.floor(Math.random() * 2) + 2;        for(let i=0; i<numParticles; i++) {
            let p = document.createElement('div'); p.className = 'click-fx-particle'; p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            p.style.left = e.clientX + 'px'; p.style.top = e.clientY + 'px';
            let angle = Math.random() * Math.PI * 2; let velocity = 30 + Math.random() * 60;
            let tx = Math.cos(angle) * velocity; let ty = Math.sin(angle) * velocity - 20; let rot = (Math.random() - 0.5) * 180;
            p.style.setProperty('--tx', `${tx}px`); p.style.setProperty('--ty', `${ty}px`); p.style.setProperty('--rot', `${rot}deg`);
            if(p.textContent === '💦') p.style.color = '#00f5ff'; if(p.textContent === '⭐' || p.textContent === '✨') p.style.color = '#fff68f'; if(p.textContent === '💊') p.style.color = '#ff1e6a';
            document.body.appendChild(p); setTimeout(() => p.remove(), 800);
        }
    });

    function toggleKtPanel(e) {
        if(e.target.closest('.panel-inner') || e.target.closest('#adminConsole') || e.target.closest('#breathDot')) return;
        const app = document.getElementById('ktApp'); const panel = document.getElementById('ktPanel');
        if (app.classList.contains('open')) { panel.style.maxHeight = '0px'; panel.style.opacity = '0'; app.classList.remove('open'); }
        else { panel.style.maxHeight = panel.scrollHeight + 500 + 'px'; panel.style.opacity = '1'; app.classList.add('open'); }
    }

    function moveNavSlider(btn) {
        const slider = document.getElementById('navTabsSlider');
        if (!slider || !btn) return;
        slider.style.left  = btn.offsetLeft + 'px';
        slider.style.width = btn.offsetWidth + 'px';
    }
    function switchKtTab(id, btn, e) {
        if(e) e.stopPropagation();
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById(id).classList.add('active');

        moveNavSlider(btn);
        // 当点击按钮时，将其平滑滚动到视野中央（仅滚动tab栏本身，不触发页面偏移）
        const _tabsEl = document.getElementById('navTabs');
        if (_tabsEl) {
            const _btnLeft = btn.offsetLeft;
            const _btnW = btn.offsetWidth;
            const _tabsW = _tabsEl.offsetWidth;
            _tabsEl.scrollTo({ left: _btnLeft - (_tabsW - _btnW) / 2, behavior: 'smooth' });
        }
        setTimeout(function() {
            const panel = document.getElementById('ktPanel');
            const app = document.getElementById('ktApp');
            if(app && app.classList.contains('open') && panel) {
                panel.style.maxHeight = panel.scrollHeight + 800 + 'px';
            }
        }, 120);
    }
   // 初始化滑块位置（延迟到渲染完成后执行，确保隐藏Tab已被移除出布局）
    setTimeout(() => {
        const firstActive = document.querySelector('.nav-tabs .tab-btn.active:not([style*="display: none"]):not([style*="display:none"])')
                         || document.querySelector('.nav-tabs .tab-btn:not([style*="display: none"]):not([style*="display:none"])');
        if (firstActive) {
            if (!firstActive.classList.contains('active')) {
                switchKtTab(firstActive.dataset.target, firstActive, null);
            }
            const slider = document.getElementById('navTabsSlider');
            if (slider) {
                slider.style.transition = 'none';
                slider.style.left  = firstActive.offsetLeft + 'px';
                slider.style.width = firstActive.offsetWidth + 'px';
                requestAnimationFrame(() => { slider.style.transition = ''; });
            }
        }
    }, 100);
    let _clickStartX = 0; let _clickStartY = 0;
    document.addEventListener('touchstart', function(e) {
        _clickStartX = e.touches[0].clientX;
        _clickStartY = e.touches[0].clientY;
    }, { passive: true });
    let touchStartX = 0; let touchStartY = 0; let touchEndX = 0; let touchEndY = 0;
    const swipeContainer = document.getElementById('swipeContainer');
    swipeContainer.addEventListener('touchstart', function(e) { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, {passive: true});
    swipeContainer.addEventListener('touchend', function(e) { touchEndX = e.changedTouches[0].screenX; touchEndY = e.changedTouches[0].screenY; handleSwipeGesture(); }, {passive: true});

    function handleSwipeGesture() {
        const deltaX = touchEndX - touchStartX; const deltaY = touchEndY - touchStartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
            // 🌟 核心修复：只抓取当前没有被隐藏（可见）的标签按钮！
            const visibleTabs = Array.from(document.querySelectorAll('.tab-btn')).filter(tab => tab.style.display !== 'none');
            let activeIdx = visibleTabs.findIndex(tab => tab.classList.contains('active'));
            if (activeIdx === -1) return;

            if (deltaX < 0) {
                let nextIdx = (activeIdx + 1) % visibleTabs.length;
                switchKtTab(visibleTabs[nextIdx].dataset.target, visibleTabs[nextIdx], null);
            } else {
                let prevIdx = (activeIdx - 1 + visibleTabs.length) % visibleTabs.length;
                switchKtTab(visibleTabs[prevIdx].dataset.target, visibleTabs[prevIdx], null);
            }
        }
    }
    document.addEventListener('click', (e) => {
        if(e.target.closest('summary.fold-title') || e.target.closest('.wall-break-wrapper')) {
            const panel = document.getElementById('ktPanel'); setTimeout(() => { if(panel.style.maxHeight !== '0px') panel.style.maxHeight = panel.scrollHeight + 400 + 'px'; }, 350);
        }
    });

    /* ========================================================================= */
    /* 🌊 核心重写：高潮重力流瀑黏液引擎 (Climax Gravity-Drip Slime Engine) 🌊 */
    /* ========================================================================= */
    let isWipingAll = false;

    function splashScreen_V2() {
        const layer = document.getElementById('dirtLayer');
        const app = document.getElementById('ktApp');
        const panel = document.getElementById('ktPanel');
        const hudRect = app.getBoundingClientRect();
        isWipingAll = false;

        if (!app.classList.contains('open') && window.innerWidth > 0) {
            panel.style.maxHeight = panel.scrollHeight + 500 + 'px'; panel.style.opacity = '1'; app.classList.add('open');
        }

        app.classList.remove('climax-overload-active');
        void app.offsetWidth;
        app.classList.add('climax-overload-active');

        let maxH = app.classList.contains('open') ? Math.min(800, hudRect.height) : 200;

        const numDrips = Math.floor(Math.random() * 4) + 4;
        for(let i=0; i<numDrips; i++) {
            let drip = document.createElement('div'); drip.className = 'dirt-stain stain-gravity-drip';
            let w = Math.floor(Math.random() * 30) + 20; let h = Math.floor(Math.random() * 50) + 40;
            drip.style.width = `${w}px`; drip.style.height = `${h}px`;

            let tailW = Math.floor(Math.random() * 4) + 2; let tailH = Math.floor(Math.random() * 100) + 50;
            drip.style.setProperty('--tail-w', `${tailW}px`); drip.style.setProperty('--tail-h', `${tailH}px`);

            let startY = Math.random() * (maxH * 0.5); let endY = startY + Math.random() * 150 + 100;
            drip.style.setProperty('--start-y', `${startY}px`); drip.style.setProperty('--end-y', `${endY}px`);
            drip.style.left = `${Math.random() * (hudRect.width - w)}px`;

            let startRot = (Math.random() - 0.5) * 40; let endRot = (Math.random() - 0.5) * 10;
            drip.style.setProperty('--in-rot', `${startRot}deg`); drip.style.setProperty('--fin-rot', `${endRot}deg`);

            // 🐌 黏稠滞留：将下落行程拉长至 15~35 秒的极速缓流
            let dripSpd = Math.random() * 20 + 15; drip.style.setProperty('--drip-spd', `${dripSpd}s`);

            drip.addEventListener('mousemove', wipeAction); drip.addEventListener('touchmove', wipeAction, {passive: false});
            layer.appendChild(drip);
        }
    }

    const wipeAction = function(e) {
        e.preventDefault(); if (isWipingAll) return; isWipingAll = true;
        const allStains = document.querySelectorAll('.dirt-stain'); const hudRect = document.getElementById('ktApp').getBoundingClientRect();
        allStains.forEach(s => {
            let clientX = e.clientX || (e.touches && e.touches[0].clientX) || hudRect.width/2; let clientY = e.clientY || (e.touches && e.touches[0].clientY) || hudRect.height/2;
            let sRect = s.getBoundingClientRect(); let dx = sRect.left - clientX; let dy = sRect.top - clientY;
            s.style.setProperty('--wipe-x', `${dx > 0 ? 30 : -30}px`); s.style.setProperty('--wipe-y', `${dy > 0 ? 30 : -30}px`); s.classList.add('wiped-fx');
            setTimeout(() => s.remove(), 300);
        });
    };

    function triggerManualPollution(e) { e.stopPropagation(); splashScreen_V2(); let cons = document.getElementById('adminConsole'); if(cons) cons.classList.remove('show'); }

    /* 数据主解析引擎录入 · 防卡爆分批版 */
function _ktSchedule(fn, delay) {
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(fn, { timeout: delay + 500 });
    } else {
        setTimeout(fn, delay);
    }
}
setTimeout(() => {
        const rawEl = document.getElementById('rawData');
        if (!rawEl) return;
        const rawText = (rawEl.innerText || rawEl.textContent || '');
        const lines = rawText.split('\n');
let data = { base: {}, mind: {}, clothes: {}, body: {}, deprave: {}, stat: {}, fluid: {}, preg: {}, live: {}, rules: {}, bounties: [], danmakus: [], wallbreak: { soulThought: '', buybacks: [], wishes: [] }, escape: {}, gaze: {} };
        let curSec = ''; let currentTitle = '';

        lines.forEach(l => {
            let lineStr = l.trim();
            if(!lineStr || lineStr.startsWith('[CAT_HUD')) return;
            if(lineStr.match(/^[*\s]*\[/)) { curSec = lineStr.replace(/[*_]/g, ''); return; }

            if(lineStr.includes('当前称号')) { currentTitle = lineStr.split(/[:：]/).slice(1).join(':').trim(); return; }

            if(curSec.includes('第四面墙') || curSec.includes('观测室') || curSec.includes('避难所')) {
                if(lineStr.includes('灵魂碎碎念') || lineStr.includes('所思所想')) { data.wallbreak.soulThought = lineStr.split(/[:：]/).slice(1).join(':').trim(); }
                else if(lineStr.includes('喵币余额')) { const _coinRaw = lineStr.split(/[:：]/).slice(1).join(':').trim(); const _coinMatch = _coinRaw.match(/\d[\d,]*/); if(_coinMatch) { data.wallbreak.coinBalance = parseInt(_coinMatch[0].replace(/,/g,'')); } }
else if(lineStr.includes('心愿')) {
    let text = lineStr.split(/[:：]/).slice(1).join(':').trim();
    let m = text.match(/^(.*?)\s*——\s*扣除\s*(\d+)/i) || text.match(/^(.*?)\s*——\s*(\d+)\s*喵币/i);
    if(m) { data.wallbreak.wishes = data.wallbreak.wishes || []; data.wallbreak.wishes.push({ desc: m[1].trim(), coin: m[2] }); }
}
else if(lineStr.includes('赎买权利') || lineStr.includes('赎买')) { let text = lineStr.split(/[:：]/).slice(1).join(':').trim(); let m = text.match(/^(.*?)\s*——\s*扣除\s*(\d+)/i) || text.match(/^(.*?)\s*——\s*(\d+)\s*喵币/i); if(m) { data.wallbreak.buybacks.push({ desc: m[1].trim(), coin: m[2] }); } else if(text.length > 2) { data.wallbreak.buybacks.push({ desc: text, coin: '???' }); } } return;            }

            if(curSec.includes('深网弹幕') || curSec.includes('观众交互') || curSec.includes('弹幕区')) {
                if(lineStr.match(/^弹幕\d*[:：]/)) {
                    let text = lineStr.replace(/^弹幕\d*[:：]\s*/, '').trim(); let parts = text.split('|'); let user = 'Anonymous'; let msg = text;
                    if(parts.length > 1 && parts[0].length < 15) { user = parts[0].trim(); msg = parts.slice(1).join('|').trim(); } else { const rNames = ['LustGazer', 'Anonymous_99', 'Admin_K', 'HornyDog', 'Watcher_', 'AbyssCat']; user = rNames[Math.floor(Math.random() * rNames.length)]; msg = parts[0].trim(); }
                    if(msg) data.danmakus.push({ user: user, text: msg });
                } return;
            }

            if(curSec.includes('悬赏任务')) {
                let m = lineStr.match(/^(.*?)\s*——\s*(\d+)\s+喵币(?:\s*\[Rank:\s*([SAB])\])?/i);
                if(m) { data.bounties.push({ desc: m[1].trim(), coin: m[2], rank: (m[3]||'B').toUpperCase() }); } else if(lineStr.length > 5) { data.bounties.push({ desc: lineStr, coin: "???", rank: "B" }); } return;
            }

            if(curSec.includes('绝密守则')) { if(lineStr.length > 5) data.rules[Date.now() + Math.random()] = lineStr; return; }
if(curSec.includes('ESCAPE') || curSec.includes('脱出')) {
    let idx2 = lineStr.indexOf(':'); if(idx2 === -1) idx2 = lineStr.indexOf('：');
    if(idx2 !== -1) { const k2 = lineStr.slice(0, idx2).trim(); const v2 = lineStr.slice(idx2 + 1).trim(); if(k2 && v2) data.escape[k2] = v2; }
    return;
}
if(curSec.includes('GAZE_HUD') || curSec.includes('外部泄漏') || curSec.includes('主角认知') || curSec.includes('听觉泄漏') || curSec.includes('动物感知') || curSec.includes('自我凝视') || curSec.includes('环境共谋') || curSec.includes('旁观者切面') || curSec.includes('有意图者追踪') || curSec.includes('熟人档案') || curSec.includes('谣言与记录') || curSec.includes('社会压力') || curSec.includes('日常社交剪影') || curSec.includes('好感异化追踪')) {
    let idx3 = lineStr.indexOf(':'); if(idx3 === -1) idx3 = lineStr.indexOf('：');
    if(idx3 !== -1) { const k3 = lineStr.slice(0, idx3).trim(); const v3 = lineStr.slice(idx3 + 1).trim(); if(k3 && v3) data.gaze[k3] = v3; }
    return;
}

            let idx = lineStr.indexOf(':'); if (idx === -1) idx = lineStr.indexOf('：'); if(idx === -1) return;
            const k = lineStr.slice(0, idx).trim(); const val = lineStr.slice(idx + 1).trim();
            if(!val) return;
            if(k.includes('🚩') || k.trim().startsWith('🚩')) return;
            // 跳过行程时间轴格式行（如 23:10 → 卧室）
            if (/^\d{1,2}$/.test(k) && /^\d{2}\s*(→|->)/.test(val)) return;
            // 跳过计划标签行（[确定]/[模糊]/[长线]）
            if (/^\[(确定|模糊|长线|\d{4}|下周|下个月)/.test(lineStr)) return;
            // 跳过行程区段标题行（含括号的章节标题如"近期计划（今日-3日内）"）
            if (/^(今日轨迹|近期计划|长线计划)/.test(k)) return;
if(curSec.includes('基础状态') || curSec.includes('日常状态') || curSec.includes('身体杂项') || curSec.includes('行程快照') || curSec.includes('Flag监测板') || curSec.includes('今日体质认定')) {
data.base[k] = val;
    if(k.includes('当前场景氛围') || k.includes('场景氛围')) {
        window._ktAmbientMode = val.trim();
    }
}
 else if(curSec.includes('精神意志')) data.mind[k] = val; else if(curSec.includes('衣着')) data.clothes[k] = val; else if(curSec.includes('肉体')) data.body[k] = val; else if(curSec.includes('恶堕') || curSec.includes('战损')) data.deprave[k] = val; else if(curSec.includes('次数统计')) data.stat[k] = val; else if(curSec.includes('高潮与体液')) data.fluid[k] = val; else if(curSec.includes('孕猫') || curSec.includes('泌乳') || curSec.includes('胎内') || curSec.includes('生态')) data.preg[k] = val; else if(curSec.includes('云养小猫') || curSec.includes('放送') || curSec.includes('深网')) data.live[k] = val;
            else if(curSec.includes('关系焦点') || curSec.includes('对象A') || curSec.includes('对象B') || curSec.includes('对象C') || curSec.includes('对象D') || curSec.includes('恋人专属档案') || curSec.includes('多角关系') || curSec.includes('修罗场') || curSec.includes('主角真心') || curSec.includes('不忠档案') || curSec.includes('引爆秘密') || curSec.includes('关系全局')) { /* 关系数据由renderRelationTab直接从rawText读取，此处仅防止误分类 */ }
});
        const badgeWrapper = document.getElementById('titleBadgeWrapper'); const badgeText = document.getElementById('titleBadgeText');
        const isMundane = (val) => { if(!val) return true; const v = val.toLowerCase().trim(); return (v === '' || v === '无' || v === '留空' || v === '未开启' || v === '未触发留空' || v === '无感' || v === '尚未开发') && v.length < 5; };

        if(currentTitle && !isMundane(currentTitle)) {
            badgeText.innerText = currentTitle;
            badgeWrapper.style.display = 'flex';
            // ── 称号徽章流光颜色跟随氛围 ──
            const _bagAmb = (window._ktAmbientMode || '').toLowerCase();
            let _bagGrad = 'linear-gradient(90deg, #fff, #ffb3c6, #00f5ff, #fff)';
            if      (/romance|心动|恋爱/.test(_bagAmb))   _bagGrad = 'linear-gradient(90deg, #fff, #ffb3c6, #ff7eb3, #fff)';
            else if (/sakura|花|春/.test(_bagAmb))         _bagGrad = 'linear-gradient(90deg, #fff, #ffcce5, #ff9ec8, #fff)';
            else if (/maple|秋|autumn/.test(_bagAmb))      _bagGrad = 'linear-gradient(90deg, #fff, #ffcc80, #ff8c30, #fff)';
            else if (/snow|winter|冬|雪/.test(_bagAmb))    _bagGrad = 'linear-gradient(90deg, #fff, #e0f4ff, #a0c8ff, #fff)';
            else if (/golden|star|moonlit|星|月/.test(_bagAmb)) _bagGrad = 'linear-gradient(90deg, #fff, #ffd700, #ffe88a, #fff)';
            else if (/rain|ocean|shower|雨|海|水/.test(_bagAmb)) _bagGrad = 'linear-gradient(90deg, #fff, #b2f0fb, #29b6f6, #fff)';
            else if (/magic|library|cozy/.test(_bagAmb))   _bagGrad = 'linear-gradient(90deg, #fff, #e1bee7, #ce93d8, #fff)';
            document.documentElement.style.setProperty('--badge-gradient', _bagGrad);
        } else { badgeWrapper.style.display = 'none'; }
        const getEffectClass = (key, val) => {
            const v = val.toLowerCase();
            const isNegated = /^(无|没有|正常|干净|尚无|暂无|未见)|无[充血肿胀溢液酸痛]|没有[充血肿胀溢液酸痛]/.test(v.trim());
            const poundingKeys = ['子宫', '宫颈', '小逼', '阴道', '阴蒂', '后庭', '结肠', '小腹'];
            let isPoundingKey = false; for(let pk of poundingKeys) { if(key.includes(pk)) { isPoundingKey = true; break;} }
            if (!isNegated && isPoundingKey && /(撞击|夯干|捣烂|撑裂|死死抵住|贯穿|深剿|打桩|狂干|发麻|酸痛|顶弄|疯狂)/.test(v)) return 'eff-pounding';
            if(/(干涸|结痂|干掉|凝固|变硬|发硬|残渣|水渍|干痕|斑驳)/.test(v)) return 'eff-crust';
            if(!isNegated && /(精|泥泞|拉丝|白浊|内射|溢出|灌满|黏稠|浓液|乳白|潮喷)/.test(v)) return 'eff-sticky';
            if(!isNegated && /(肿|破|外翻|充血|发热|痉挛|高潮|限界|凄惨|发情|失禁|战损|狂乱|翻白眼)/.test(v)) return 'eff-swollen';
            if(!isNegated && /(湿|水|潮|汗|滑腻|颤栗|发抖|泌乳|分泌)/.test(v)) return 'eff-wet'; return 'eff-normal';
        };
        const checkSlimeLens = (text) => { if(!text) return false; return /(满溢|喷射|白浊|内射|灌满|黏腻|糊成一片|大量)/.test(text); };

        // 📡 腔道接入雷达 - 动态速率解析扩容版
const thrustTargetKeys = ['小逼异物', '后庭异物', '子宫异物', '口部异物', '镜头焦点', '阴茎', '龟头'];
        const getThrustSpeedClass = (text) => {
            if (!text) return '';
            const t = text.toLowerCase();
            // 狂暴极限 (高频极重度撞击)
            if (/(狂干|打桩|死死抵住|极限猛肏|猛肏|狠干|狂插|残暴|疯狗|贯穿|猛烈|痉挛|捣烂|撞破|凿击|狂抽|疾风骤雨|失控|捣穿|捅进|破开|撕裂|连根入)/.test(t)) return 'speed-insane';
            // 律动抽插 (常规节奏进出)
            if (/(顶弄|抽送|进出|捣弄|摩擦|操弄|肏弄|交媾|挺进|送入|拔出|一进一出|起伏|交合|驰骋|律动)/.test(t)) return 'speed-normal';
            // 缓慢深剿 (极慢、滞留与碾压)
            if (/(缓慢|研磨|碾压|浅刮|停顿|静置|不动|含着|磨蹭|转圈|画圈|厮磨|刮擦|撑开|挤入|陷入|填满|堵住|塞满|留置|浅弄|细细|一寸寸|慢慢|死死塞住)/.test(t)) return 'speed-slow';
            return '';
        };
        const barKeys = ['理智值','发情值','淫乱值','雌堕值','服从度','疼痛转化快感度','失禁与潮吹混淆度','高潮临近度','淫水失控指数','母性与淫性混淆度','子宫沦陷与闭口状态','孕期肉体超敏发情度','胎内环境浊化度'];
        const tubeKeys = ['今日精液摄入量', '今日射入摄取', '体内残留精液_口部', '体内残留精液_女穴', '体内残留精液_后庭', '今日被迫产奶量'];

        // 🔆 理智光谱剥落引擎 (五阶段变色)
        const getThemeVars = (rNum) => {
            if (rNum <= 25) return { border: 'var(--kt-alert)', shadow: 'rgba(255,30,106,0.9)', text: 'var(--kt-alert)' }; // 霓虹红/亮粉
            if (rNum <= 50) return { border: 'var(--kt-pink)', shadow: 'rgba(255,126,179,0.8)', text: 'var(--kt-pink)' }; // 深粉色
            if (rNum <= 75) return { border: 'var(--kt-pink-dim)', shadow: 'rgba(255,179,198,0.6)', text: '#ffb3c6' }; // 淡粉色
            if (rNum <= 89) return { border: 'rgba(255,255,255,0.8)', shadow: 'rgba(255,255,255,0.5)', text: '#ffffff' }; // 纯灰白
            return { border: 'var(--kt-cyan)', shadow: 'rgba(0,245,255,0.25)', text: '#00f5ff' }; // 发光亮青蓝（已降亮）
        };
        const getBarColor = (key, num) => {
            if (key.includes('理智')) { if (num <= 50) return { color: 'var(--kt-alert)', shadow: 'rgba(255,30,106,0.6)', bg: 'linear-gradient(90deg, #ff1e6a, #ff7eb3)' }; if (num <= 80) return { color: 'var(--kt-pink-dim)', shadow: 'rgba(255,179,198,0.4)', bg: 'linear-gradient(90deg, #a2e1db, #ffb3c6)' }; return { color: 'var(--kt-cyan)', shadow: 'rgba(0,245,255,0.6)', bg: 'linear-gradient(90deg, #00f5ff, #8be9fd)' }; }
            else { if (num >= 80) return { color: 'var(--kt-alert)', shadow: 'rgba(255,30,106,0.6)', bg: 'linear-gradient(90deg, #ffb3c6, #ff1e6a)' }; if (num >= 50) return { color: '#ff7eb3', shadow: 'rgba(255,126,179,0.5)', bg: 'linear-gradient(90deg, #ffb3c6, #ff7eb3)' }; if (num >= 20) return { color: 'var(--text-main)', shadow: 'rgba(255,255,255,0.2)', bg: 'linear-gradient(90deg, #555, #ffb3c6)' }; return { color: 'var(--text-sub)', shadow: 'transparent', bg: '#444' }; }
        };

        const wrapEditable = (key, val, elmtType = 'text') => {
            if(!/\d/.test(val)) return val;
            let escVal = val.replace(/'/g, "\\'");
            return `<span class="editable-val" onclick="openEditor('${key}', '${escVal}', this, event)">${val}</span>`;
        };

        const renderItems = (obj, isLayoutFlex = false) => {
            let html = ''; for(let [k, v] of Object.entries(obj)) {
                if(barKeys.includes(k) && /\d/.test(v)) continue; if(tubeKeys.includes(k)) continue;
                if(!isMundane(v)) {
                    let effect = getEffectClass(k, v); const vForLength = v.split('|')[0].trim();
let rowClass = (isLayoutFlex || vForLength.length > 20) ? 'data-row' : 'data-row horizontal'; let thrustHtml = '';
                    if (thrustTargetKeys.includes(k)) { let speedClass = getThrustSpeedClass(v); if (speedClass) { thrustHtml = `<div class="thrust-radar-container ${speedClass}"><div class="radar-label">📡 腔道介入雷达 (TSR)</div><div class="thrust-radar-bar"><div class="piston"></div></div></div>`; } }
                    let displayV = wrapEditable(k, v, 'text');
                    html += `<div class="${rowClass} ${effect}"><span class="data-key">${k}</span><div class="data-val">${displayV}</div>${thrustHtml}</div>`;
                }
            } return html;
        };

        const renderStatGrid = (obj) => {
            if(Object.keys(obj).length === 0) return '';
            let html = '<div class="stat-grid">';
            for(let [k, v] of Object.entries(obj)) {
                if(k === '性行为总时长') continue;
                if(!isMundane(v)) {
                    let isFullWidth = k.includes('边缘行为') || v.length > 15;
                    let itemClass = isFullWidth ? 'stat-item full-width' : 'stat-item';
                    let displayV = wrapEditable(k, v, 'text');
                    html += `<div class="${itemClass}"><span class="stat-key">${k}</span><div class="stat-val">${displayV}</div></div>`;
                }
            }
            html += '</div>';
            return html;
        };
        /* 上一轮数值缓存（用于箭头方向判断） */
        const prevBarVals = (() => {
            try { return JSON.parse(sessionStorage.getItem('kt_prev_bar_vals') || '{}'); } catch(e) { return {}; }
        })();
        const nextBarVals = {};

        /* 每个 barKey 对应的样式配置 */
        const BAR_STYLE_MAP = {
            '发情值':           { fillCls:'bf-estrous',    wrapCls:'br-estrous',    keyColor:'#ff9fb8' },
            '淫乱值':           { fillCls:'bf-lewd',       wrapCls:'br-lewd',       keyColor:'#ff7eb3' },
            '雌堕值':           { fillCls:'bf-deprave',    wrapCls:'br-deprave',    keyColor:'#d1477a' },
            '理智值':           { fillCls:'bf-sanity',     wrapCls:'br-sanity',     keyColor:'#a2e1db' },
            '服从度':           { fillCls:'bf-obey',       wrapCls:'br-obey',       keyColor:'#c97a9a' },
            '疼痛转化快感度':   { fillCls:'bf-pain',       wrapCls:'br-pain',       keyColor:'#d4b8ff' },
            '失禁与潮吹混淆度': { fillCls:'bf-incont',     wrapCls:'br-incont',     keyColor:'#b2ebf2' },
            '高潮临近度':       { fillCls:'bf-climax',     wrapCls:'br-climax',     keyColor:'#ffc8d5' },
            '淫水失控指数':     { fillCls:'bf-fluid',     wrapCls:'br-fluid',     keyColor:'#81d4fa' },
            '母性与淫性混淆度':   { fillCls:'bf-maternal',   wrapCls:'br-maternal',   keyColor:'#d1c4e9' },
            '子宫沦陷与闭口状态': { fillCls:'bf-womb',       wrapCls:'br-womb',       keyColor:'#ffab76' },
            '孕期肉体超敏发情度': { fillCls:'bf-pregsen',    wrapCls:'br-pregsen',    keyColor:'#e1bee7' },
            '胎内环境浊化度':     { fillCls:'bf-contaminate',wrapCls:'br-contaminate',keyColor:'#c5caf5' },
        };

        /* 满值特效 HTML 生成器 */
        const FULL_FX_MAP = {
            '发情值':           (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-alert-max">MAX!! ⚡</span></div>`,
            '淫乱值':           (right) => `<div class="full-fx" style="right:${right}px; top:calc(50% + 3px);"><span class="fx-lewd-drop"></span><span class="fx-lewd-drop fx-lewd-drop-b"></span></div>`,
            '雌堕值':           (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-heart">♥</span></div>`,
            '服从度':           (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-chain">⛓</span></div>`,
            '疼痛转化快感度':   (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-bolt">⚡</span></div>`,
            '高潮临近度':       (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-climax-stars">✨° ✦</span></div>`,
            '淫水失控指数':     (right) => `<div class="full-fx" style="right:${right}px; top:calc(50% + 3px);"><span class="fx-fluid-drop"></span><span class="fx-fluid-drop fx-fluid-drop-b"></span></div>`,
            '母性与淫性混淆度': (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-maternal-star">✦</span></div>`,
            '子宫沦陷与闭口状态':(right)=> `<div class="full-fx" style="right:${right}px;"><span class="fx-womb-ember">🔥</span></div>`,
            '孕期肉体超敏发情度':(right)=> `<div class="full-fx" style="right:${right}px;"><span class="fx-pregsen-dot"></span></div>`,
            '胎内环境浊化度':   (right) => `<div class="full-fx" style="right:${right}px;"><span class="fx-contaminate-orb"></span></div>`,
        };
        /* 理智值和失禁混淆度满值特效在CSS/动画层处理，不需要外部节点 */

        const renderBars = (obj) => {
            let html = '';
            for(let [k, v] of Object.entries(obj)) {
                if(!barKeys.includes(k)) continue;
                let parts = v.split('|');
                let numStr = parts[0].trim();
                let extraDesc = parts.slice(1).join('|').trim();
                let m = numStr.match(/\d+/);
                let num = m ? parseInt(m[0]) : 0;
                if(num === 0 && !numStr.includes('0') && !k.includes('理智')) continue;

                /* ── 颜色系统 ── */
                const styleConf = BAR_STYLE_MAP[k];
                let fillCls = '';
                let wrapExtraCls = '';
                let keyColorStyle = '';

                if(styleConf) {
                    /* 理智值特殊处理：≤20 危机模式 */
                    if(k.includes('理智') && num <= 20) {
                        fillCls = 'bf-sanity-low';
                        wrapExtraCls = 'br-sanity br-sanity-low';
                        keyColorStyle = 'color:#ff7eb3;text-shadow:0 0 5px rgba(255,30,106,0.6);';
                    } else {
                        fillCls = styleConf.fillCls;
                        wrapExtraCls = styleConf.wrapCls;
                        keyColorStyle = `color:${styleConf.keyColor};text-shadow:0 0 5px ${styleConf.keyColor}88;`;
                    }
                } else {
                    /* 无样式配置时回退到旧逻辑 */
                    let { color, shadow, bg } = getBarColor(k, num);
                    keyColorStyle = `color:${color};text-shadow:0 0 5px ${shadow};`;
                    fillCls = '';
                }

                /* ── 满值判断（>=85 触发） ── */
                const isFull = k.includes('高潮临近度') ? num >= 95 : num >= 85;
                let dripHtml = '';
                let innerWrapCls = '';

                /* ── 雌堕/痛转快感/失禁满值时轨道动效 ── */
                const needTrackAnim = isFull && (k.includes('雌堕') || k.includes('痛转') || k.includes('失禁') || k.includes('高潮') || k.includes('子宫'));
                const trackAnimCls = needTrackAnim ? 'bar-wrap-inner' : '';

                /* ── 满值特效节点 ── */
                const fxRight = 58; /* 数值区约宽 */
                let fullFxHtml = '';
                if(isFull && FULL_FX_MAP[k]) {
                    fullFxHtml = FULL_FX_MAP[k](fxRight);
                }

                /* ── 满值fill类 ── */
                const fillFullCls = isFull ? 'full' : '';

                /* ── 箭头方向 ── */
                const prevVal = prevBarVals[k];
                nextBarVals[k] = num;
                let arrowHtml = '';
                if(prevVal !== undefined && prevVal !== num) {
                    const dir = num > prevVal ? 'up' : 'down';
                    arrowHtml = `<span class="bar-arrow arrow-${dir}">${dir === 'up' ? '↑' : '↓'}</span>`;
                }

                const displayNum = wrapEditable(k, numStr, 'bar');
                const extraHtml = (extraDesc && !isMundane(extraDesc))
                    ? `<div class="desc-append ${getEffectClass(k, extraDesc)}"><div class="data-val">${wrapEditable(k+'_desc', extraDesc, 'text')}</div></div>`
                    : '';

                html += `
                <div style="margin-bottom:8px; position:relative;" class="bar-row-wrap ${wrapExtraCls} ${isFull ? 'is-full' : ''}" data-changed="${prevVal !== undefined && prevVal !== num ? '1' : '0'}">
                    <div class="bar-row">
                        <div class="bar-key" style="${keyColorStyle}">${k}</div>
                        <div class="bar-wrap ${innerWrapCls}" style="overflow:${isFull && !k.includes('理智') ? 'visible' : 'hidden'};">
                            <div class="bar-fill ${fillCls} ${fillFullCls}" style="width:${Math.min(num,100)}%;"></div>
                        </div>
<div class="bar-num" style="${keyColorStyle}">${arrowHtml}${displayNum}</div>
                    </div>
                    ${fullFxHtml}
                    ${extraHtml}
                </div>`;
            }
            /* 本轮数值存档，供下轮比较 */
            try { sessionStorage.setItem('kt_prev_bar_vals', JSON.stringify(nextBarVals)); } catch(e) {}
            return html;
        };


        const renderTubes = (obj) => {
            let html = ''; for(let [k, v] of Object.entries(obj)) {
                if(tubeKeys.includes(k) && !isMundane(v)) {
                    let parts = v.split('|'); let numStr = parts[0].trim(); let extraDesc = parts.slice(1).join('|').trim(); let m = numStr.match(/\d+/); let num = m ? parseInt(m[0]) : 0;
                    if(num === 0 && numStr.indexOf('0') === -1) continue;
                    let fillPct = Math.min((num / 100) * 100, 100);
                    if(fillPct < 2 && num > 0) fillPct = 2;
                    let isOverload = fillPct >= 100 ? 'overload' : '';
                    let effect = extraDesc ? getEffectClass(k, extraDesc) : 'eff-sticky'; if (effect === 'eff-crust') isOverload = '';
                    let displayNum = wrapEditable(k, numStr, 'tube');
                    let extraHtml = (extraDesc) ? `<div class="tube-desc">${wrapEditable(k+'_desc', extraDesc, 'text')}</div>` : '';
                    const tubeDisplayKey = k.replace('体内残留精液_口部','体内残留_口').replace('体内残留精液_女穴','体内残留_穴').replace('体内残留精液_后庭','体内残留_后').replace('今日被迫产奶量','今日产奶量').replace('今日射入摄取','今日摄取').replace('今日精液摄入量','今日摄取');
                    html += `<div class="tube-card ${effect}"><div class="tube-header"><span class="tube-key" data-orig-key="${k}">💉 ${tubeDisplayKey}</span><span class="tube-num">${displayNum}</span></div><div class="tube-container"><div class="tube-fill ${isOverload}" style="width: ${fillPct}%;"></div></div>${extraHtml}</div>`;
                }
            } return html;
        };

        const checkEpt = (h, emptyMsg = "尚未收集到足够的数据喵~") => { return h === '' ? `<div class="empty-state">${emptyMsg}</div>` : h; };
        const setHtml = (id, c) => { document.getElementById(id).innerHTML = c; };

        let pregOrder = [
            '母体认知', '当前生理判定', '腹内储卵量', '泌乳状态', '今日被迫产奶量',
            '母性与淫性混淆度', '子宫沦陷与闭口状态', '孕期肉体超敏发情度', '胎内环境浊化度'
        ];
        let pregHtml = '';
        pregOrder.forEach(k => {
            if(data.preg[k] && !isMundane(data.preg[k])) {
                let tempObj = {}; tempObj[k] = data.preg[k];
                if(tubeKeys.includes(k)) { pregHtml += renderTubes(tempObj); }
                else if(barKeys.includes(k)) { pregHtml += renderBars(tempObj); }
                else { pregHtml += renderItems(tempObj, true); }
            }
        });

        // 🌟 核心：移除 1,2,3 Tab 的 details 折叠体，其中衣着与肉体去除了标题，完全冷感直出 🌟
        // 🌟 核心提取：将时间与焦点剥离为独立悬浮结构 🌟
        let timeStr = data.base['当前时间'] || '';
        let focusStr = data.base['镜头焦点'] || '';

        let displayTimeMatch = timeStr.match(/^([^(（]+)/); // 提取如 2026-03-02 11:58
        let timeRaw = displayTimeMatch ? displayTimeMatch[1].trim() : '';

        let suffixMatch = timeStr.match(/[（(](.*?)[）)]/); // 提取如 已连续休息X小时
        let suffixRaw = suffixMatch ? suffixMatch[1].trim() : '';
        // 动态判定：只有涉及特殊记录才显示后缀
        let finalSuffix = '';
        if (suffixRaw && !isMundane(suffixRaw)) {
            finalSuffix = `<span class="badge-time-suffix">(${suffixRaw.replace('做爱', '爱爱')})</span>`;
        }

        let timeBadgeHtml = '';
        if(timeRaw || focusStr) {
            timeBadgeHtml = `
            <div class="top-time-badge">
                ${timeRaw ? `<div class="badge-time-row"><span class="badge-time-icon">⏰</span><span class="badge-time-text">${wrapEditable('当前时间', timeRaw, 'text')} ${finalSuffix}</span></div>` : ''}
                ${(focusStr && !isMundane(focusStr)) ? `<div class="badge-focus-text">${wrapEditable('镜头焦点', focusStr, 'text')}</div>` : ''}
            </div>`;
        }

        // 由于时间与焦点已抽出，需要从 base 对象中移除，以免重复渲染其余残留（如果有的话）
        let residualBase = { ...data.base };
        delete residualBase['当前时间'];
        delete residualBase['当前称号']; // 称号早被剥离处理了
        delete residualBase['镜头焦点'];
        delete residualBase['当前场景氛围'];

        // 提取氛围实景描写部分（竖线后的文字）
        const _ambRaw = data.base['当前场景氛围'] || '';
        const _ambParts = _ambRaw.split('|');
        const _ambScene = _ambParts.length > 1 ? _ambParts.slice(1).join('').trim() : '';
        const _ambTag   = _ambParts[0].trim().toLowerCase();
        // 氛围条颜色跟随主题
        const _AMB_COLOR_MAP2 = {
            sakura:'#ffb3d0',summer:'#40ffd0',maple:'#ff8c30',snow:'#c0e0ff',
            romance:'#ff7eb3',danger:'#b05070',rain:'#8090b0',cozy:'#ffc060',
            golden:'#ffcc40',dawn:'#ff9888',ocean:'#60d0ff',moonlit:'#b0c8ff',
            starry:'#e0d0ff',drunk:'#ff80a0',confetti:'#ffee30',library:'#c8a850',
            magic:'#9880d0',shower:'#a0d0ff',aurora:'#60ffcc',dream:'#ff80ff',
        };
        let _ambColor2 = '#8c92a6';
        for (const _ak in _AMB_COLOR_MAP2) {
            if (_ambTag.includes(_ak)) { _ambColor2 = _AMB_COLOR_MAP2[_ak]; break; }
        }
        const _ambSceneHtml = (_ambScene && !isMundane(_ambScene)) ? `
        <div style="
            display:flex; align-items:flex-start; gap:8px;
            padding:7px 10px; margin-bottom:4px;
            background:rgba(0,0,0,0.35);
            border-left:3px solid ${_ambColor2};
            border-radius:4px;
            box-shadow: inset 0 0 12px rgba(0,0,0,0.5);
        ">
            <span style="font-size:0.78em; flex-shrink:0; opacity:0.7; margin-top:1px; filter:drop-shadow(0 0 4px ${_ambColor2});">🌈</span>
            <span style="font-size:0.78em; font-weight:700; color:rgba(255,255,255,0.75); line-height:1.5; font-style:italic;">${_ambScene}</span>
        </div>` : '';
        // ── 剔除日常Tab专属字段，防止被塞进基础状态Tab ──
        const DAILY_ONLY_KEYS = [
            '精力储备', '今日心情基调', '当前在做的事', '事项',
            '饥饿感', '睡眠债', '其他身体杂项',
            '当前位置', '当前状态', '今日已去过', '待去/计划中',
            '今日体感里程', '今日体感里程',
            '当前体质', '系统备注', '升级预警',
            '本轮新增Flag', '已解除Flag', '存活率',
            '判定依据', '今日轨迹', '近期计划', '长线计划',
        ];
        DAILY_ONLY_KEYS.forEach(k => delete residualBase[k]);
        // 兜底：清除便利贴符号开头的key，防止混入状态Tab
        Object.keys(residualBase).forEach(k => {
            if (/^[❗❓✅💭💢🫀📌]/.test(k)) delete residualBase[k];
        });
        // 额外清除行程轨迹格式的key（HH:MM → 格式）
        Object.keys(residualBase).forEach(k => {
            if (/^\d{1,2}:\d{2}/.test(k)) delete residualBase[k];
            if (/^$$确定$$|^$$模糊$$/.test(k)) delete residualBase[k];
            if (/^$$\d{4}|^下周|^下个月/.test(k)) delete residualBase[k];
        });
        // 重新注入：将时间和焦点作为正常流模块顶置，随字数自适应纵向延伸
        // 🎀 衣物蔽体率和场景暴露度单独提取为时间戳样式
        const CLOTH_STAMP_KEYS = ['衣物蔽体率', '当前场景暴露度'];
        let clothStampHtml = '';
        const clothStampItems = [];
        CLOTH_STAMP_KEYS.forEach(k => {
            const v = data.clothes[k];
            if (!v || isMundane(v)) return;
            // 提取数字和括号内后缀
            const numMatch = v.match(/\d+/);
            const suffixMatch = v.match(/[（(](.*?)[）)]/);
            const numPart = numMatch ? numMatch[0] : v;
            const suffixPart = suffixMatch ? suffixMatch[1] : '';
            const icon = k.includes('蔽体') ? '👗' : '👁️';
            const label = k.includes('蔽体') ? '蔽体/' : '暴露/';
            const editableNum = wrapEditable(k, numPart, 'text');
            clothStampItems.push(`
                <div class="cloth-stamp-item">
                    <span class="cloth-stamp-icon">${icon}</span>
                    <span class="cloth-stamp-key">${label}</span>
                    <span class="cloth-stamp-val">${editableNum}%</span>
                    ${suffixPart ? `<span class="cloth-stamp-suffix">(${suffixPart})</span>` : ''}
                </div>`);
        });
        if (clothStampItems.length > 0) {
            clothStampHtml = `<div class="cloth-stamp-row">${clothStampItems.join('')}</div>`;
        }

        // 🎀 其余衣着字段（排除已做时间戳的两个）
        let residualClothes = { ...data.clothes };
        CLOTH_STAMP_KEYS.forEach(k => delete residualClothes[k]);
        const clothBodyHtml = renderItems(residualClothes, true);
        const hasClothContent = clothStampHtml || (!isMundane(Object.values(residualClothes).join('')));

        // ⏱️ 性行为总时长单独提取
        let sexDurationHtml = '';
        const sexDurVal = data.stat['性行为总时长'];
        if (sexDurVal && !isMundane(sexDurVal)) {
            const escDur = sexDurVal.replace(/'/g, "\\'");
            sexDurationHtml = `
            <div style="display:flex; align-items:center; gap:8px; padding:6px 10px;
                background:linear-gradient(90deg,rgba(255,126,179,0.12),rgba(0,0,0,0.3));
                border-radius:8px; border-left:3px solid rgba(255,126,179,0.5);
                margin-bottom:2px;">
                <span style="font-size:1.1em; flex-shrink:0; opacity:0.7; margin-top:1px;">⏱️</span>
                <span style="font-size:0.68em; font-weight:900; color:#8c92a6; font-family:monospace; flex-shrink:0;">总时长／</span>
                <span style="font-size:0.8em; font-weight:900; color:#ffb3c6; font-family:monospace; text-shadow:0 0 4px rgba(255,126,179,0.5);">
                    <span class="editable-val" onclick="openEditor('性行为总时长','${escDur}',this,event)">${sexDurVal}</span>
                </span>
            </div>`;
        }

        setHtml('tab-base', `
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${timeBadgeHtml}
                ${_ambSceneHtml}
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${renderItems(residualBase)}
                    ${renderBars(data.mind)}
                                    ${renderItems(data.mind)}
                </div>
                ${hasClothContent ? `
                <div class="cloth-section-divider">🎀 衣着</div>
                ${clothStampHtml}
                 ${clothBodyHtml !== '' ? clothBodyHtml : ''}
                ` : ''}
                <div id="depr-whisper-panel"></div>
            </div>
        `);       

        (function renderBodyTab() {
            const TEMP_KEY = '体温病理性发热';
            const FOREIGN_KEYS = ['口部异物','小逼异物','后庭异物','子宫异物'];
const SENSOR_KEYS = Object.keys(data.body).filter(k => !['体温病理性发热','口部异物','小逼异物','后庭异物','子宫异物'].includes(k));
            // 段1：体温时间戳常驻行
            let tempHtml = '';
            const tempVal = data.body[TEMP_KEY];
            if (tempVal && !isMundane(tempVal)) {
                let tempClass = 'temp-normal';
                if (/(高热|滚烫|发烫|火热|极热)/.test(tempVal)) tempClass = 'temp-hot';
                else if (/(发热|高烧|发烫|灼热|燥热|潮热|低烧|炽热偏高|升温|温热)/.test(tempVal)) tempClass = 'temp-warm';
                tempHtml = `<div class="body-temp-bar">
                    <span class="body-temp-icon">🌡️</span>
                    <span class="body-temp-key">体温／</span>
                    <span class="body-temp-val ${tempClass}">${wrapEditable(TEMP_KEY, tempVal, 'text')}</span>
                </div>`;
            }

            // 段2：肉体部位智能网格流（保持原顺序，原地变身大框或小的双列格）
const getBodyEff = (key, val) => {
                const v = val.toLowerCase();
                // 否定词前缀检测：句子开头或紧跟关键词前有"无/没有/正常"则跳过特效
                const isNegated = /^(无|没有|正常|干净|尚无|暂无|未见)|无[充血肿胀溢液酸痛]|没有[充血肿胀溢液酸痛]|未见[充血肿胀溢液酸痛]/.test(v.trim());
const poundingKeys = ['子宫','宫颈','小逼','阴道','阴蒂','后庭','结肠','小腹','阴茎','龟头','根部','肉棒'];
                let isPound = poundingKeys.some(pk => key.includes(pk));
                if (!isNegated && isPound && /(撞击|夯干|捣烂|撑裂|贯穿|深剿|打桩|狂干|酸痛|顶弄|疯狂|发麻)/.test(v)) return 'eff-pounding';
                if (!isNegated && /(精|泥泞|拉丝|白浊|内射|溢出|灌满|黏稠|浓液|乳白|潮喷)/.test(v)) return 'eff-sticky';
                if (/(干涸|结痂|干掉|凝固|变硬|发硬|干痕|斑驳)/.test(v)) return 'eff-crust';
                if (!isNegated && /(湿|水|潮|汗|滑腻|颤栗|发抖|泌乳|分泌)/.test(v)) return 'eff-wet';
                if (!isNegated && /(肿|破|外翻|充血|发热|痉挛|高潮|限界|失禁|战损|翻白眼)/.test(v)) return 'eff-swollen';
                return 'eff-normal';
            };
            let gridFlowHtml = '';
            SENSOR_KEYS.forEach(k => {
                const v = data.body[k];
                if (!v || isMundane(v)) return;
                const eff = getBodyEff(k, v);
                const effClass = eff !== 'eff-normal' ? eff : '';

                const thrustClassForGrid = thrustTargetKeys.includes(k) ? getThrustSpeedClass(v) : '';
                const thrustHtmlForGrid = thrustClassForGrid ? `<div class="thrust-radar-container ${thrustClassForGrid}"><div class="radar-label">📡 腔道介入雷达 (TSR)</div><div class="thrust-radar-bar"><div class="piston"></div></div></div>` : '';

                if (v.length > 18 || thrustHtmlForGrid) {
                    // 长文本或有雷达：强制跨越两列
                    gridFlowHtml += `<div class="data-row ${effClass}" style="grid-column: 1 / -1; margin-bottom: 0;">
                        <span class="data-key">${k}</span>
                        <div class="data-val">${wrapEditable(k, v, 'text')}</div>
                        ${thrustHtmlForGrid}
                    </div>`;
                } else {
                    // 短文本且无雷达：保持双列小格子
                    gridFlowHtml += `<div class="body-grid-item ${effClass}">
                        <div class="bgi-key">${k}</div>
                        <div class="bgi-val">${wrapEditable(k, v, 'text')}</div>
                    </div>`;
                }
            });
            const gridSection = gridFlowHtml ? `<div class="body-grid">${gridFlowHtml}</div>` : '';

            // 段3：异物单列
            let foreignHtml = '';
            FOREIGN_KEYS.forEach(k => {
                const v = data.body[k];
                if (!v || isMundane(v)) return;
                let eff = getBodyEff(k, v);
                let thrustClass = getThrustSpeedClass(v);
                let thrustHtml = thrustClass ? `<div class="thrust-radar-container ${thrustClass}"><div class="radar-label">📡 腔道介入雷达 (TSR)</div><div class="thrust-radar-bar"><div class="piston"></div></div></div>` : '';
                foreignHtml += `<div class="data-row ${eff}">
                    <span class="data-key">${k}</span>
                    <div class="data-val">${wrapEditable(k, v, 'text')}</div>
                    ${thrustHtml}
                </div>`;
            });
            const foreignSection = foreignHtml ? `<div class="body-foreign-wrap">${foreignHtml}</div>` : '';

            const allEmpty = !tempHtml && !gridSection && !foreignSection;
            setHtml('tab-body', allEmpty
                ? '<div class="empty-state">身体干干净净的，没有被欺负的痕迹喵！</div>'
                : `<div style="display:flex;flex-direction:column;gap:6px;">${tempHtml}${gridSection}${foreignSection}</div>`
            );
        })();
        // 后面需要折叠的保持原样
        setHtml('tab-depr', `<details class="cat-fold" open><summary class="fold-title"><span>😈</span> 沉沦刻度</summary><div class="fold-content" style="padding-top:12px;">${checkEpt(renderBars(data.deprave) + renderItems(data.deprave, true), "非常理智乖巧，毫无恶堕倾向~")}</div></details><details class="cat-fold" open><summary class="fold-title"><span>🔥</span> 行为统计</summary><div class="fold-content">${sexDurationHtml}${checkEpt(renderStatGrid(data.stat), "暂时没有遭受任何惩罚或战损")}</div></details>`);
        setHtml('tab-fluid', `<details class="cat-fold" open><summary class="fold-title"><span>💦</span> 最深处留存</summary><div class="fold-content" style="padding-top:12px;">${checkEpt(renderTubes(data.fluid), "肚子里空空的，完全没有被灌满的白浊。")}</div></details><details class="cat-fold" open><summary class="fold-title"><span>🌊</span> 身体管理</summary><div class="fold-content" style="padding-top:12px;">${checkEpt(renderBars(data.fluid) + renderItems(data.fluid, true), "身体干爽清凉，没有漏水的迹象。")}</div></details>`);

        // ── 动态隐藏空Tab引擎 ──
        window.ktAutoHideEmptyTabs = function() {
            const TAB_HIDE_RULES = [
                { target: 'tab-body',  btnSel: '.tab-btn[data-target="tab-body"]' },
                { target: 'tab-depr',  btnSel: '.tab-btn[data-target="tab-depr"]' },
                { target: 'tab-fluid', btnSel: '.tab-btn[data-target="tab-fluid"]' },
                { target: 'tab-rule',  btnSel: '.tab-btn[data-target="tab-rule"]' },
                { target: 'tab-live',  btnSel: '.tab-btn[data-target="tab-live"]' },
            ];
            TAB_HIDE_RULES.forEach(rule => {
                const tabEl = document.getElementById(rule.target);
                const btnEl = document.querySelector(rule.btnSel);
                if (!tabEl || !btnEl) return;
                const contentText = (tabEl.innerText || tabEl.textContent || '').trim();
                const isEmptyStateNode = tabEl.querySelectorAll('.empty-state').length > 0;
                const hasValidData = tabEl.querySelectorAll('.data-row, .bar-row-wrap, .tube-card, .stat-item, .body-grid-item, .live-wrapper, .rule-card, .daily-sec-title, .daily-mood-bubble, .daily-sticky-wrap, .daily-flag-wrap, .daily-sched-list, .daily-physique-card, .daily-body-chips, .daily-pending-wrap').length > 0;
const isEmpty = rule.target !== 'tab-daily' && ((contentText === '') || (!hasValidData && isEmptyStateNode) || (/^(尚未收集到足够的数据|身体干干净净|非常理智乖巧|肚子里空空的|身体干爽清凉|暂时没有遭受任何惩罚或战损|尚未录入任何不可违逆|没有开启直播|目前没有开启直播，灵魂也安稳地沉睡在躯壳里喵~)/.test(contentText) && !hasValidData));
                 if (isEmpty && btnEl.dataset.forceShow !== '1') {
                    btnEl.style.display = 'none';
                    // 若当前激活的就是这个被隐藏的Tab，则切换到第一个可见Tab
                    if (tabEl.classList.contains('active')) {
                        const firstVisible = document.querySelector('.tab-btn:not([style*="display: none"]):not([style*="display:none"])');
                        if (firstVisible) switchKtTab(firstVisible.dataset.target, firstVisible, null);
                    }
                } else {
                    btnEl.style.display = '';
                }
            });
            // 隐藏完毕后更新滑块位置
            requestAnimationFrame(() => {
                const activeBtn = document.querySelector('.tab-btn.active');
                if (activeBtn) moveNavSlider(activeBtn);
            });
        };
setHtml('tab-preg', `<div style="padding:4px 0 10px 0; display:flex; flex-direction:column; gap:8px;">${pregHtml}</div>`);
        // 🍼 孕育Tab：有孕育内容才显示，否则隐藏
        const _pregTabBtn = document.querySelector('.tab-btn[data-target="tab-preg"]');
        if (_pregTabBtn) {
            const _hasPregContent = pregHtml.trim() !== '';
            if (_hasPregContent) {
                _pregTabBtn.style.display = '';
            } else {
                _pregTabBtn.style.display = 'none';
                const _pregTabContent = document.getElementById('tab-preg');
                if (_pregTabContent && _pregTabContent.classList.contains('active')) {
                    const _liveBtn = document.querySelector('.tab-btn[data-target="tab-live"]');
                    if (_liveBtn) switchKtTab('tab-live', _liveBtn, null);
                }
            }
        }
// ══ 💔 关系Tab渲染引擎 (精简版) ══
(function renderRelationTab(rawText) {
    const relBtn = document.getElementById('tabIconRelation');
    const relTabEl = document.getElementById('tab-relation');
    if (!relBtn || !relTabEl) return;
    const isMd = v => !v || /^(无|留空|—|-|\/|\s*)$/.test(v.trim()) || v.trim() === '';

    // 通用提取块工具
    function extractBlock(tag) {
        const result = {}; const lines = rawText.split('\n'); let inBlock = false;
        for (let t of lines) {
            t = t.trim();
            if (t === '[' + tag + ']') { inBlock = true; continue; }
            if (inBlock && t.startsWith('[') && t.endsWith(']')) { inBlock = false; continue; }
            if (inBlock) {
                const sep = t.indexOf(':') !== -1 ? t.indexOf(':') : t.indexOf('：');
                if (sep > 0) { const k = t.slice(0, sep).trim(), v = t.slice(sep + 1).trim(); if (k && v && !/^\{\{/.test(v)) result[k] = v; }
            }
        }
        return result;
    }
    const hasTag = tag => rawText.includes('[' + tag + ']');
    const safeRegex = (reg, v) => reg.test(v);

    // 数据获取
    let shuraData = extractBlock('全局修罗场实况'); if (!Object.keys(shuraData).length) shuraData = extractBlock('修罗场雷达');
    const multiData = extractBlock('多角关系');
    const privateData = Object.keys(extractBlock('主角真心藏匿处')).length ? extractBlock('主角真心藏匿处') : extractBlock('主角私密认知');

    // 角色档案与炸弹字典
    const chars=[], bombs=[];
    let cur = null, inBomb = false;
    for (let t of rawText.split('\n')) {
        t = t.trim();
        const mChar = t.match(/^\[对象([A-D])·(.+)$$$/);
        if (mChar) { if(cur) chars.push(cur); cur = { label: mChar[1], name: mChar[2].replace(/\{\{.*?\}\}/,'').trim(), data: {} }; continue; }
        if (cur && !inBomb && t.startsWith('[') && t.endsWith(']')) { chars.push(cur); cur = null; continue; }

        if (/^$$(待引爆隐患|引爆秘密档案)$$/.test(t)) { inBomb = true; cur = null; continue; }
        if (inBomb && t.startsWith('[') && t.endsWith(']') && !t.includes('档案#')) { inBomb = false; if(cur) bombs.push(cur); cur=null; continue; }
        if (inBomb && /^档案\s*#/.test(t)) {
            if(cur) bombs.push(cur);
            const idx = t.indexOf(':') > -1 ? t.indexOf(':') : t.indexOf('：');
            cur = { label: idx > -1 ? t.slice(0, idx).trim() : t, data: {} };
            if (idx > -1) cur.data['内容'] = t.slice(idx + 1).trim();
            continue;
        }

        if (cur) {
            const idx = t.indexOf(':') > -1 ? t.indexOf(':') : t.indexOf('：');
            if (idx > -1) {
                let k = t.slice(0, idx).trim(), v = t.slice(idx + 1).trim();
                if (k && v && !/^\{\{/.test(v)) cur.data[k] = v.split('|')[0].trim(); // 为简短直接劈掉管道符后的备注
            }
        }
    }
    if(cur && inBomb) bombs.push(cur); else if(cur) chars.push(cur);

    // 背德获取
        // 兜底：尝试多个可能的标签名称
        const depCommon = (() => {
        const r = extractBlock('暗面通用实况');
        if (Object.keys(r).length) return r;
        return extractBlock('背德暗面实况') || {};
    })();
    const depB1 = (() => { return extractBlock('分支一：背轨失控') || extractBlock('背轨失控') || extractBlock('分支A') || {}; })();
    const depB2 = (() => { return extractBlock('分支二：夺取与沦陷') || extractBlock('夺取与沦陷') || extractBlock('分支B') || {}; })();
const depB3 = (() => { return extractBlock('分支三：血缘荆棘') || extractBlock('血缘荆棘') || extractBlock('分支C') || {}; })();
    const moralM = rawText.match(/道德崩塌进度[：:]\s*(\d+)%/); const moralPct = moralM ? moralM[1] : '0';
    const depCnt = (rawText.match(/涉入禁忌关系数[：:]\s*(\d+)/) || [0,'0'])[1];

    let html = '';

    // ================= 组件工坊 =================
    const row = (k, v, vCls='') => v && !isMd(v) ? `<div class="rc-row"><span class="rc-k">${k}</span><span class="rc-v ${vCls}">${v}</span></div>` : '';
    const jBar = (pct, dsc='') => `<div class="rc-bar-wrap"><div class="rc-bar-hd"><span>嫉妒度</span><span class="txt-red">${pct}%</span></div><div class="rc-track"><div class="rc-fill" style="width:${pct}%; background:linear-gradient(90deg, #a2e1db, #fde68a, #ff7eb3, #ff1e6a);"></div></div></div>`;
    const rBar = (lLabel, rLabel, lPct) => `<div class="rc-bar-wrap" style="flex:1; margin:0;"><div class="rc-bar-hd"><span style="color:#90caf9">${lLabel} ${lPct}%</span><span style="color:#f48fb1">${rLabel} ${100-lPct}%</span></div><div class="rc-track"><div class="rc-fill" style="width:${lPct}%; background:#90caf9;"></div><div class="rc-fill" style="width:${100-lPct}%; background:#f48fb1;"></div></div></div>`;

    // 1. 修罗场雷达
    if (Object.keys(shuraData).length > 0) {
        html += `<div class="rc-title">🌸 修罗场实况</div><div class="rc-box shura-box" style="--bx-bd:rgba(244,143,177,0.3); --bx-bg:linear-gradient(135deg, rgba(200,20,80,0.1), rgba(0,0,0,0.4));">
            <div class="rlt-shura-top"><span class="rlt-shura-title">✦ ${shuraData['当前同场'] || '局势升温'}</span></div>
            <div class="rc-grid">
                ${row('最近张力', shuraData['最近张力']||shuraData['最近一次张力事件']).replace('rc-row','rc-gi full').replace('rc-v','rc-v txt-red')}
                ${row('爆发', shuraData['爆发进度']||shuraData['距公开对峙']).replace('rc-row','rc-gi').replace('rc-v','rc-v txt-gold')}
                ${row('存活', shuraData['主角存活率']||shuraData['全身而退']).replace('rc-row','rc-gi').replace('rc-v','rc-v txt-dim')}
            </div>
        </div>`;
    }

    // 2. 角色档案
    if (chars.length > 0) {
        html += `<div class="rc-title">🌷 角色档案</div>`;
        chars.forEach(c => {
            const rel = c.data['关系定性']||''; const tmp = c.data['温度']||c.data['当前关系温度']||'';
            const jealRaw = c.data['当前嫉妒度'] || ''; const jPct = jealRaw.match(/\d+/) ? parseInt(jealRaw.match(/\d+/)[0]) : -1;
            const isLo = safeRegex(/恋人/, rel), isEn = safeRegex(/死对头/, rel);
            const avCol = isLo ? '#ff7eb3' : isEn ? '#00f5ff' : '#fff';
            html += `<div class="rc-box">
                <div class="char-hd">
                    <div class="char-av" style="border-color:${avCol};color:${avCol};box-shadow:inset 0 0 8px ${avCol}22">${isLo?'🌹':isEn?'⚡':'✦'}</div>
                    <div style="flex:1;min-width:0;"><span style="font-weight:900;font-size:0.95em;color:#fff">${c.name}</span><div style="font-size:0.7em;color:#aaa;margin-top:2px;">${rel}</div></div>
                    ${tmp?`<span class="rc-badge bg-${safeRegex(/冷/,tmp)?'cyan':safeRegex(/滚|危/,tmp)?'red':'gold'}">${tmp}</span>`:''}
                </div>
                ${jPct >= 0 ? jBar(jPct) : ''}
                ${row('上回接触', c.data['上回接触']||'')}
                ${row('TA的心态', c.data['主角现在的心态']||c.data['TA的心态']||'')}
                ${row('知情状态', c.data['知情状态'], safeRegex(/确认/,c.data['知情状态']||'')?'txt-red':'txt-gold')}
            </div>`;
        });
    }

    // 3. 私密认知 & 炸弹
    if (Object.keys(privateData).length > 0) {
        html += `<div class="rc-title">🔒 私密视角</div><div class="rc-box" style="border-style:dashed; border-color:rgba(192,132,252,0.4)">
            ${row('天平', privateData['内心天平'])}
            ${row('策略', privateData['应对策略'])}
            ${row('真心', privateData['最底线真心'], 'txt-dim')}
        </div>`;
    }

    if (bombs.length > 0) {
        html += `<div class="rc-title">💣 隐患炸弹</div>`;
        bombs.forEach(b => {
            const rk = b.data['当前引爆率']||b.data['暴露风险']||''; const isBad = safeRegex(/边缘|危险|风口/,rk);
            html += `<div class="rc-box" style="--bx-bg:rgba(253,230,138,0.05); border-color:rgba(253,230,138,0.2); border-left:3px solid #fde68a;">
                <div class="rlt-shura-top"><span style="font-size:0.75em;font-weight:900;color:#fde68a;font-family:monospace;">${b.label}</span>${rk?`<span class="rc-badge ${isBad?'bg-red ani-pulse':'bg-gold'}">${rk}</span>`:''}</div>
                ${row('内容', b.data['秘密内容']||b.data['内容'])}
                ${row('隐瞒', b.data['隐瞒态势'])}
                ${row('后果', b.data['暴露灾难'], 'txt-red')}
            </div>`;
        });
    }

    // 4. 背德部分
        if (hasTag('暗面通用实况') || hasTag('分支一') || hasTag('分支二') || hasTag('分支三') || rawText.includes('道德崩塌进度') || rawText.includes('涉入禁忌关系数')) {
        html += `<div class="rc-div"></div><div class="rc-title">🩸 背德暗线</div>
        <div class="rc-box dep-box" style="--bx-bd:rgba(200,60,100,0.3); --bx-bg:linear-gradient(135deg, rgba(180,0,80,0.1), rgba(0,0,0,0.4));">
            <div class="rlt-shura-top"><span class="rlt-shura-title" style="color:#f48fb1">🌹 背德总览</span><span style="font-size:0.65em;color:#aaa">涉入: ${depCnt} 段</span></div>
            ${rBar('道德崩塌', '', moralPct)}
            <div class="rc-grid" style="margin-top:6px;">
                ${row('主要罪恶', depCommon['主要罪恶痛点']).replace('rc-row','rc-gi full').replace('rc-v','rc-v txt-red')}
                ${row('无法见光', depCommon['无法见光的痕迹']).replace('rc-row','rc-gi full').replace('rc-v','rc-v txt-gold')}
            </div>
        </div>`;
        const brBox = (bl, c, ttl, d) => {
            if(!Object.keys(d).length || !Object.values(d).some(v => v && v.trim() && !/^\{\{/.test(v.trim()))) return '';
            let bHtml = `<div class="rc-box branch-box" style="--bx-bd:${c}33; --bx-bg:linear-gradient(135deg, ${c}15, rgba(0,0,0,0.3));"><div style="font-size:0.8em;font-weight:900;color:${c};margin-bottom:4px;display:flex;justify-content:space-between;"><span>${bl}</span><span style="font-size:0.75em;opacity:0.7;font-family:monospace;">${ttl}</span></div>`;
const guiltM = (d['反差痛感']||d['无力感与扭曲占比']||d['背德快感叠加值']||'').match(/\d+/g);
            if (guiltM && guiltM.length>=2) { const g0=parseInt(guiltM[0]),g1=parseInt(guiltM[1]); if(g0+g1>0) bHtml += `<div class="rc-row" style="border:none;"><span class="rc-k">心理比</span>${rBar('压抑', '扭曲/快感', g0)}</div>`; }
            Object.keys(d).forEach(k => { if(!safeRegex(/占比|反差|参与/,k) && !isMd(d[k])) bHtml += row(k.replace('的','').slice(0,4), d[k], safeRegex(/倒计时|暴露|挑衅/, k)?'txt-red':''); });
            return bHtml + `</div>`;
        };
        html += brBox('💌 背轨失控', '#ffb3c6', depB1['第三方']||'', depB1);
        html += brBox('🌙 夺取与沦陷', '#e1bee7', depB2['侵占者']||'', depB2);
        html += brBox('🌿 血缘荆棘', '#fde68a', depB3['伦理理智值']||'', depB3);
    }

    relTabEl.innerHTML = html || '<div class="empty-state">尚未录入不可挣脱的羁绊...</div>';

    // 控制显示
    if(html) { relBtn.style.display=''; relBtn.dataset.forceShow='1'; }
    else { relBtn.style.display='none'; relBtn.dataset.forceShow='0'; }

    requestAnimationFrame(() => {
        const panel = document.getElementById('ktPanel'); const app = document.getElementById('ktApp');
        if (app && app.classList.contains('open') && panel) {
            panel.style.maxHeight = panel.scrollHeight + 500 + 'px';
        }
    });
})(document.getElementById('rawData') ? (document.getElementById('rawData').innerText || document.getElementById('rawData').textContent || '') : '');

(function renderLoverTab(rawText) {
    const loverBtn = document.getElementById('tabIconLover');
    const loverTabEl = document.getElementById('tab-lover');
    if (!loverBtn || !loverTabEl) return;

    const isMd = v => !v || /^(无|留空|—|-|\/|\s*)$/.test(v.trim()) || v.trim() === '';

    // ── 从rawData全文提取恋人相关字段 ──
    const _extractField = (fieldName) => {
        const match = rawText.match(new RegExp(fieldName + '[：:]\\s*(.+)'));
        return match ? match[1].trim() : '';
    };

    // ── 核心字段提取 ──
    const partnerName   = _extractField('对象') || _extractField('恋人') || '';
    const daysTogether  = _extractField('在一起') || '';
    const nextAnniv     = _extractField('下一个纪念日') || '';
    const stickyIndex   = _extractField('今日粘人指数') || '';
    const phaseRaw      = _extractField('蜜月/磨合/平稳/冷战') || _extractField('阶段判定') || '';
    const innerOS       = _extractField('此刻心理') || _extractField('恋人内心OS') || '';
    const diaryDate     = _extractField('月/日') || _extractField('日期') || '';
    const diaryWeather  = _extractField('天气') || '';
    const currentEmoRaw = _extractField('当前对TA的实时情绪') || '';
    const todayDetail   = _extractField('今日关于TA的一个细节') || '';
    const wantFrom      = _extractField('此刻最想从TA那里得到的') || '';
    const lastHeartRaw  = _extractField('上次收到的心意') || '';
    const gaveHeartRaw  = _extractField('上次主动给出的心意') || '';
    const wantInHeart   = _extractField('当前心里默默想要的') || '';
    const nickRaw       = _extractField('专属称呼/习惯') || '';
const povRaw        = _extractField('本轮视角') || _extractField('【本轮视角】') || '';

    // 冷战字段
    const coldCause     = _extractField('冷战起因') || _extractField('起因') || '';
    const coldDays      = _extractField('冷战第') || '';
    const coldWho       = _extractField('谁先开口可能性') || '';
    const coldUnSaid    = _extractField('还没说出口的话') || '';
    const coldFake      = _extractField('表面伪装') || '';
    const coldBreak     = _extractField('偷偷破功') || '';
    const coldRatio     = _extractField('委屈/生气占比') || '';

    // 破裂字段
    const fatalWound    = _extractField('致命伤') || '';
    const breakDays     = _extractField('决裂第') || '';
    const lastBlade     = _extractField('最狠的一刀') || '';
    const withdrawRaw   = _extractField('戒断反应') || '';
    const remainRaw     = _extractField('残局状态') || '';

    // 不安全感字段
    const insecTrigger  = _extractField('本轮触发事') || '';
    const possessRaw    = _extractField('占有欲强度') || '';
    const insecDetail   = _extractField('应激细节') || '';
    const insecDrain    = _extractField('内耗度') || '';
    const insecOS       = _extractField('内耗OS') || '';

    // 秘密动作字段
    const secretContent = _extractField('内容') || '';
    // 共同记忆
    const memoryLines = [];
    let inMemBlock = false;
    rawText.split('\n').forEach(ln => {
        const t = ln.trim();
        if (t.includes('共同记忆存档')) { inMemBlock = true; return; }
        if (inMemBlock && t.startsWith('·')) memoryLines.push(t.replace(/^·\s*/, '').trim());
        if (t.startsWith('[') && t.endsWith(']') && !t.includes('共同记忆')) inMemBlock = false;
    });

    // 便利贴（恋人专属）
    const loverNoteLines = [];
    let inLoverNoteBlock = false;
    rawText.split('\n').forEach(ln => {
        const t = ln.trim();
        if (t === '[恋人脑内便利贴]') { inLoverNoteBlock = true; return; }
        if (t.startsWith('[') && t.endsWith(']') && t !== '[恋人脑内便利贴]') { inLoverNoteBlock = false; return; }
        if (inLoverNoteBlock && t.length > 2 && !t.includes('最多5条')) loverNoteLines.push(t);
    });

    // 📓 日记正文（无敌暴力捕捉：截取到下一个方括号区块前的内容）
    let diaryText = '';
    const diaryTitleIdx = rawText.indexOf('[恋人日记]');
    if (diaryTitleIdx !== -1) {
        let afterDiary = rawText.slice(diaryTitleIdx + 6);
        let nextBracketIdx = afterDiary.indexOf('[');
        let rawContent = nextBracketIdx !== -1 ? afterDiary.slice(0, nextBracketIdx) : afterDiary;
        let dLines = rawContent.trim().split('\n');
        if (dLines.length > 0) {
            // 如果第一行包含数字(日期)或天气特征字，就把它剔除，剩下的全是正文
            if (/\d/.test(dLines[0]) || /晴|雨|阴|雪|云|雾|风|天气|气候/.test(dLines[0])) {
                dLines.shift();
            }
            diaryText = dLines.join('\n').trim();
        }
    }
    // ── 判断是否有恋人数据 ──
    const hasLoverData = !isMd(partnerName) || !isMd(innerOS) || !isMd(diaryText) || memoryLines.length > 0;
    if (!hasLoverData) {
        loverBtn.style.display = 'none';
        loverTabEl.innerHTML = '';
        return;
    }
    loverBtn.style.display = '';

    // ── 阶段判断（用于热度主题） ──
    const isCold    = /冷战/.test(phaseRaw);
    const isBroken  = /破裂|决裂|濒临/.test(phaseRaw);
    const isSweep   = /蜜月|滚烫/.test(phaseRaw);
    const isWarm    = /温热|平稳/.test(phaseRaw);

    let heatClass = '';
    if (isBroken)   heatClass = 'lover-heat-broken';
    else if (isCold) heatClass = 'lover-heat-cold';
    else if (isSweep) heatClass = 'lover-heat-scorching';
    else if (isWarm)  heatClass = 'lover-heat-warm';

    // ── 粘人指数解析 ──
    const stickyMatch  = stickyIndex.match(/(\d+)%/);
    const stickyNum    = stickyMatch ? parseInt(stickyMatch[1]) : 0;
    const stickyDesc   = stickyIndex.replace(/[\d%]+/, '').replace(/^\s*\|\s*/, '').trim();
    const stickyColor  = isCold ? (stickyNum < 20 ? '#90caf9' : '#64b5f6') : isBroken ? '#f48fb1' : (stickyNum > 70 ? '#ff1e6a' : '#ff7eb3');

    // ── 冷战委屈生气比例解析 ──
    let sadPct = 65, madPct = 35;
    const ratioMatch = coldRatio.match(/委屈(\d+)%.*生气(\d+)%/);
    if (ratioMatch) { sadPct = parseInt(ratioMatch[1]); madPct = parseInt(ratioMatch[2]); }

    // ── 占有欲/内耗数值解析 ──
    const possessNum = parseInt((possessRaw.match(/\d+/) || ['0'])[0]);
    const drainNum   = parseInt((insecDrain.match(/\d+/) || ['0'])[0]);

    let html = `<div class="lover-tab-wrap" style="position:relative;overflow:hidden;">`;

    // ── 关系温度场背景层 ──
    html += `<div class="rel-heat-field"></div>`;

    // ── 冰裂纹（冷战专属） ──
    if (isCold) {
        html += `<div class="frost-crack" style="top:0;left:0;width:100%;height:100%;">
            <svg width="100%" height="100%" viewBox="0 0 380 260" preserveAspectRatio="none">
                <path d="M 0,0 L 42,28 L 28,52 L 55,72 L 38,105"/>
                <path d="M 380,0 L 338,32 L 352,58 L 318,82"/>
                <path d="M 42,28 L 58,18 L 72,35"/>
            </svg>
        </div>`;
    }

    // ── 破裂血渗点（破裂专属） ──
    if (isBroken) {
        html += `<div class="blood-seep" style="width:80px;height:80px;bottom:-20px;left:-20px;background:radial-gradient(circle,rgba(120,0,50,0.35),transparent 70%);"></div>`;
        html += `<div class="blood-seep" style="width:60px;height:60px;top:-15px;right:-15px;background:radial-gradient(circle,rgba(100,0,40,0.28),transparent 70%);"></div>`;
        // 碎片
        [
            'top:8%;left:2%;width:18px;height:8px;clip-path:polygon(0 20%,100% 0%,80% 100%,10% 80%);transform:rotate(-15deg);',
            'top:15%;right:3%;width:12px;height:20px;clip-path:polygon(20% 0%,100% 15%,85% 100%,0% 80%);transform:rotate(22deg);',
            'bottom:12%;left:4%;width:22px;height:9px;clip-path:polygon(0 0,100% 25%,75% 100%,20% 80%);transform:rotate(8deg);'
        ].forEach(s => {
            html += `<div class="broken-shard" style="${s}"></div>`;
        });
    }

    // ── 滚烫热浪粒子（蜜月专属） ──
    if (isSweep) {
        [
            {x:'18%',y:'75%',w:'10px',h:'10px',dur:'3.2s',del:'0.3s',tx:'5px',ty:'-28px'},
            {x:'55%',y:'80%',w:'7px', h:'7px', dur:'4s',  del:'1.1s',tx:'-6px',ty:'-32px'},
            {x:'82%',y:'72%',w:'9px', h:'9px', dur:'3.6s',del:'0.7s',tx:'4px', ty:'-25px'},
        ].forEach(p => {
            html += `<div class="heat-rise-particle" style="left:${p.x};top:${p.y};width:${p.w};height:${p.h};background:rgba(255,107,157,0.7);--hp-dur:${p.dur};--hp-del:${p.del};--hp-x:${p.tx};--hp-y:${p.ty};"></div>`;
        });
    }

    // ── 温热爱心（温热专属） ──
    if (isWarm) {
        [
            {x:'12%',y:'78%',dur:'4s',  del:'0.4s', tx:'4px'},
            {x:'70%',y:'82%',dur:'5.2s',del:'1.8s', tx:'-5px'},
            {x:'42%',y:'76%',dur:'3.8s',del:'0.9s', tx:'3px'},
        ].forEach(h2 => {
            html += `<div class="warm-float-heart" style="left:${h2.x};top:${h2.y};--wh-dur:${h2.dur};--wh-del:${h2.del};--wh-x:${h2.tx};">♥</div>`;
        });
    }

    // ═
    // 📌 档案头部
    // ═
    const daysMatch  = daysTogether.match(/第(\d+)天/);
    const daysNum    = daysMatch ? daysMatch[1] : '';
    const dateMatch  = daysTogether.match(/(\d{4}-\d{2}-\d{2})/);
    const startDate  = dateMatch ? dateMatch[1] : '';

    html += `<div class="lv-header ${heatClass}" style="position:relative;z-index:5;">
        <div class="lv-name-row">
            <span class="lv-name">${partnerName || '恋人'}</span>
            ${daysNum ? `<span class="lv-badge" style="${isCold?'border-color:rgba(100,180,255,0.4);color:#90caf9;background:rgba(100,180,255,0.1);':isBroken?'border-color:rgba(180,30,80,0.5);color:#f48fb1;background:rgba(180,30,80,0.1);':''}">恋人 · 第 ${daysNum} 天</span>` : ''}
        </div>
        <div class="lv-meta-row">
            ${startDate ? `<div class="lv-meta-chip"><span class="lv-meta-k">起始/</span><span class="lv-meta-v">${startDate}</span></div>` : ''}
            ${!isMd(nextAnniv) ? `<div class="lv-meta-chip"><span class="lv-meta-k">纪念日/</span><span class="lv-meta-v gold">${nextAnniv}</span></div>` : ''}
        </div>
        ${stickyNum > 0 ? `
        <div class="lv-sticky-bar">
            <div class="lv-sticky-head">
                <span class="lv-sticky-label">🐱 今日粘人指数</span>
                <span class="lv-sticky-num" style="color:${stickyColor};text-shadow:0 0 5px ${stickyColor}88;">${stickyNum}%</span>
            </div>
            <div class="lv-sticky-track">
                <div class="lv-sticky-fill" style="width:${stickyNum}%;background:${isCold?'linear-gradient(90deg,#90caf9,#64b5f6)':isBroken?'linear-gradient(90deg,#f48fb1,#e91e63)':'linear-gradient(90deg,#ffb3c6,#ff7eb3,#ff1e6a)'};"></div>
            </div>
            ${!isMd(stickyDesc) ? `<div class="lv-sticky-desc" style="${isCold?'color:rgba(144,202,249,0.55);':''}">${stickyDesc}</div>` : ''}
        </div>` : ''}
    </div>`;

    // ═
    // 🗒️ 恋人便利贴
    // ═
    if (loverNoteLines.length > 0) {
        html += `<div class="lv-section"><div class="lv-section-title">🗒️ 脑内便利贴</div><div class="lv-note-list">`;
        loverNoteLines.slice(0, 5).forEach(line => {
const symMatch = line.match(/^([❗❓✅💭💢🫀📌])\uFE0F?\s*/u);
            const sym = symMatch ? symMatch[1] : '📌';
            const txt = symMatch ? line.slice(symMatch[0].length).trim() : line;
            if (txt) html += `<div class="lv-note-item"><span class="lv-note-sym">${sym}</span><span class="lv-note-txt">${txt}</span></div>`;
        });
        html += `</div></div>`;
    }

    html += `<div class="lv-divider"></div>`;

    // ═
    // 💗 情感状态
    // ═
    const _hasEmoData = !isMd(phaseRaw) || isCold || isBroken || !isMd(currentEmoRaw) || !isMd(fatalWound) || !isMd(coldCause);
if (_hasEmoData) html += `<div class="lv-section" style="padding-bottom:4px;"><div class="lv-section-title">${isBroken?'💔':isCold?'❄️':'💗'} 当前情感状态</div></div>`;

    if (_hasEmoData && isCold) {
        html += `<div class="lv-emo-card lv-emo-cold">
            <div class="lv-emo-head lv-emo-cold">
                <div class="lv-emo-stage-row"><span class="lv-emo-icon">🧊</span><span class="lv-emo-stage">冷战中</span></div>
                <span class="lv-emo-pov">${povRaw || '恋人视角'}</span>
            </div>
            <div class="lv-emo-body">
                ${!isMd(coldCause) ? `<div class="lv-emo-row"><span class="lv-emo-k">起因</span><span class="lv-emo-v cold-blue">${coldCause}</span></div>` : ''}
                ${!isMd(coldDays)  ? `<div class="lv-emo-row"><span class="lv-emo-k">冷战第</span><span class="lv-emo-v cold-blue">${coldDays} 天</span></div>` : ''}
                ${!isMd(coldFake)  ? `<div class="lv-emo-row"><span class="lv-emo-k">表面伪装</span><span class="lv-emo-v">${coldFake}</span></div>` : ''}
                ${!isMd(coldBreak) ? `<div class="lv-emo-row"><span class="lv-emo-k">偷偷破功</span><span class="lv-emo-v" style="color:#ffb3c6;">${coldBreak}</span></div>` : ''}
                ${!isMd(coldRatio) ? `
                <div style="display:flex;flex-direction:column;gap:4px;margin-top:2px;">
                    <div class="lv-emo-row"><span class="lv-emo-k">委屈/生气</span><span class="lv-emo-v cold-blue">委屈${sadPct}% · 生气${madPct}%</span></div>
                    <div class="lv-emo-ratio-bar"><div class="lv-emo-ratio-sad" style="width:${sadPct}%;"></div><div class="lv-emo-ratio-mad" style="width:${madPct}%;"></div></div>
                </div>` : ''}
                ${!isMd(coldWho)    ? `<div class="lv-emo-row"><span class="lv-emo-k">谁先开口</span><span class="lv-emo-v">${coldWho}</span></div>` : ''}
                ${!isMd(coldUnSaid) ? `<div style="background:rgba(100,180,255,0.06);border-radius:7px;border-left:2px solid rgba(100,180,255,0.3);padding:6px 9px;font-size:0.76em;color:rgba(144,202,249,0.75);font-style:italic;line-height:1.5;margin-top:2px;">没说出口：${coldUnSaid}</div>` : ''}
            </div>
        </div>`;
    } else if (_hasEmoData && isBroken) {
        html += `<div class="lv-emo-card lv-emo-broken">
            <div class="lv-emo-head lv-emo-broken">
                <div class="lv-emo-stage-row"><span class="lv-emo-icon">💔</span><span class="lv-emo-stage">${phaseRaw || '濒临破裂'}</span></div>
                <span class="lv-emo-pov">${povRaw || '恋人视角'}</span>
            </div>
            <div class="lv-emo-body">
                ${!isMd(fatalWound) ? `<div class="lv-emo-row"><span class="lv-emo-k">致命伤</span><span class="lv-emo-v broken-red">${fatalWound}</span></div>` : ''}
                ${!isMd(breakDays)  ? `<div class="lv-emo-row"><span class="lv-emo-k">决裂第</span><span class="lv-emo-v broken-red">${breakDays} 天</span></div>` : ''}
                ${!isMd(remainRaw)  ? `<div class="lv-emo-row"><span class="lv-emo-k">残局状态</span><span class="lv-emo-v">${remainRaw}</span></div>` : ''}
                ${!isMd(lastBlade)  ? `<div style="background:rgba(120,0,50,0.1);border-radius:7px;border-left:2px solid rgba(180,30,80,0.45);padding:6px 9px;font-size:0.76em;color:rgba(244,143,177,0.85);font-style:italic;line-height:1.5;margin-top:2px;">最狠的一刀：${lastBlade}</div>` : ''}
                ${!isMd(withdrawRaw)? `<div class="lv-emo-row"><span class="lv-emo-k">戒断反应</span><span class="lv-emo-v broken-red">${withdrawRaw}</span></div>` : ''}
            </div>
        </div>`;
    } else if (_hasEmoData) {
        const phaseIcon = isSweep ? '🌸' : isWarm ? '🌤️' : '💗';
        html += `<div class="lv-emo-card lv-emo-normal">
            <div class="lv-emo-head">
                <div class="lv-emo-stage-row"><span class="lv-emo-icon">${phaseIcon}</span><span class="lv-emo-stage">${phaseRaw || '蜜月期'}</span></div>
                <span class="lv-emo-pov">${povRaw || '恋人视角'}</span>
            </div>
    <div class="lv-emo-body">
        ${!isMd(currentEmoRaw) ? `<div class="lv-emo-row"><span class="lv-emo-k">此刻情绪</span><span class="lv-emo-v">${currentEmoRaw}</span></div>` : ''}
                ${!isMd(todayDetail)   ? `<div class="lv-emo-row"><span class="lv-emo-k">今日细节</span><span class="lv-emo-v">${todayDetail}</span></div>` : ''}
                ${!isMd(wantFrom)      ? `<div class="lv-emo-row"><span class="lv-emo-k">此刻想要</span><span class="lv-emo-v">${wantFrom}</span></div>` : ''}
            </div>
        </div>`;
    }

    // ═
    // 💭 内心OS气泡
    // ═
    if (!isMd(innerOS)) {
        const osBubbleStyle = isCold
            ? 'border-color:rgba(100,180,255,0.2);background:linear-gradient(135deg,rgba(20,35,65,0.88),rgba(15,25,50,0.92));'
            : isBroken
            ? 'border-color:rgba(180,30,80,0.25);background:linear-gradient(135deg,rgba(40,8,20,0.92),rgba(25,5,12,0.96));'
            : '';
        html += `<div class="lv-os-bubble" style="${osBubbleStyle}">
            <span class="lv-os-label">💬 INNER_OS</span>
            ${innerOS}
        </div>`;
    }

    // ═
    // 🔐 秘密动作
    // ═
const hasSecret = !isMd(secretContent);
    if (hasSecret) {
        html += `<div class="lv-secret-card">
            <div class="lv-secret-head">
                <span class="lv-secret-title">🔐 SECRET · 秘密动作（主角不知情）</span>
            </div>
            <div class="lv-secret-body">
                <div class="lv-secret-row"><span class="lv-secret-v">${secretContent}</span></div>
            </div>
        </div>`;
}

    //═
    // 📔 恋人日记
    //══
    if (!isMd(diaryText)) {
        const weatherIcon = /晴/.test(diaryWeather) ? '☀️' : /雨/.test(diaryWeather) ? '🌧️' : /云|阴/.test(diaryWeather) ? '☁️' : /雪/.test(diaryWeather) ? '❄️' : '🌤️';
        const diaryBorderColor = isCold ? 'rgba(100,180,255,0.15)' : isBroken ? 'rgba(180,30,80,0.15)' : 'rgba(255,220,180,0.18)';
        const diaryLineColor   = isCold ? 'rgba(100,180,255,0.06)'  : isBroken ? 'rgba(180,30,80,0.06)'  : 'rgba(255,200,160,0.06)';
        html += `<div class="lv-section" style="padding-bottom:4px;"><div class="lv-section-title">📔 恋人日记</div></div>
        <div class="lv-diary-wrap" style="border-color:${diaryBorderColor};">
            <div class="lv-diary-head" style="border-bottom-color:${diaryBorderColor};">
                <span class="lv-diary-date">${diaryDate || '今日'}</span>
                <span class="lv-diary-weather">${weatherIcon}</span>
            </div>
            <div class="lv-diary-body" style="background-image:repeating-linear-gradient(transparent,transparent 28px,${diaryLineColor} 28px,${diaryLineColor} 29px);background-size:100% 29px;">${diaryText.replace(/\n/g, '<br>')}</div>
        </div>`;
    }

    //═
    // 🌸 共同记忆存档
    // ═
    if (memoryLines.length > 0 || !isMd(lastHeartRaw) || !isMd(gaveHeartRaw)) {
        html += `<div class="lv-section"><div class="lv-section-title">🌸 共同记忆存档</div>`;
        if (memoryLines.length > 0) {
            html += `<div class="lv-mem-list">`;
            memoryLines.slice(0, 3).forEach(m => {
                if (m) html += `<div class="lv-mem-item">${m}</div>`;
            });
            html += `</div>`;
        }
        if (!isMd(nickRaw)) {
            html += `<div style="margin-top:6px;padding:5px 10px;background:rgba(255,126,179,0.06);border-radius:8px;border:1px solid rgba(255,126,179,0.15);font-size:0.78em;color:rgba(255,179,198,0.75);font-style:italic;">🏷️ ${nickRaw}</div>`;
        }
        if (!isMd(lastHeartRaw) || !isMd(gaveHeartRaw) || !isMd(wantInHeart)) {
            html += `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">`;
            if (!isMd(lastHeartRaw)) html += `<div class="lv-mem-exchange"><span class="lv-mem-ex-icon">🎁</span><span class="lv-mem-ex-k">收到/</span><span class="lv-mem-ex-v">${lastHeartRaw}</span></div>`;
            if (!isMd(gaveHeartRaw)) html += `<div class="lv-mem-exchange"><span class="lv-mem-ex-icon">💌</span><span class="lv-mem-ex-k">给出/</span><span class="lv-mem-ex-v">${gaveHeartRaw}</span></div>`;
            if (!isMd(wantInHeart))  html += `<div class="lv-mem-exchange" style="border-color:rgba(192,132,252,0.25);"><span class="lv-mem-ex-icon">🌙</span><span class="lv-mem-ex-k">心里想要/</span><span class="lv-mem-ex-v" style="color:#e9d5ff;">${wantInHeart}</span></div>`;
            html += `</div>`;
        }
        html += `</div>`;
    }

    html += `</div>`; // 闭合 lover-tab-wrap

    loverTabEl.innerHTML = html;

    // ── Tab有内容时确保可见 ──
    loverBtn.style.display = '';

    // ── 刷新面板高度 ──
    requestAnimationFrame(() => {
        const panel = document.getElementById('ktPanel');
        const app   = document.getElementById('ktApp');
        if (app && app.classList.contains('open') && panel) {
            panel.style.maxHeight = panel.scrollHeight + 500 + 'px';
        }
    });

})(document.getElementById('rawData') ? (document.getElementById('rawData').innerText || document.getElementById('rawData').textContent || '') : '');
        let liveH = ''; let hasLiveEvent = (Object.keys(data.live).length > 0 || data.bounties.length > 0 || data.danmakus.length > 0); let hasWallBreak = (data.wallbreak.soulThought !== '' || data.wallbreak.buybacks.length > 0);
        if(hasLiveEvent || hasWallBreak) {
            if (hasLiveEvent) {
                liveH += `<div class="live-wrapper"><div class="live-head"><span class="badge-live">🔴 LIVE</span><span class="live-title-main">☁️深网放送·云养小猫观察室</span></div>`;
                if(data.live['当前在线观众'] || data.live['总资产']) {
                    liveH += `<div class="live-stats"><span class="viewers">👥 在线: ${wrapEditable('当前在线观众', data.live['当前在线观众'] || '飙升中...')}</span><span class="coins" id="liveTotalCoins">💰 总资产: ${wrapEditable('总资产', data.live['总资产'] || '0')} 喵币</span></div>`;
                }


                if(data.live.hasOwnProperty('子宫内窥镜') || data.live.hasOwnProperty('肠道内窥镜')) {
                    liveH += `<div class="cam-grid">`; let ziText = !isMundane(data.live['子宫内窥镜']) ? data.live['子宫内窥镜'] : 'NO SIGNAL...镜头黑暗'; let ziSlimeClass = checkSlimeLens(ziText) ? 'slime-lens' : ''; liveH += `<div class="cam-box ${ziSlimeClass}"><div class="cam-label">CAM1_VAG</div><div class="cam-view">${ziText}</div></div>`;
                    let changText = !isMundane(data.live['肠道内窥镜']) ? data.live['肠道内窥镜'] : 'NO SIGNAL...未探测'; let changSlimeClass = checkSlimeLens(changText) ? 'slime-lens' : ''; let extraZ = changSlimeClass ? '' : 'color:#d1c4e9; text-shadow:0 0 3px rgba(209,196,233,0.6);'; liveH += `<div class="cam-box ${changSlimeClass}" style="border-color:#555;"><div class="cam-label">CAM2_ANAL</div><div class="cam-view" style="${extraZ}">${changText}</div></div></div>`;
                }
                if(data.danmakus.length > 0) {
                    liveH += `<div class="danmaku-box"><div class="danmaku-header"></div>`; const userColors = ['d-user-red', 'd-user-gold', 'd-user-cyan', 'd-user-pink', 'd-user-purple'];
                    data.danmakus.forEach((d, index) => { let cClass = userColors[index % userColors.length]; liveH += `<div class="danmaku-item"><span class="danmaku-user ${cClass}">[${d.user}]</span><span class="danmaku-text">${d.text}</span></div>`; }); liveH += `</div>`;
                }
                if(data.bounties.length > 0) {
                    liveH += `<div class="bounty-wrapper"><div class="bounty-title"></div>`;
                    data.bounties.forEach(b => {
                        const excAction = `[接受悬赏任务：${b.desc}]并要求立刻执行`;
                        liveH += `<div class="bounty-item-cyber" data-state="idle" data-cmd="${excAction}" onclick="handleBounty(this,event)">
                            <span class="b-rank rank-${b.rank}">${b.rank}</span>
                            <div class="b-body"><div class="b-desc"><span class="b-icon"></span>${b.desc}</div></div>
                            <div class="b-reward rank-${b.rank}-reward">🐟 ${b.coin}</div>
                        </div>`;	
                    });	
                    liveH += `</div>`;
                }
            if(hasWallBreak) {
                let moodLabel = '૮ ˶ᵔ ᵕ ᵔ˶ ა 偷偷擦眼泪...'; if(!hasLiveEvent) moodLabel = 'ฅ^•ﻌ•^ฅ 灵魂正在旁观...';
                liveH += `<div class="wall-break-wrapper" style="margin-top: ${hasLiveEvent ? '15px' : '0'};"><div class="wall-header">🐾 </div>`;
                if (data.wallbreak.soulThought !== '') { liveH += `<div class="soul-bubble">${data.wallbreak.soulThought}</div>`; }
if (data.wallbreak.buybacks.length > 0) {
                    liveH += `<div class="buyback-title"></div>`;
                    // 优先从 wallbreak 解析到的余额读取，其次从 base 兜底，再次从本地缓存
                    const _aiBalance = data.wallbreak.coinBalance != null
                        ? data.wallbreak.coinBalance
                        : (data.base['喵币余额'] ? parseInt(data.base['喵币余额'].replace(/[^\d]/g, '')) || null : null);
                    // 只在 AI 给出的值 > 本地缓存时才覆盖（防止赎买后刷新被重置）
                    const _savedCoinNow = localStorage.getItem('cat_bb_coins');
                    const _savedNumNow = _savedCoinNow !== null && /^\d+$/.test(_savedCoinNow) ? parseInt(_savedCoinNow) : null;
                    const _initCoin = _aiBalance != null ? _aiBalance : _savedNumNow;
                    if(_initCoin !== null) { window._bbCoins = _initCoin; localStorage.setItem('cat_bb_coins', String(_initCoin)); }
                    liveH += `<div class="buyback-coin-bar"><span class="buyback-coin-label">🐟 喵币余额</span><span class="buyback-coin-val" id="bbCoinVal">${_initCoin !== null ? _initCoin.toLocaleString() : '???'}</span></div>`;
                    data.wallbreak.buybacks.forEach(bb => {
                        const sysInstruct = `[第四面墙干涉：花费喵币兑换权利——${bb.desc}]`;
                        const cost = parseInt(bb.coin) || 0;
                        liveH += `<div class="buyback-card" data-cost="${cost}" data-cmd="${sysInstruct}" onclick="handleBuyback(this,event)">
                            <div class="buyback-desc">${bb.desc}</div>
                            <div style="display:flex;flex-direction:row;align-items:center;flex-shrink:0;gap:5px;">
                                <div class="buyback-cost">${bb.coin}</div>
                                <span class="buyback-done-badge">✦</span>
                            </div>
                        </div>`;
                    });
                if (data.wallbreak.wishes && data.wallbreak.wishes.length > 0) {
    liveH += `<div class="wish-title"></div>`;
    data.wallbreak.wishes.forEach(w => {
        const sysInstruct = `[第四面墙日常干涉：主角内心希望——${w.desc}，请在合适时机自然地让这个愿望在剧情里实现]`;
        const cost = parseInt(w.coin) || 0;
        liveH += `<div class="buyback-card wish-card" data-cost="${cost}" data-cmd="${sysInstruct}" onclick="handleBuyback(this,event)">
            <div class="buyback-desc">🌸 ${w.desc}</div>
            <div style="display:flex;flex-direction:row;align-items:center;flex-shrink:0;gap:5px;">
                <div class="buyback-cost">${w.coin}</div>
                <span class="buyback-done-badge">✦</span>
            </div>
        </div>`;
    });
}
                }

            if(hasLiveEvent) {document.getElementById('tabIconLive').style = "border-color:var(--kt-alert); color:var(--kt-alert); text-shadow: 0 0 5px rgba(255,30,106,0.6);"; } else if (hasWallBreak) { document.getElementById('tabIconLive').style = "border-color:#ff7eb3; color:#ff7eb3; text-shadow: 0 0 5px rgba(255,126,179,0.5);"; }
        }
        liveH += `</div>`;
        }
        liveH += `</div>`;
        }
        setHtml('tab-live', liveH || '<div class="empty-state">目前没有开启直播，灵魂也安稳地沉睡在躯壳里喵~</div>');

        // 🔴 在线观众数实时波动——渲染完 tab-live 后立即无条件启动
        (function startViewerFlicker() {
            if (window._viewerFlickerTimer) clearInterval(window._viewerFlickerTimer);
            const viewerEl = document.querySelector('.live-stats .viewers');
            if (!viewerEl) return;
            const rawText = viewerEl.textContent;
            const numMatch = rawText.match(/[\d,]+/);
            if (!numMatch) return;
            let curNum = parseInt(numMatch[0].replace(/,/g,''));
            const splitIdx = rawText.indexOf(numMatch[0]);
            const fixedPrefix = rawText.slice(0, splitIdx);
            const fixedSuffix = rawText.slice(splitIdx + numMatch[0].length);
            window._viewerFlickerTimer = setInterval(() => {
                const delta = Math.floor((Math.random() - 0.38) * 120);
                curNum = Math.max(curNum + delta, 100);
                viewerEl.textContent = fixedPrefix + curNum.toLocaleString() + fixedSuffix;
            }, 3500);
        })();
// ══ 日常Tab渲染引擎 ══
(function renderDailyTab(data) {
    const dailyEl = document.getElementById('tab-daily');
    if (!dailyEl) return;
    const isMd = v => !v || /^(无|留空|—|-|\/|\s*)$/.test(v.trim()) || v.trim() === '';
    let html = '';

    const _rawFull = (document.getElementById('rawData')?.innerText || document.getElementById('rawData')?.textContent || '');
    const _extractField = (fieldName) => {
        const match = _rawFull.match(new RegExp(fieldName + '[：:]\\s*(.+)'));
        return match ? match[1].trim() : '';
    };

    // ── 今日心情与精力储备 ──
    const energyRaw = data.base['精力储备'] || _extractField('精力储备') || '';
    const moodRaw   = data.base['今日心情基调'] || _extractField('今日心情基调') || '';
    const doingRaw  = data.base['当前在做的事'] || _extractField('当前在做的事') || '';

    if (!isMd(moodRaw) || !isMd(energyRaw)) {
        const _pick = arr => arr[Math.floor(Math.random() * arr.length)];
        const _src = moodRaw + energyRaw;
        let autoEmoji;
        if      (/(宕机|归零|翻白眼|失去意识|昏过去)/.test(_src))            autoEmoji = _pick(['💀',' 😵']);
        else if (/(发情|好想要|渴求|求|要|忍不住|欲求不满)/.test(_src))      autoEmoji = _pick(['🥵',' 🥴']);
        else if (/(羞耻|丢脸|恨不得消失|想死|想消失|被看见)/.test(_src))     autoEmoji = _pick(['🙈','😳']);
        else if (/(绝望|放弃|完了|没救|认命|麻木|什么都无所谓)/.test(_src))  autoEmoji = _pick(['😩','😰']);
        else if (/(委屈|哭|泪|难过|伤心|心酸|想哭)/.test(_src))              autoEmoji = _pick(['😢','🥺']);
        else if (/(崩溃|撑不住|撑不下去|已经不行了)/.test(_src))             autoEmoji = _pick(['😭','💧']);
        else if (/(累|疲|透支|困|没力气|提不起劲)/.test(_src))               autoEmoji = _pick(['🥱','😪']);
        else if (/(烦|生气|火|气|怒|想打人|受够了)/.test(_src))              autoEmoji = _pick(['😤','🔥']);
        else if (/(焦虑|担心|紧张|不安|心跳很快|心慌)/.test(_src))           autoEmoji = _pick(['😰','😬']);
        else if (/(恶心|想吐|膈应|不舒服|不对劲)/.test(_src))                autoEmoji = _pick(['🤢','😖']);
        else if (/(发呆|空|出神|放空|失神|什么都没想)/.test(_src))            autoEmoji = _pick(['😶‍🌫️','🌀']);
        else if (/(平静|无感|正常|没什么|普通|还好)/.test(_src))             autoEmoji = _pick(['😌','😐']);
        else if (/(期待|雀跃|好奇|想知道|迫不及待)/.test(_src))              autoEmoji = _pick(['🤩','👀']);
        else if (/(开心|快乐|高兴|好|棒|完美|充沛|爽)/.test(_src))           autoEmoji = _pick(['🥰','😊']);
        else if (/(心跳|心动|脸红|怦然|喜欢)/.test(_src))                    autoEmoji = _pick(['🫀','💗']);
        else if (/(无奈|算了|就这样吧|没办法|认了)/.test(_src))              autoEmoji = _pick(['😮‍💨','🙃']);
        else                                                                   autoEmoji = _pick(['😌','☺️']);
        const tagCandidates = [];
        if(!isMd(energyRaw)) tagCandidates.push(energyRaw);
        if(!isMd(moodRaw) && moodRaw.length <= 7) tagCandidates.push(moodRaw);
        const tagsHtml = tagCandidates.map(t => `<span class="daily-mood-tag">${t}</span>`).join('');
        html += `<div class="daily-sec-title">📖 今日心情</div>
        <div class="daily-mood-bubble">
            <div class="daily-mood-tags">
                <span class="daily-mood-main-emoji">${autoEmoji}</span>
                ${tagsHtml}
            </div>
            ${(!isMd(moodRaw) && moodRaw.length > 7) ? `<div class="daily-mood-text">${moodRaw}</div>` : ''}
            ${!isMd(doingRaw) ? `<div class="daily-mood-text" style="margin-top:4px;color:rgba(200,190,255,0.7);font-size:0.78rem;">正在：${doingRaw}</div>` : ''}
        </div>`;
    }

    // ── 脑内便利贴 ──
    const noteLines = [];
    let inNoteBlock = false;
    _rawFull.split('\n').forEach(ln => {
        const t = ln.trim();
        if (t === '[脑内便利贴]') { inNoteBlock = true; return; }
        if (t.startsWith('[') && t.endsWith(']') && t !== '[脑内便利贴]') { inNoteBlock = false; return; }
        if (inNoteBlock && t.length > 2 && !t.includes('——最多5条')) noteLines.push(t);
    });

    if (noteLines.length > 0) {
        html += `<div class="daily-sec-title">🗒️ 脑内便利贴</div><div class="daily-sticky-wrap">`;
        noteLines.slice(0, 5).forEach(line => {
const symMatch = line.match(/^([❗❓✅💭💢🫀📌])\uFE0F?\s*/u);
            const sym = symMatch ? symMatch[1] : '📌';
            let txt = symMatch ? line.slice(symMatch[0].length).trim() : line;
            if(txt.startsWith('=')) txt = txt.replace(/^=\s*/, ''); // 去除有时候AI加的等号
            if (txt) html += `<div class="daily-sticky-item"><span class="daily-sticky-sym">${sym}</span><span class="daily-sticky-txt">${txt}</span></div>`;
        });
        html += `</div>`;
    }

    // ── 身体杂项 ──
    const hungerRaw = data.base['饥饿感'] || _extractField('饥饿感') || '';
    const sleepRaw  = data.base['睡眠债'] || _extractField('睡眠债') || '';
    const bodyMiscRaw = data.base['其他身体杂项'] || _extractField('其他身体杂项') || '';
    const hasBodyMisc = !isMd(hungerRaw) || !isMd(sleepRaw) || !isMd(bodyMiscRaw);
    if (hasBodyMisc) {
        html += `<div class="daily-sec-title">🩺 身体杂项</div><div class="daily-body-chips">`;
        if (!isMd(hungerRaw)) html += `<div class="daily-body-chip"><span class="dbc-k">饥饿/</span><span class="dbc-v">${hungerRaw}</span></div>`;
        if (!isMd(sleepRaw))  html += `<div class="daily-body-chip"><span class="dbc-k">睡眠/</span><span class="dbc-v">${sleepRaw}</span></div>`;
        if (!isMd(bodyMiscRaw)) html += `<div class="daily-body-chip"><span class="dbc-k">其他/</span><span class="dbc-v">${bodyMiscRaw}</span></div>`;
        html += `</div>`;
    }

    // ── Flag监测板 ──
    const flagLines = [];
    let inFlagBlock = false;
    _rawFull.split('\n').forEach(ln => {
        const t = ln.trim();
        if (t === '[Flag监测板]') { inFlagBlock = true; return; }
        if (t.startsWith('[') && t.endsWith(']') && t !== '[Flag监测板]') { inFlagBlock = false; return; }
        if (inFlagBlock && t.includes('🚩')) flagLines.push(t);
    });

    const flagMetaRaw = data.base['存活率'] || _extractField('存活率') || '';
    const flagNewRaw  = data.base['本轮新增Flag'] || _extractField('本轮新增Flag') || '';
    const flagExistRaw= data.base['已解除Flag'] || _extractField('已解除Flag') || '';

    if (flagLines.length > 0 || !isMd(flagMetaRaw)) {
        html += `<div class="daily-sec-title">🚩 Flag 监测板</div>`;
        if (!isMd(flagMetaRaw) || !isMd(flagNewRaw) || !isMd(flagExistRaw)) {
            html += `<div class="daily-flag-meta">`;
            if (!isMd(flagNewRaw))  html += `新增 ${flagNewRaw}　`;
            if (!isMd(flagExistRaw)) html += `解除 ${flagExistRaw}　`;
            if (!isMd(flagMetaRaw)) html += `存活率：${flagMetaRaw}`;
            html += `</div>`;
        }
        html += `<div class="daily-flag-wrap">`;
        flagLines.slice(0, 5).forEach(line => {
            const quoteMatch = line.match(/["\u201C"]([^"\u201C\u201D"]+)["\u201D"]/);
            const quote = quoteMatch ? quoteMatch[1] : line.split('——')[0].replace('🚩', '').trim();
            const suffixMatch = line.match(/——\s*(.+)$/);
            const suffix = suffixMatch ? suffixMatch[1].trim() : '';
            const isTriggered = /(已触发|已引爆|TRIGGERED)/.test(suffix);
            // 胶囊文字：已引爆用固定标签，倒计时只取"倒计时"三字+轮数，其余截到6字
            let pillText = '';
            if (isTriggered) {
                pillText = '已引爆 💥';
            } else {
                const countdownM = suffix.match(/倒计时[：:]\s*(\S+)/);
                if (countdownM) {
                    pillText = '⏳ ' + countdownM[1];
                } else {
                    pillText = suffix.slice(0, 6) || '';
                }
            }
            // suffix展示：已触发时只展示"结果"部分，避免重复倒计时文字
            const suffixDisplay = (() => {
                if (!suffix) return '';
                if (isTriggered) {
                    // 只取"已触发"或"结果："后面的第一句，截断防止太长
                    const resultM = suffix.match(/(?:已触发|结果)[：:]\s*(.+?)(?:\s*\/|$)/);
                    return resultM ? resultM[1].slice(0, 20) : suffix.slice(0, 20);
                }
                // 倒计时行：隐藏重复的倒计时文字，只留非倒计时部分
                const withoutCountdown = suffix.replace(/倒计时[：:][^/]+\/?/, '').trim().replace(/^\/\s*/, '');
                return withoutCountdown.slice(0, 20) || suffix.slice(0, 20);
            })();
            html += `<div class="daily-flag-bubble">
                <span class="daily-flag-sym">🚩</span>
                <div class="daily-flag-body">
                    <div class="daily-flag-quote">"${quote}"</div>
                    ${suffixDisplay ? `<div class="daily-flag-suffix">—— ${suffixDisplay}</div>` : ''}
                </div>
                ${pillText ? `<span class="daily-flag-pill${isTriggered ? ' flag-triggered' : ''}">${pillText}</span>` : ''}
            </div>`;
        });
        html += `</div>`;
    }

    // ── 行程快照（新版：时间轴 + 近期计划 + 长线计划） ──
    const locCurrent   = data.base['当前位置']    || _extractField('当前位置')    || '';
    const locStatus    = data.base['当前状态']    || _extractField('当前状态')    || '';
    const locMileage   = data.base['今日体感里程'] || _extractField('今日体感里程') || '';

    // 解析今日轨迹（HH:MM → 地点 | 时长 | 备注 格式）
    const trajectoryLines = [];
    const nearPlanLines   = [];   // 近期计划 [确定]/[模糊]
    const longPlanLines   = [];   // 长线计划 [YYYY-MM-DD 或 下周/下个月]
    let inSchedBlock = false;
    _rawFull.split('\n').forEach(ln => {
        const t = ln.trim();
        if (t === '[行程快照]') { inSchedBlock = true; return; }
        if (t.startsWith('[') && t.endsWith(']') && t !== '[行程快照]') { inSchedBlock = false; return; }
        if (!inSchedBlock) return;
        // 时间轴行：以 HH:MM 开头
        if (/^\d{1,2}:\d{2}\s*→/.test(t)) { trajectoryLines.push(t); return; }
        // 近期计划行
        if (/^$$(确定|模糊)$$/.test(t)) { nearPlanLines.push(t); return; }
        // 长线计划行（以 [ 开头且包含年份/下周/下个月）
        if (/^$$(\d{4}|下周|下个月|[一二三四]月)/.test(t)) { longPlanLines.push(t); return; }
    });

    const hasAnySchedContent = !isMd(locCurrent) || trajectoryLines.length > 0 || nearPlanLines.length > 0 || longPlanLines.length > 0;

    if (hasAnySchedContent) {
        html += `<div class="daily-sec-title">📍 行程快照</div><div class="daily-sched-list">`;

        // 当前位置 + 当前状态（合并一行）
        if (!isMd(locCurrent)) {
            const statusSuffix = !isMd(locStatus) ? `<span style="font-size:0.72rem;color:rgba(160,140,255,0.45);margin-left:6px;">${locStatus}</span>` : '';
            html += `<div class="daily-sched-row dsr-current">
                <span class="daily-sched-icon">📌</span>
                <span class="daily-sched-key">当前</span>
                <span class="daily-sched-val">${locCurrent}${statusSuffix}</span>
            </div>`;
        }

        // 今日轨迹
        if (trajectoryLines.length > 0) {
            html += `<div style="font-size:0.66rem;font-weight:900;color:rgba(160,140,255,0.42);font-family:monospace;letter-spacing:0.5px;padding:4px 0 2px 2px;">TODAY TRACK</div>`;
            trajectoryLines.forEach(line => {
                // 解析 HH:MM → 地点 | 时长 | 备注
                const arrowIdx = line.indexOf('→');
                const timeStr  = arrowIdx > -1 ? line.slice(0, arrowIdx).trim() : '';
                const rest     = arrowIdx > -1 ? line.slice(arrowIdx + 1).trim() : line;
                const parts    = rest.split('|').map(p => p.trim());
                const place    = parts[0] || '';
                const duration = parts[1] || '';
                const note     = parts[2] || '';
                html += `<div class="daily-sched-row dsr-visited">
                    <span class="daily-sched-icon" style="font-size:0.72em;color:rgba(160,140,255,0.5);font-family:monospace;min-width:36px;">${timeStr}</span>
                    <span class="daily-sched-key">→</span>
                    <span class="daily-sched-val">${place}${duration ? `<span style="font-size:0.72rem;color:rgba(160,140,255,0.38);margin-left:5px;">${duration}</span>` : ''}${note ? `<span style="font-size:0.7rem;color:rgba(160,140,255,0.35);margin-left:5px;font-style:italic;">${note}</span>` : ''}</span>
                </div>`;
            });
        }

        // 近期计划
        if (nearPlanLines.length > 0) {
            html += `<div style="font-size:0.66rem;font-weight:900;color:rgba(160,140,255,0.42);font-family:monospace;letter-spacing:0.5px;padding:6px 0 2px 2px;">NEAR PLAN</div>`;
            nearPlanLines.forEach(line => {
                const isConfirm = line.startsWith('[确定]');
                const icon = isConfirm ? '🎯' : '❓';
                const textPart = line.replace(/^\[(确定|模糊)$$\s*/, '');
                html += `<div class="daily-sched-row" style="${isConfirm ? 'border-color:rgba(100,200,255,0.2);' : 'border-color:rgba(160,140,255,0.12);opacity:0.8;'}">
                    <span class="daily-sched-icon">${icon}</span>
                    <span class="daily-sched-key">${isConfirm ? '确定' : '模糊'}</span>
                    <span class="daily-sched-val">${textPart}</span>
                </div>`;
            });
        }

        // 长线计划
        if (longPlanLines.length > 0) {
            html += `<div style="font-size:0.66rem;font-weight:900;color:rgba(160,140,255,0.42);font-family:monospace;letter-spacing:0.5px;padding:6px 0 2px 2px;">LONG PLAN</div>`;
            longPlanLines.forEach(line => {
                // 解析 [日期] 事项 | 态度
                const bracketEnd = line.indexOf(']');
                const dateStr = bracketEnd > -1 ? line.slice(1, bracketEnd).trim() : '';
                const restPlan= bracketEnd > -1 ? line.slice(bracketEnd + 1).trim() : line;
                const planParts = restPlan.split('|');
                const planItem  = planParts[0].trim();
                const planAttitude = planParts[1] ? planParts[1].trim() : '';
                // 态度颜色
                const attColor = /期待/.test(planAttitude) ? '#ffb3c6' : /抗拒/.test(planAttitude) ? '#a2e1db' : /搁置/.test(planAttitude) ? 'rgba(160,140,255,0.35)' : 'rgba(160,140,255,0.45)';
                html += `<div class="daily-sched-row" style="border-color:rgba(160,140,255,0.18);">
                    <span class="daily-sched-icon">📅</span>
                    <span class="daily-sched-key" style="font-family:monospace;font-size:0.65rem;color:rgba(160,140,255,0.45);">${dateStr}</span>
                    <span class="daily-sched-val">${planItem}${planAttitude ? `<span style="font-size:0.7rem;color:${attColor};margin-left:6px;">${planAttitude}</span>` : ''}</span>
                </div>`;
            });
        }

        // 今日体感里程
        if (!isMd(locMileage)) {
            html += `<div class="daily-sched-row" style="border-color:rgba(160,140,255,0.1);margin-top:4px;background:rgba(160,140,255,0.04);">
                <span class="daily-sched-icon">🧭</span>
                <span class="daily-sched-key">体感</span>
                <span class="daily-sched-val" style="color:rgba(200,190,240,0.7);font-style:italic;">${locMileage}</span>
            </div>`;
        }

        html += `</div>`;
    }
    // ── 今日体质认定 ──
    const physLines = [];
    let inPhysBlock = false;
    _rawFull.split('\n').forEach(ln => {
        const t = ln.trim();
        if (t === '[今日体质认定]') { inPhysBlock = true; return; }
        if (t.startsWith('[') && t.endsWith(']') && t !== '[今日体质认定]') { inPhysBlock = false; return; }
        if (inPhysBlock && t.length > 2 && t.startsWith('·')) physLines.push(t);
    });
    const physNameRaw  = data.base['当前体质'] || _extractField('当前体质') || '';
    const physNote     = data.base['系统备注'] || _extractField('系统备注') || '';
    const physWarn     = data.base['升级预警'] || _extractField('升级预警') || '';

    if (!isMd(physNameRaw)) {
        const physParts = physNameRaw.split('|');
        const physName  = physParts[0].trim();
        const physDays  = physParts[1] ? physParts[1].trim() : '';
        const PHYS_ICON_MAP = [
            { re: /(甜|糖|饼|蛋糕|冰淇淋|草莓|巧克力)/, icon: '🍓' }, { re: /(咖啡|茶|饮品|饮料|奶茶)/, icon: '☕' },
            { re: /(发呆|安静|空白|静|佛系|平静)/, icon: '🌊' }, { re: /(好事|幸运|天选|欧气|锦鲤)/, icon: '🍀' },
            { re: /(倒霉|非酋|惨|黑洞|悲剧)/, icon: '💀' }, { re: /(睡|懒|困|瞌睡|躺平)/, icon: '💤' },
            { re: /(恋爱|心动|粉红|爱意|暗恋|告白)/, icon: '🌸' }, { re: /(猫|喵|猫咪|毛茸茸)/, icon: '🐱' },
            { re: /(鬼|灵异|诡异|神秘|暗黑)/, icon: '👻' }, { re: /(战斗|热血|爆发|燃烧|冲)/, icon: '🔥' },
            { re: /(魔法|奇幻|异能|穿越)/, icon: '🔮' }, { re: /(雨|湿|泪|哭|忧郁)/, icon: '🌧️' }
        ];
        let physEmoji = '✨';
        for (const entry of PHYS_ICON_MAP) { if (entry.re.test(physName)) { physEmoji = entry.icon; break; } }

        html += `<div class="daily-sec-title">✨ 今日体质认定</div>
        <div class="daily-physique-card">
            <div class="daily-physique-big">${physEmoji}</div>
            <div class="daily-physique-name">${physName}</div>
            ${physDays ? `<div class="daily-physique-days">${physDays}</div>` : ''}
            ${physLines.length > 0 ? `<div class="daily-physique-note">${physLines.map(b => b.replace(/^·\s*/, '').trim()).join('　')}</div>` : ''}
            ${!isMd(physNote) ? `<div class="daily-physique-sys">系统备注：${physNote}</div>` : ''}
            ${!isMd(physWarn) ? `<div class="daily-physique-warn">⬆ 预警：${physWarn}</div>` : ''}
        </div>`;
    }

    const _dailyBtn2 = document.querySelector('.tab-btn[data-target="tab-daily"]');
    if (!html.trim()) {
        dailyEl.innerHTML = '';
        if (_dailyBtn2) _dailyBtn2.style.display = 'none';
    } else {
        dailyEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px;">${html}</div>`;
        if (_dailyBtn2) _dailyBtn2.style.display = '';
    }

})(data);
        let rHtml = '';
        Object.values(data.rules).forEach(rawRule => {
            let rText = rawRule.replace(/^守则\d+[:：]\s*/, '');
            let cClass = 'rule-card';
            if (rText.includes('[违规]')) { cClass += ' violated'; rText = rText.replace('[违规]', ''); }
            else if (rText.includes('[处刑]')) { cClass += ' punish'; rText = rText.replace('[处刑]', ''); }
            // ❤ 爱心发光，（新）NEW徽章
            rText = rText
                .replace(/❤/g, '<span class="heart-tag">❤</span>')
                .replace(/（新）/g, '<span class="new-tag">NEW!</span>');
            rHtml += `<div class="${cClass}"><div class="rule-text">${rText}</div></div>`;
        });
        setHtml('tab-rule', (rHtml || '<div class="empty-state">尚未录入任何不可违逆之准则...（法外之地）</div>'));
        let estrousStr = data.deprave['发情值'] || '0'; let estrousNum = parseInt(estrousStr.match(/\d+/) ? estrousStr.match(/\d+/)[0] : 0);
        let climaxStr = data.fluid['高潮临近度'] || '0'; let climaxNum = parseInt(climaxStr.match(/\d+/) ? climaxStr.match(/\d+/)[0] : 0);
        let yinIndexStr = data.fluid['淫水失控指数'] || '0'; let yinNum = parseInt(yinIndexStr.match(/\d+/) ? yinIndexStr.match(/\d+/)[0] : 0);
        let baiStr = data.fluid['今日射入摄取'] || data.fluid['今日精液摄入量'] || '0'; let rawBaiNum = parseInt(baiStr.match(/\d+/) ? baiStr.match(/\d+/)[0] : 0);

        let waterPool = document.getElementById('waterPool');
        // ── 日常场景积水池联动 ──
        const _wpAmb = (window._ktAmbientMode || '').toLowerCase();
        const _isDailyWater = /rain|ocean|shower|雨|海|沐浴|水/.test(_wpAmb);
        if(rawBaiNum >= 150) {
            waterPool.style.setProperty('--wave-color', 'rgba(255, 250, 240, 0.45)'); waterPool.style.filter = "drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))";
            let scaledBaiHeight = Math.max(25, Math.min((rawBaiNum / 1000) * 100, 100));
waterPool.style.setProperty('--pool-height', `${scaledBaiHeight}%`);waterPool.classList.remove('wave-paused');
        } else if (yinNum > 5) {
            waterPool.style.setProperty('--wave-color', 'rgba(0, 245, 255, 0.25)'); waterPool.style.filter = "drop-shadow(0 0 10px rgba(0, 245, 255, 0.5))";
            waterPool.style.setProperty('--pool-height', `${Math.min(yinNum, 100)}%`);
            waterPool.style.visibility = 'visible';
            waterPool.classList.remove('wave-paused');
        } else if (_isDailyWater) {
            // 雨天/海洋/沐浴场景：淡蓝清透浅水池
            waterPool.style.setProperty('--wave-color', 'rgba(100, 210, 255, 0.18)');
            waterPool.style.filter = "drop-shadow(0 0 6px rgba(100,210,255,0.3))";
            waterPool.style.setProperty('--pool-height', '22%');
            waterPool.style.visibility = 'visible';
            waterPool.classList.remove('wave-paused');
        } else {
            waterPool.style.setProperty('--pool-height', '0%');
            waterPool.classList.add('wave-paused');
            waterPool.style.visibility = 'hidden';
            waterPool.style.willChange = 'auto';
        }

        if(data.mind['理智值']) {
            let rNum = parseInt(data.mind['理智值'].match(/\d+/)[0] || 100); let themes = getThemeVars(rNum);
            // ── 仅在非日常氛围模式下，让理智值控制边框颜色 ──
            // 日常氛围模式下由氛围引擎接管，理智引擎不覆盖
            const _ambActive = !!(window._ktAmbientMode && window._ktAmbientMode.trim());
            const _isSexMode2 = estrousNum > 15 || climaxNum > 0 ||
                                rNum < 80 ||
                                !!(data.escape && data.escape['逃跑状态'] === '进行中') ||
                                parseInt((data.deprave['雌堕值'] || '0').match(/\d+/)?.[0] || 0) > 30;
            if (!_ambActive || _isSexMode2) {
                document.documentElement.style.setProperty('--theme-border', themes.border);
                document.documentElement.style.setProperty('--theme-shadow', themes.shadow
                document.documentElement.style.setProperty('--theme-shadow', themes.shadow);
                document.documentElement.style.setProperty('--theme-text', themes.text);
            }
            // ── 状态文字日常场景联动 ──
            const _sbAmb  = (window._ktAmbientMode || '').toLowerCase();
            const _sbMood = (data.base['今日心情基调'] || '').toLowerCase();
            const _sbEsc  = !!(data.escape && data.escape['逃跑状态'] === '进行中');
            let _statusText = `理智 ${rNum}%`;
            if (_sbEsc) {
                _statusText = `⚠ 逃亡中`;
            } else if (/romance|心动|恋爱|悸动/.test(_sbAmb) || /心动|脸红|喜欢/.test(_sbMood)) {
                _statusText = `♡ ${rNum}%`;
            } else if (/rain|shower|ocean|雨|海|沐浴/.test(_sbAmb)) {
                _statusText = `💧 ${rNum}%`;
            } else if (/confetti|sakura|开心|快乐/.test(_sbAmb) || /开心|高兴|快乐/.test(_sbMood)) {
                _statusText = `✦ ${rNum}%`;
            } else if (/danger|紧张|焦虑/.test(_sbAmb) || /紧张|焦虑|害怕/.test(_sbMood)) {
                _statusText = `！${rNum}%`;
            } else if (/cozy|library|magic|moonlit/.test(_sbAmb)) {
                _statusText = `✧ ${rNum}%`;
            }
            document.getElementById('statusBrief').innerHTML = _statusText;

            let bDot = document.getElementById('breathDot'); 
            let hudTitle = document.getElementById('hudTitle'); 
            let ecgMonitor = document.getElementById('ecgMonitor');

            if (rNum <= 10) {
                bDot.classList.add('breath-fast'); hudTitle.classList.add('glitch-title');
                hudTitle.setAttribute('data-text', '🍓Meow_Live ERROR'); hudTitle.innerText = '🍓Meow_Live ERROR';
                bDot.style.background = ''; bDot.style.boxShadow = '';
            } else if (rNum <= 50) {
                bDot.classList.add('breath-fast'); hudTitle.classList.remove('glitch-title');
                hudTitle.setAttribute('data-text', '🍓Meow_Live💖'); hudTitle.innerText = '🍓Meow_Live💖';
                bDot.style.background = ''; bDot.style.boxShadow = '';
            } else {
                bDot.classList.remove('breath-fast'); hudTitle.classList.remove('glitch-title');
                hudTitle.setAttribute('data-text', '🍓Meow_Live💖'); hudTitle.innerText = '🍓Meow_Live💖';
                // ── 日常氛围下呼吸点跟随氛围颜色 ──
                const _bdAmb  = (window._ktAmbientMode || '').toLowerCase();
                const _bdEsc  = !!(data.escape && data.escape['逃跑状态'] === '进行中');
                const _bdSex  = estrousNum > 15 || climaxNum > 0;
                if (!_bdSex && !_bdEsc && _bdAmb) {
                    // 氛围颜色已由氛围引擎写入 --amb-color，直接读取
                    const _ambColor = document.getElementById('ktApp').style.getPropertyValue('--amb-color');
                    if (_ambColor) {
                        bDot.style.background  = _ambColor;
                        bDot.style.boxShadow   = `0 0 10px ${_ambColor}, 0 0 5px #fff`;
                        bDot.style.transition  = 'background 1.2s, box-shadow 1.2s';
                    }
                } else {
                    bDot.style.background = '';
                    bDot.style.boxShadow  = '';
                }
            }
            // 🐱 软萌发箍三合一联动
            (function updateCatCompound(rNum, estrousNum) {
                const catGroup = document.getElementById('catGroup');
                const dPath    = document.getElementById('ahogeShape');
                const kao      = document.getElementById('kaoText');
                if (!catGroup || !dPath || !kao) return;

                const PATH_IDLE = "M10,16 C10,6 2,4 6,1";
                const PATH_SAD  = "M10,16 C12,12 18,12 18,15";
                const PATH_LOVE = "M10,16 C4,8 7,-1 10,4 C13,-1 16,8 10,16";

                catGroup.className = 'cat-compound';

                if (rNum <= 10) {
                    bDot.classList.add('breath-fast');
                    catGroup.classList.add('state-sad');
                    dPath.setAttribute('d', PATH_SAD);
                    kao.textContent = 'x_x';
                    kao.style.color = '';
                } else if (rNum <= 30) {
                    bDot.classList.add('breath-fast');
                    catGroup.classList.add('state-sad');
                    dPath.setAttribute('d', PATH_SAD);
                    kao.textContent = 'Q^Q';
                    kao.style.color = '';
                } else if (estrousNum >= 75 || climaxNum >= 80) {
                    catGroup.classList.add('state-horny');
                    dPath.setAttribute('d', PATH_LOVE);
                    kao.textContent = '>///<';
                    kao.style.color = '';
                } else if (estrousNum >= 50 || climaxNum >= 30) {
                    catGroup.classList.add('state-warm');
                    dPath.setAttribute('d', PATH_IDLE);
                    kao.textContent = '=///=';
                    kao.style.color = '#ff7eb3';
                } else if (estrousNum >= 20) {
                    catGroup.classList.add('state-nervous');
                    dPath.setAttribute('d', PATH_IDLE);
                    kao.textContent = rNum < 60 ? 'O~O' : '•ω•̥̀ ';
                    kao.style.color = '#ffb3c6';
                } else {
                    dPath.setAttribute('d', PATH_IDLE);
                    // ── 日常场景猫猫联动 ──
                    const _moodText = (data.base['今日心情基调'] || '').toLowerCase();
                    const _ambText2 = (window._ktAmbientMode || '').toLowerCase();
                    const _escaping2 = !!(data.escape && data.escape['逃跑状态'] === '进行中');
                    if (_escaping2) {
                        // 逃亡：警觉耳朵竖起
                        catGroup.classList.add('state-nervous');
                        dPath.setAttribute('d', PATH_IDLE);
                        kao.textContent = 'O﹏O';
                        kao.style.color = '#a2e1db';
                    } else if (/romance|心动|恋爱|悸动|粉红/.test(_ambText2) || /心跳|脸红|心动|喜欢/.test(_moodText)) {
                        // 心动甜蜜
                        catGroup.classList.add('state-warm');
                        dPath.setAttribute('d', PATH_LOVE);
                        kao.textContent = 'UwU';
                        kao.style.color = '#ffb3c6';
                    } else if (/开心|快乐|高兴|棒|完美/.test(_moodText) || /confetti|sakura|romance/.test(_ambText2)) {
                        // 开心快乐
                        dPath.setAttribute('d', PATH_IDLE);
                        kao.textContent = '≧▽≦';
                        kao.style.color = '#ffd700';
                    } else if (/焦虑|紧张|不安|害怕/.test(_moodText) || /danger/.test(_ambText2)) {
                        // 紧张焦虑
                        catGroup.classList.add('state-nervous');
                        dPath.setAttribute('d', PATH_IDLE);
                        kao.textContent = '>﹏<';
                        kao.style.color = '#a2e1db';
                    } else if (/难过|伤心|哭|委屈/.test(_moodText)) {
                        // 难过
                        catGroup.classList.add('state-sad');
                        dPath.setAttribute('d', PATH_SAD);
                        kao.textContent = 'T_T';
                        kao.style.color = '';
                    } else if (/累|疲|透支|撑不住|困/.test(_moodText) || /cozy/.test(_ambText2)) {
                        // 疲惫/慵懒
                        dPath.setAttribute('d', PATH_IDLE);
                        kao.textContent = '-ω-';
                        kao.style.color = 'rgba(255,255,255,0.5)';
                    } else if (rNum > 80) {
                        kao.textContent = 'OwO';
                        kao.style.color = '';
                    } else if (rNum > 60) {
                        kao.textContent = 'OvO';
                        kao.style.color = '';
                    } else {
                        catGroup.classList.add('state-nervous');
                        dPath.setAttribute('d', PATH_SAD);
                        kao.textContent = 'O_o';
                        kao.style.color = '';
                    }
                }
            })(rNum, estrousNum);

            // ECG + Voice Wave 初始化（你已经有了，略）

            // ……中间 ECG、VoiceWave、ambientEngine、creatureEngine、escapeMode、gazeTab、depraveCorruption、
            // DanmakuLike、SoulBubblePoke、NeuroReflex、VisibilityGuard 都已经在你前面那段里贴全了……

        });   // ← setTimeout 内的数据解析大闭包 end

        /* ── 页面可见性：后台时暂停所有高频 interval，省电防卡 ── */ 
        (function initVisibilityGuard() {
            const _timerKeys = ['_viewerFlickerTimer', '_ktNsChatTimer', '_ambientTimer', '_escParticleTimer', '_creatureBtnPosTimer', '_mechReadoutTimer'];
            document.addEventListener('visibilitychange', () => {
                const isHidden = document.visibilityState === 'hidden';
                if (isHidden) {
                    _timerKeys.forEach(k => { if (window[k]) { clearInterval(window[k]); window[k] = null; } });
                    if (window._ecgAnimId) { cancelAnimationFrame(window._ecgAnimId); window._ecgAnimId = null; }
                    // 暂停所有CSS动画，减少后台GPU消耗
                    document.querySelectorAll('*').forEach(el => {
                        if (el.style.animationName || getComputedStyle(el).animationName !== 'none') {
                            el.dataset._pausedAnim = '1';
                            el.style.animationPlayState = 'paused';
                        }
                    });
                } else {
                    // 回到前台：恢复CSS动画，ECG canvas由下次渲染重建
                    document.querySelectorAll('[data-_paused-anim]').forEach(el => {
                        el.style.animationPlayState = 'running';
                        delete el.dataset._pausedAnim;
                    });
                }
            });
        })();

        /* ── 📱 手机防卡顿综合补丁 ── */
        (function initMobilePerformanceGuard() {

            // 1. 90秒无操作自动降帧
            let _idleTimer = null;
            let _isIdle = false;

            function enterIdle() {
                if (_isIdle) return;
                _isIdle = true;
                if (window._ambientTimer) { clearInterval(window._ambientTimer); window._ambientTimer = null; }
                if (window._viewerFlickerTimer) { clearInterval(window._viewerFlickerTimer); window._viewerFlickerTimer = null; }
                document.querySelectorAll('[style*="will-change"]').forEach(el => {
                    if (el.id !== 'ecgCanvas') el.style.willChange = 'auto';
                });
            }

            function exitIdle() {
                if (!_isIdle) return;
                _isIdle = false;
                const waterPool = document.getElementById('waterPool');
                if (waterPool && waterPool.style.visibility !== 'hidden') {
                    waterPool.style.willChange = 'height';
                }
            }

            function resetIdleTimer() {
                exitIdle();
                clearTimeout(_idleTimer);
                _idleTimer = setTimeout(enterIdle, 90000);
            }

            ['touchstart','touchmove','mousedown','scroll'].forEach(evt => {
                document.addEventListener(evt, resetIdleTimer, { passive: true });
            });
            resetIdleTimer();

            // 2. 面板折叠时暂停面板内所有动画
            const ktApp = document.getElementById('ktApp');
            if (ktApp) {
                const panelObs = new MutationObserver(() => {
                    const isOpen = ktApp.classList.contains('open');
                    const panel = document.getElementById('ktPanel');
                    if (!panel) return;
                    panel.querySelectorAll('.tab-content *').forEach(el => {
                        el.style.animationPlayState = isOpen ? 'running' : 'paused';
                    });
                });
                panelObs.observe(ktApp, { attributes: true, attributeFilter: ['class'] });
            }

        })();  // ← initMobilePerformanceGuard 结束
    }  // ← initMeowHud() 结束
    // ② 创建 HUD DOM（你之前已经有这部分，只是没调用 initMeowHud）
    function createHudDom() {
        // 防止重复创建
        if (document.getElementById('meow-live-float-btn')) return;

        // 小球
        const floatBtn = document.createElement('div');
        floatBtn.id = 'meow-live-float-btn';
        floatBtn.className = 'meow-float-btn';
        floatBtn.title = '打开/关闭 猫猫面板';

        const icon = document.createElement('div');
        icon.className = 'meow-float-icon';
        icon.textContent = '🐱';
        floatBtn.appendChild(icon);

        // 面板容器
        const container = document.createElement('div');
        container.id = 'meow-live-container';
        container.className = 'meow-hud-hidden';

        // 这里的 innerHTML 已经是你从正则里抠出来的那坨 HUD HTML（我假设你已经塞好了）
        // 如果你还有测试文字，记得改成完整 HUD 结构
        container.innerHTML = `
<div class="raw-data" id="rawData"></div>
<div id="copyToast">指令已复制！</div>

<div class="kt-safe-guard" id="ktSafeGuard">
<div class="kitten-bar-wrapper" id="ktApp">
    <div id="dirtLayer"></div>
    <div id="creatureLayer"></div>

    <div class="water-pool" id="waterPool">
        <div class="wave"></div>
        <div class="wave"></div>
        <div class="wave"></div>
    </div>


    <div id="valEditorModal" onclick="closeEditor(event)">
        <div class="editor-card" onclick="event.stopPropagation()">
            <div class="ed-header"><span id="edTargetKey">属性</span><span>干涉</span></div>
            <div class="ed-key-name" id="edSubTitle">当前覆写值</div>
            <div class="ed-input-row"><input type="text" id="edInputVal" class="ed-input" value="0"></div>
            <div class="ed-range-wrap" id="edNumControls">
                <input type="range" id="edRange" class="ed-range" min="0" max="100" value="0" oninput="document.getElementById('edInputVal').value = this.value">
                <div class="ed-btn-row">
                    <button class="ed-btn" onclick="stepEditorVal(-5)">-5</button><button class="ed-btn" onclick="stepEditorVal(-1)">-1</button>
                    <button class="ed-btn" onclick="stepEditorVal(1)">+1</button><button class="ed-btn" onclick="stepEditorVal(5)">+5</button>
                </div>
            </div>
            <div class="ed-action-row">
                <button class="ed-action-btn ed-cancel" onclick="closeEditor()">放弃</button>
                <button class="ed-action-btn ed-confirm" onclick="confirmEdit()">覆写注入</button>
            </div>
        </div>
    </div>


    <div class="admin-console-wrapper" id="adminConsole" onclick="event.stopPropagation()">
        <div class="admin-title">⚠️ GOD_SYSTEM ⚠️</div>

        <!-- 扁平紧凑版一键打包 (降低亮度) -->
        <div class="cmd-btn" onclick="packAndCopyMods()" style="background: linear-gradient(90deg, rgba(200, 180, 100, 0.1), rgba(200, 80, 120, 0.1)); border: 1px solid rgba(220, 190, 80, 0.4); min-height: auto; padding: 8px 10px; margin-bottom: 8px; flex-direction: row; justify-content: space-between; align-items: center;">
            <span class="cmd-btn-title" style="color:rgba(255,255,255,0.85); text-shadow:0 0 3px rgba(220,190,80,0.5); font-size:0.85em;">📦 一键打包提取后台修改项</span>
            <span class="cmd-icon">📋</span>
        </div>

        <!-- 01 清洁消除 -->
        <details class="admin-fold" style="--fold-color: #5ab1b5;" open>
            <summary class="admin-fold-title"><span>🧽 清洁消除</span><span class="fold-desc">体液清除 / 面具重装</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：深度清洗强制结算]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🚿 深度清洗</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">清内部/体表，2h后重渗</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：表层清洁结算]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🧼 表层清洁</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">仅清皮肤战损，内部不变</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：社会面具重装]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🎭 面具重装</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">消除外部暴露，战损保留</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：谣言链路切断]')"><div class="cmd-btn-header"><span class="cmd-btn-title">✂️ 谣言切断</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">曝光进度-30%，抹除扩散线</div></div>
            </div>
        </details>

        <!-- 02 数值重置 -->
        <details class="admin-fold" style="--fold-color: #92b8d1;">
            <summary class="admin-fold-title"><span>🔄 数值重置</span><span class="fold-desc">恢复 / 清零 / 归档</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：一键清白重置]')"><div class="cmd-btn-header"><span class="cmd-btn-title">✨ 一键清白</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">清恶堕/体液，理智回归</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制注射镇定剂]')"><div class="cmd-btn-header"><span class="cmd-btn-title">💉 镇定注射</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">理智强抬，削减违规状态</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：服从记忆清洗]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🧠 服从清洗</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">服从归零，找回拒绝本能</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：刷新重载面板]')\" style=\"border-style: dashed;\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🔄 强刷面板</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清理UI残留排版</div></div>
            </div>
        </details>

        <!-- 03 强制激发 -->
        <details class="admin-fold" style="--fold-color: #d8667b;">
            <summary class="admin-fold-title"><span>🔥 强制激发</span><span class="fold-desc">强制发情 / 过载</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制发情过载]')"><div class="cmd-btn-header"><span class="cmd-btn-title">💥 发情过载</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">强拉100入疯犬状态</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：无接触连续高潮]')"><div class="cmd-btn-header"><span class="cmd-btn-title">⚡ 过载电击</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">神经皮层剥夺，连续绝顶</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：最高处刑双穴注入]')"><div class="cmd-btn-header"><span class="cmd-btn-title">💣 双穴毁灭</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">满溢内射，极限泥泞</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：跳过前戏子宫粗暴内射]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🎯 粗暴通关</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">直刺子宫瞬间灌精</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：发情宣言强制播报]')"><div class="cmd-btn-header"><span class="cmd-btn-title">📢 发情宣言</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">防线击穿，被迫求欢</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：自我展示模式启动]')"><div class="cmd-btn-header"><span class="cmd-btn-title">👙 自我展示</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">主动撩拨衣物招惹视线</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：猎食者反转]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🐺 猎食反转</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">主动锁定NPC发动袭击</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：镜前自恋发骚]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🪞 镜前发骚</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">沉迷自身不堪模样</div></div>
            </div>
        </details>

        <!-- 04 身体改造 -->
        <details class="admin-fold" style="--fold-color: #d18db4;">
            <summary class="admin-fold-title"><span>🧬 身体改造</span><span class="fold-desc">特异改造施加</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制催乳开关启动]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🍼 催乳开关</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">强制发胀产出甘甜初乳</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制极速排卵]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🥚 极速排卵</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">强制高热，危期锁90%+</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：肉体奇迹愈合]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🩹 奇迹愈合</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">止血清撕裂，留形状记忆</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：佩戴隐形贞操锁]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🔒 贞操锁封印</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">封外部快感，限深插高潮</div></div>
                <div class="cmd-btn" style="grid-column: span 2;" onclick="copyAction('[系统指令：施加外出魔法伪装]')"><div class="cmd-btn-header"><span class="cmd-btn-title">👗 外出魔法伪装</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">外表面0暴露，内部保留异物状态</div></div>
            </div>
        </details>

        <!-- 05 道具控制 -->
        <details class="admin-fold" style="--fold-color: #a87295;">
            <summary class="admin-fold-title"><span>🔌 道具控制</span><span class="fold-desc">习惯化异常干预</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：道具升级强制结算]')"><div class="cmd-btn-header"><span class="cmd-btn-title">⬆️ 强升Lv+1</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">立刻促发身体空虚渴求</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：道具冷却强制降档]')"><div class="cmd-btn-header"><span class="cmd-btn-title">⬇️ 降档戒断</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">退回上一档，极度不够</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：双穴同步塞满]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🍡 双穴同塞</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">前后双加，双向胀满</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：习惯化进度回滚]')"><div class="cmd-btn-header"><span class="cmd-btn-title">⏪ 习惯回滚</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">消退50%适应度重新体验</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：遥控道具失控]')"><div class="cmd-btn-header"><span class="cmd-btn-title">📶 最高档锁死</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">步态失稳发情飙升</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：盲盒道具开箱]')"><div class="cmd-btn-header"><span class="cmd-btn-title">📦 盲盒塞入</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">未知恐惧，随机起效</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：体外道具公开佩戴]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🔌 体外暴露</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">导线/尾巴公开暴露</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：道具遗落公开事件]')"><div class="cmd-btn-header"><span class="cmd-btn-title">😰 意外滑落</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">不得不当众处理异物</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制携带道具社交]')" style="grid-column: span 2;"><div class="cmd-btn-header"><span class="cmd-btn-title">🤝 道具社交挑战</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">勉强维持理智完成对话</div></div>
            </div>
        </details>

        <!-- 06 认知劫持 -->
        <details class="admin-fold" style="--fold-color: #8b74b8;">
            <summary class="admin-fold-title"><span>🧠 认知劫持</span><span class="fold-desc">语言精神格式化</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：思维朗读强制播报]')"><div class="cmd-btn-header"><span class="cmd-btn-title">💭 思维外放</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">羞耻内心念头全漏出</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：语言皮层劫持]')"><div class="cmd-btn-header"><span class="cmd-btn-title">👅 淫词转译</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">想呼救却说出求欢</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：否定词消除诅咒]')"><div class="cmd-btn-header"><span class="cmd-btn-title">❌ 吞咽"不"字</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">只能被动说要</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：音量反转诅咒]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🔊 音量反转</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">越想忍耐反而越大声</div></div>
                <div class="cmd-btn" style="grid-column: span 2;" onclick="copyAction('[系统指令：表层记忆格式化]')"><div class="cmd-btn-header"><span class="cmd-btn-title">📁 记忆断片错乱</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">清空记忆面对惨破的身体</div></div>
            </div>
        </details>

        <!-- 07 时间轴控制 -->
        <details class="admin-fold" style="--fold-color: #c98565;">
            <summary class="admin-fold-title"><span>⏳ 时间结界</span><span class="fold-desc">冻结与快进结算</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：局部时间停止]')"><div class="cmd-btn-header"><span class="cmd-btn-title">⏸️ 局部时停</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">清醒看自己被玩弄</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制休眠结算]')"><div class="cmd-btn-header"><span class="cmd-btn-title">💤 休眠清算</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">直接跳过走衰减反噬</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：时间快进至深夜]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🌙 跃入深夜</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">无缝连接午夜欺凌</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：时间快进至翌日]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🌅 跨日发酵</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">未洗浓精导致发热异常</div></div>
            </div>
        </details>

        <!-- 08 社会暴露 -->
        <details class="admin-fold" style="--fold-color: #c49539;">
            <summary class="admin-fold-title"><span>📸 社会暴露</span><span class="fold-desc">公开处刑警报</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：熟人撞破现场]')"><div class="cmd-btn-header"><span class="cmd-btn-title">😱 熟人撞破</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">生成关系人立刻目击</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：身份彻底曝光倒计时]')"><div class="cmd-btn-header"><span class="cmd-btn-title">⏰ 曝光红警</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">身份进度飙至80%</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：随机守则违规审判]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🎲 守则抽签</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">无理由立刻进入处刑</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：下达赦免洗礼]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🕊️ 赦免洗礼</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">清违纪印章暂保平安</div></div>
                <div class="cmd-btn" style="grid-column: span 2;" onclick="copyAction('[系统指令：判决公开处刑]')"><div class="cmd-btn-header"><span class="cmd-btn-title" style="color:#d8a649;">⚖️ 判决公开云播</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">强制开启内外双镜深网接入</div></div>
            </div>
        </details>

        <!-- 09 直播与脱出 -->
        <details class="admin-fold" style="--fold-color: #64a6c4;">
            <summary class="admin-fold-title"><span>📡 观测与逃猎</span><span class="fold-desc">全息共享追与逃</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" onclick="copyAction('[系统指令：强制脱出模式启动]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🚨 启动逃生</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">强制唤醒脱出雷达UI</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：有意图者驱散]')"><div class="cmd-btn-header"><span class="cmd-btn-title">💨 跟随驱散</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">清空视线脱离威胁</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：观众体感全息共享]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🧠 体感共享</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">内壁刺激同步给暗网观众</div></div>
                <div class="cmd-btn" onclick="copyAction('[系统指令：骰子裁决]')"><div class="cmd-btn-header"><span class="cmd-btn-title">🎲 骰子盲盒</span><span class="cmd-icon">📋</span></div><div class="cmd-desc">发起1~6厄运投掷</div></div>
                <div class="cmd-btn" onclick="triggerManualPollution(event)" style="grid-column: span 2;"><div class="cmd-btn-header"><span class="cmd-btn-title">💦 手动淫水糊屏(测试)</span><span class="cmd-icon">🧽</span></div><div class="cmd-desc">全屏物理流瀑特效</div></div>
            </div>
        </details>

        <!-- 10 存档管理 -->
        <details class="admin-fold" style="--fold-color: #555;">
            <summary class="admin-fold-title" style="color:#888;"><span>🗑️ 浏览器存档</span><span class="fold-desc">清空故事缓存</span></summary>
            <div class="admin-fold-content">
                <div class="cmd-btn" style="border-color: rgba(100,100,100,0.3); background: transparent; grid-column: span 2;"
                    onclick="(function(){
                        ['cat_accepted_tasks','cat_spent_buybacks','cat_bb_coins'].forEach(function(k){ localStorage.removeItem(k); });
                        window._bbCoins = 0;
                        var coinEl = document.getElementById('bbCoinVal');
                        if(coinEl) coinEl.textContent = '0';
                        document.getElementById('adminConsole').classList.remove('show');
                        showToast('📦 本地存档已清除，可开启新剧情 ✦');
                    })()">
                    <div class="cmd-btn-header"><span class="cmd-btn-title" style="color:#aaa;">🗑️ 初始化本地信息喵</span><span class="cmd-icon">🔄</span></div>
                    <div class="cmd-desc">用于故事本篇完结时点击，将重置悬赏/赎买等锁定库</div>
                </div>
            </div>
        </details>

</div> <!-- admin-console-wrapper 结束 -->

    <!-- 顶栏整体压低做扁，标题字号加大 -->
<div class="bar-header" onclick="toggleKtPanel(event)">
        <!-- ✦ 右上角常驻微星装饰 (新增) -->
        <div style="position:absolute;top:7px;right:46px;display:flex;gap:4px;pointer-events:none;z-index:5;">
            <span style="font-size:7px;color:#00f5ff;opacity:0;animation:corner-star-twinkle 3.2s ease-in-out 0s infinite;">✦</span>
            <span style="font-size:7px;color:#ffb3c6;opacity:0;animation:corner-star-twinkle 2.8s ease-in-out 0.7s infinite;">✧</span>
            <span style="font-size:7px;color:#a2e1db;opacity:0;animation:corner-star-twinkle 3.5s ease-in-out 1.4s infinite;">✦</span>
        </div>
        <div class="header-left">
            <div class="breath-dot" id="breathDot" onclick="toggleAdminConsole(event)" title="精准触控：点击开启辅控终端"></div>

            <!-- 🐱 软萌发箍 + 精致星轨三合一组件 -->
            <div style="position:relative; display:flex; align-items:center;">
              <!-- 标题左侧的呼吸星 -->
              <span class="title-magic-star" style="top: -2px; left: -10px; --tw-dur: 1.8s; --tw-del: 0s;">✦</span>

              <div class="cat-compound" id="catGroup">
                <!-- ☄️ 新增：耳朵上方的流星防线 -->
                <div class="shooting-star-layer">
                    <div class="flare-particle" style="left: 0%; top: 50%; --f-dur: 4.5s; --f-del: 0.2s;"></div>
                    <div class="flare-particle" style="left: 20%; top: 80%; --f-dur: 5.2s; --f-del: 2.1s;"></div>
                    <div class="flare-particle" style="left: -10%; top: 30%; --f-dur: 6s; --f-del: 3.5s;"></div>
                </div>

                <svg class="ahoge-svg" viewBox="0 0 20 16">
                  <g class="ahoge-g"><path id="ahogeShape" class="ahoge-path" d="M10,16 C10,6 2,4 6,1"></path></g>
                </svg>
                <div class="ears-row">
                  <div class="ear-soft l"></div>
                  <div class="ear-soft r"></div>
                </div>
                <div class="kao-face" id="kaoText">OwO</div>
              </div>
              <span class="header-title-text" id="hudTitle" data-text="🍓Meow_Live💖">🍓Meow_Live💖</span>

              <!-- 标题右侧的呼吸星 -->
              <span class="title-magic-star" style="bottom: 2px; right: -8px; --tw-dur: 2.2s; --tw-del: 0.5s;">✧</span>
            </div><!-- 发箍+标题包裹容器结束 -->
        </div>
        <div class="header-right" style="position:relative;">
            <span id="headerWhisper" style="
                position: absolute;
                right: 100%;
                top: 50%;
                transform: translateY(-50%);
                margin-right: 6px;
                font-size: 0.62em; font-weight: 900; font-style: italic;
                letter-spacing: 0.5px; pointer-events: none;
                white-space: nowrap;
                opacity: 0;
            "></span>
            <span class="header-status-text" id="statusBrief">Connecting...</span>
            <span class="header-arrow">▼</span>
        </div>
    </div>

    <div class="badge-wrapper" id="titleBadgeWrapper" style="display: none;">
        <div class="neon-pill-badge">
            <span class="badge-icon">✨</span>
            <span class="badge-text" id="titleBadgeText"></span>
        </div>
    </div>

    <div class="ecg-container ecg-normal" id="ecgMonitor">
        <div class="ecg-label">ECG</div>
        <div class="ecg-grid"></div>
        <div class="ecg-wave-box" id="ecgWaveBox">
            <canvas id="ecgCanvas"></canvas>
        </div>
    </div>
    <div class="voice-wave-container vw-p1" id="voiceWave">
        <div class="vw-label">VOICE</div>
        <div class="vw-wave-box">
            <div class="vw-line"></div>
            <div class="vw-overlay"></div>
        </div>
    </div>


    <div class="bar-panel" id="ktPanel">
        <div class="panel-glow"></div>
        <div class="panel-inner">
            <!-- 沉浸式单列横向滑动菜单 -->
            <div class="nav-tabs" id="navTabs">
                <div class="nav-tabs-slider" id="navTabsSlider"></div>
                <div class="tab-btn active" onclick="switchKtTab('tab-base', this, event)" data-target="tab-base">🔮 状态</div>
<div class="tab-btn" onclick="switchKtTab('tab-daily', this, event)" data-target="tab-daily">🌙 日常</div>
<div class="tab-btn" onclick="switchKtTab('tab-lover', this, event)" data-target="tab-lover" id="tabIconLover" style="display:none;">💗 恋人</div>
<div class="tab-btn" onclick="switchKtTab('tab-relation', this, event)" data-target="tab-relation" id="tabIconRelation" style="display:none;">💔 关系</div>
<div class="tab-btn" onclick="switchKtTab('tab-news', this, event)" data-target="tab-news" id="tabIconNews" style="display:none;">🌐 资讯</div>
<div class="tab-btn" onclick="switchKtTab('tab-sys', this, event)" data-target="tab-sys" id="tabIconSys" style="display:none;">💠 系统</div>
                <div class="tab-btn" onclick="switchKtTab('tab-body', this, event)" data-target="tab-body">🩺 肉体</div>
                <div class="tab-btn" onclick="switchKtTab('tab-depr', this, event)" data-target="tab-depr">😈 恶堕</div>
                <div class="tab-btn" onclick="switchKtTab('tab-fluid', this, event)" data-target="tab-fluid">💦 体液</div>
<div class="tab-btn" onclick="switchKtTab('tab-cycle', this, event)" data-target="tab-cycle" id="tabIconCycle" style="display:none;">🩸 经期</div>
                <div class="tab-btn" onclick="switchKtTab('tab-preg', this, event)" data-target="tab-preg">🍼 孕育</div>
<div class="tab-btn tab-btn-live" onclick="switchKtTab('tab-live', this, event)" data-target="tab-live" id="tabIconLive">☁️ 观测</div>
<div class="tab-btn" onclick="switchKtTab('tab-gaze', this, event)" data-target="tab-gaze" id="tabIconGaze" style="display:none;">🌏 世界</div>
<div class="tab-btn" onclick="switchKtTab('tab-rule', this, event)" data-target="tab-rule">📜 守则</div>
            </div>

            <div class="tab-content-container" id="swipeContainer">
                <div id="tab-base" class="tab-content active"></div>
<div id="tab-daily" class="tab-content"></div>
<div id="tab-lover" class="tab-content"></div>
<div id="tab-relation" class="tab-content"></div>
<div id="tab-news" class="tab-content"></div>
<div id="tab-sys" class="tab-content"></div>
                <div id="tab-body" class="tab-content"></div>
                <div id="tab-depr" class="tab-content"></div>
                <div id="tab-fluid" class="tab-content"></div>
<div id="tab-cycle" class="tab-content"></div>
                <div id="tab-preg" class="tab-content"></div>
<div id="tab-live" class="tab-content"></div>
<div id="tab-gaze" class="tab-content"></div>
<div id="tab-rule" class="tab-content"></div>
            </div>
        </div>
    </div>
</div>
</div><!-- kt-safe-guard 结束 -->        <!-- 这里是你之前已经粘好的 HUD HTML 整块 -->
        <!-- 如果现在这里是完整的 HUD，保持不动即可 -->
        `;

        document.body.appendChild(floatBtn);
        document.body.appendChild(container);

        // 点击：开关 + 首次初始化
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
