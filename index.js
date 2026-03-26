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


    // ……后面的 renderTabs / ECG / 声波 / 异种特效 / 脱出模式 等都已经在原始脚本里，
    // 你照着我这段模式，把整段 <script> 中的剩余内容也粘在 initMeowHud() 里面即可……

    // 注意：不要再嵌套第二个 function initMeowHud，
    // 也不要再加多余的大括号，保证最外层只包一层 function initMeowHud() { ... }。
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
            <div class=\"raw-data\" id=\"rawData\"></div>\n<div id=\"copyToast\">指令已复制！</div>\n\n<div class=\"kt-safe-guard\" id=\"ktSafeGuard\">\n<div class=\"kitten-bar-wrapper\" id=\"ktApp\">\n    <div id=\"dirtLayer\"></div>\n    <div id=\"creatureLayer\"></div>\n\n    <div class=\"water-pool\" id=\"waterPool\">\n        <div class=\"wave\"></div>\n        <div class=\"wave\"></div>\n        <div class=\"wave\"></div>\n    </div>\n\n\n    <div id=\"valEditorModal\" onclick=\"closeEditor(event)\">\n        <div class=\"editor-card\" onclick=\"event.stopPropagation()\">\n            <div class=\"ed-header\"><span id=\"edTargetKey\">属性</span><span>干涉</span></div>\n            <div class=\"ed-key-name\" id=\"edSubTitle\">当前覆写值</div>\n            <div class=\"ed-input-row\"><input type=\"text\" id=\"edInputVal\" class=\"ed-input\" value=\"0\"></div>\n            <div class=\"ed-range-wrap\" id=\"edNumControls\">\n                <input type=\"range\" id=\"edRange\" class=\"ed-range\" min=\"0\" max=\"100\" value=\"0\" oninput=\"document.getElementById('edInputVal').value = this.value\">\n                <div class=\"ed-btn-row\">\n                    <button class=\"ed-btn\" onclick=\"stepEditorVal(-5)\">-5</button><button class=\"ed-btn\" onclick=\"stepEditorVal(-1)\">-1</button>\n                    <button class=\"ed-btn\" onclick=\"stepEditorVal(1)\">+1</button><button class=\"ed-btn\" onclick=\"stepEditorVal(5)\">+5</button>\n                </div>\n            </div>\n            <div class=\"ed-action-row\">\n                <button class=\"ed-action-btn ed-cancel\" onclick=\"closeEditor()\">放弃</button>\n                <button class=\"ed-action-btn ed-confirm\" onclick=\"confirmEdit()\">覆写注入</button>\n            </div>\n        </div>\n    </div>\n\n\n    <div class=\"admin-console-wrapper\" id=\"adminConsole\" onclick=\"event.stopPropagation()\">\n        <div class=\"admin-title\">⚠️ GOD_SYSTEM ⚠️</div>\n\n        <!-- 扁平紧凑版一键打包 (降低亮度) -->\n        <div class=\"cmd-btn\" onclick=\"packAndCopyMods()\" style=\"background: linear-gradient(90deg, rgba(200, 180, 100, 0.1), rgba(200, 80, 120, 0.1)); border: 1px solid rgba(220, 190, 80, 0.4); min-height: auto; padding: 8px 10px; margin-bottom: 8px; flex-direction: row; justify-content: space-between; align-items: center;\">\n            <span class=\"cmd-btn-title\" style=\"color:rgba(255,255,255,0.85); text-shadow:0 0 3px rgba(220,190,80,0.5); font-size:0.85em;\">📦 一键打包提取后台修改项</span>\n            <span class=\"cmd-icon\">📋</span>\n        </div>\n\n        <!-- 01 清洁消除 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #5ab1b5;\" open>\n            <summary class=\"admin-fold-title\"><span>🧽 清洁消除</span><span class=\"fold-desc\">体液清除 / 面具重装</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：深度清洗强制结算]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🚿 深度清洗</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清内部/体表，2h后重渗</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：表层清洁结算]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🧼 表层清洁</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">仅清皮肤战损，内部不变</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：社会面具重装]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🎭 面具重装</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">消除外部暴露，战损保留</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：谣言链路切断]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">✂️ 谣言切断</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">曝光进度-30%，抹除扩散线</div></div>\n            </div>\n        </details>\n\n        <!-- 02 数值重置 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #92b8d1;\">\n            <summary class=\"admin-fold-title\"><span>🔄 数值重置</span><span class=\"fold-desc\">恢复 / 清零 / 归档</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：一键清白重置]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">✨ 一键清白</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清恶堕/体液，理智回归</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制注射镇定剂]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💉 镇定注射</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">理智强抬，削减违规状态</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：服从记忆清洗]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🧠 服从清洗</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">服从归零，找回拒绝本能</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：刷新重载面板]')\" style=\"border-style: dashed;\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🔄 强刷面板</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清理UI残留排版</div></div>\n            </div>\n        </details>\n\n        <!-- 03 强制激发 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #d8667b;\">\n            <summary class=\"admin-fold-title\"><span>🔥 强制激发</span><span class=\"fold-desc\">强制发情 / 过载</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制发情过载]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💥 发情过载</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">强拉100入疯犬状态</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：无接触连续高潮]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">⚡ 过载电击</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">神经皮层剥夺，连续绝顶</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：最高处刑双穴注入]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💣 双穴毁灭</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">满溢内射，极限泥泞</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：跳过前戏子宫粗暴内射]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🎯 粗暴通关</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">直刺子宫瞬间灌精</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：发情宣言强制播报]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">📢 发情宣言</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">防线击穿，被迫求欢</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：自我展示模式启动]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">👙 自我展示</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">主动撩拨衣物招惹视线</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：猎食者反转]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🐺 猎食反转</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">主动锁定NPC发动袭击</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：镜前自恋发骚]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🪞 镜前发骚</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">沉迷自身不堪模样</div></div>\n            </div>\n        </details>\n\n        <!-- 04 身体改造 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #d18db4;\">\n            <summary class=\"admin-fold-title\"><span>🧬 身体改造</span><span class=\"fold-desc\">特异改造施加</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制催乳开关启动]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🍼 催乳开关</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">强制发胀产出甘甜初乳</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制极速排卵]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🥚 极速排卵</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">强制高热，危期锁90%+</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：肉体奇迹愈合]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🩹 奇迹愈合</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">止血清撕裂，留形状记忆</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：佩戴隐形贞操锁]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🔒 贞操锁封印</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">封外部快感，限深插高潮</div></div>\n                <div class=\"cmd-btn\" style=\"grid-column: span 2;\" onclick=\"copyAction('[系统指令：施加外出魔法伪装]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">👗 外出魔法伪装</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">外表面0暴露，内部保留异物状态</div></div>\n            </div>\n        </details>\n\n        <!-- 05 道具控制 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #a87295;\">\n            <summary class=\"admin-fold-title\"><span>🔌 道具控制</span><span class=\"fold-desc\">习惯化异常干预</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：道具升级强制结算]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">⬆️ 强升Lv+1</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">立刻促发身体空虚渴求</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：道具冷却强制降档]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">⬇️ 降档戒断</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">退回上一档，极度不够</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：双穴同步塞满]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🍡 双穴同塞</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">前后双加，双向胀满</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：习惯化进度回滚]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">⏪ 习惯回滚</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">消退50%适应度重新体验</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：遥控道具失控]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">📶 最高档锁死</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">步态失稳发情飙升</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：盲盒道具开箱]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">📦 盲盒塞入</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">未知恐惧，随机起效</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：体外道具公开佩戴]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🔌 体外暴露</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">导线/尾巴公开暴露</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：道具遗落公开事件]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">😰 意外滑落</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">不得不当众处理异物</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制携带道具社交]')\" style=\"grid-column: span 2;\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🤝 道具社交挑战</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">勉强维持理智完成对话</div></div>\n            </div>\n        </details>\n\n        <!-- 06 认知劫持 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #8b74b8;\">\n            <summary class=\"admin-fold-title\"><span>🧠 认知劫持</span><span class=\"fold-desc\">语言精神格式化</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：思维朗读强制播报]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💭 思维外放</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">羞耻内心念头全漏出</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：语言皮层劫持]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">👅 淫词转译</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">想呼救却说出求欢</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：否定词消除诅咒]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">❌ 吞咽\"不\"字</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">只能被动说要</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：音量反转诅咒]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🔊 音量反转</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">越想忍耐反而越大声</div></div>\n                <div class=\"cmd-btn\" style=\"grid-column: span 2;\" onclick=\"copyAction('[系统指令：表层记忆格式化]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">📁 记忆断片错乱</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清空记忆面对惨破的身体</div></div>\n            </div>\n        </details>\n\n        <!-- 07 时间轴控制 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #c98565;\">\n            <summary class=\"admin-fold-title\"><span>⏳ 时间结界</span><span class=\"fold-desc\">冻结与快进结算</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：局部时间停止]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">⏸️ 局部时停</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清醒看自己被玩弄</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制休眠结算]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💤 休眠清算</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">直接跳过走衰减反噬</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：时间快进至深夜]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🌙 跃入深夜</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">无缝连接午夜欺凌</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：时间快进至翌日]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🌅 跨日发酵</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">未洗浓精导致发热异常</div></div>\n            </div>\n        </details>\n\n        <!-- 08 社会暴露 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #c49539;\">\n            <summary class=\"admin-fold-title\"><span>📸 社会暴露</span><span class=\"fold-desc\">公开处刑警报</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：熟人撞破现场]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">😱 熟人撞破</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">生成关系人立刻目击</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：身份彻底曝光倒计时]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">⏰ 曝光红警</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">身份进度飙至80%</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：随机守则违规审判]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🎲 守则抽签</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">无理由立刻进入处刑</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：下达赦免洗礼]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🕊️ 赦免洗礼</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清违纪印章暂保平安</div></div>\n                <div class=\"cmd-btn\" style=\"grid-column: span 2;\" onclick=\"copyAction('[系统指令：判决公开处刑]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\" style=\"color:#d8a649;\">⚖️ 判决公开云播</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">强制开启内外双镜深网接入</div></div>\n            </div>\n        </details>\n\n        <!-- 09 直播与脱出 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #64a6c4;\">\n            <summary class=\"admin-fold-title\"><span>📡 观测与逃猎</span><span class=\"fold-desc\">全息共享追与逃</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：强制脱出模式启动]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🚨 启动逃生</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">强制唤醒脱出雷达UI</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：有意图者驱散]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💨 跟随驱散</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">清空视线脱离威胁</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：观众体感全息共享]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🧠 体感共享</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">内壁刺激同步给暗网观众</div></div>\n                <div class=\"cmd-btn\" onclick=\"copyAction('[系统指令：骰子裁决]')\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">🎲 骰子盲盒</span><span class=\"cmd-icon\">📋</span></div><div class=\"cmd-desc\">发起1~6厄运投掷</div></div>\n                <div class=\"cmd-btn\" onclick=\"triggerManualPollution(event)\" style=\"grid-column: span 2;\"><div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\">💦 手动淫水糊屏(测试)</span><span class=\"cmd-icon\">🧽</span></div><div class=\"cmd-desc\">全屏物理流瀑特效</div></div>\n            </div>\n        </details>\n\n        <!-- 10 存档管理 -->\n        <details class=\"admin-fold\" style=\"--fold-color: #555;\">\n            <summary class=\"admin-fold-title\" style=\"color:#888;\"><span>🗑️ 浏览器存档</span><span class=\"fold-desc\">清空故事缓存</span></summary>\n            <div class=\"admin-fold-content\">\n                <div class=\"cmd-btn\" style=\"border-color: rgba(100,100,100,0.3); background: transparent; grid-column: span 2;\"\n                    onclick=\"(function(){\n                        ['cat_accepted_tasks','cat_spent_buybacks','cat_bb_coins'].forEach(function(k){ localStorage.removeItem(k); });\n                        window._bbCoins = 0;\n                        var coinEl = document.getElementById('bbCoinVal');\n                        if(coinEl) coinEl.textContent = '0';\n                        document.getElementById('adminConsole').classList.remove('show');\n                        showToast('📦 本地存档已清除，可开启新剧情 ✦');\n                    })()\">\n                    <div class=\"cmd-btn-header\"><span class=\"cmd-btn-title\" style=\"color:#aaa;\">🗑️ 初始化本地信息喵</span><span class=\"cmd-icon\">🔄</span></div>\n                    <div class=\"cmd-desc\">用于故事本篇完结时点击，将重置悬赏/赎买等锁定库</div>\n                </div>\n            </div>\n        </details>\n\n</div> <!-- admin-console-wrapper 结束 -->\n\n    <!-- 顶栏整体压低做扁，标题字号加大 -->\n<div class=\"bar-header\" onclick=\"toggleKtPanel(event)\">\n        <!-- ✦ 右上角常驻微星装饰 (新增) -->\n        <div style=\"position:absolute;top:7px;right:46px;display:flex;gap:4px;pointer-events:none;z-index:5;\">\n            <span style=\"font-size:7px;color:#00f5ff;opacity:0;animation:corner-star-twinkle 3.2s ease-in-out 0s infinite;\">✦</span>\n            <span style=\"font-size:7px;color:#ffb3c6;opacity:0;animation:corner-star-twinkle 2.8s ease-in-out 0.7s infinite;\">✧</span>\n            <span style=\"font-size:7px;color:#a2e1db;opacity:0;animation:corner-star-twinkle 3.5s ease-in-out 1.4s infinite;\">✦</span>\n        </div>\n        <div class=\"header-left\">\n            <div class=\"breath-dot\" id=\"breathDot\" onclick=\"toggleAdminConsole(event)\" title=\"精准触控：点击开启辅控终端\"></div>\n\n            <!-- 🐱 软萌发箍 + 精致星轨三合一组件 -->\n            <div style=\"position:relative; display:flex; align-items:center;\">\n              <!-- 标题左侧的呼吸星 -->\n              <span class=\"title-magic-star\" style=\"top: -2px; left: -10px; --tw-dur: 1.8s; --tw-del: 0s;\">✦</span>\n\n              <div class=\"cat-compound\" id=\"catGroup\">\n                <!-- ☄️ 新增：耳朵上方的流星防线 -->\n                <div class=\"shooting-star-layer\">\n                    <div class=\"flare-particle\" style=\"left: 0%; top: 50%; --f-dur: 4.5s; --f-del: 0.2s;\"></div>\n                    <div class=\"flare-particle\" style=\"left: 20%; top: 80%; --f-dur: 5.2s; --f-del: 2.1s;\"></div>\n                    <div class=\"flare-particle\" style=\"left: -10%; top: 30%; --f-dur: 6s; --f-del: 3.5s;\"></div>\n                </div>\n\n                <svg class=\"ahoge-svg\" viewBox=\"0 0 20 16\">\n                  <g class=\"ahoge-g\"><path id=\"ahogeShape\" class=\"ahoge-path\" d=\"M10,16 C10,6 2,4 6,1\"></path></g>\n                </svg>\n                <div class=\"ears-row\">\n                  <div class=\"ear-soft l\"></div>\n                  <div class=\"ear-soft r\"></div>\n                </div>\n                <div class=\"kao-face\" id=\"kaoText\">OwO</div>\n              </div>\n              <span class=\"header-title-text\" id=\"hudTitle\" data-text=\"🍓Meow_Live💖\">🍓Meow_Live💖</span>\n\n              <!-- 标题右侧的呼吸星 -->\n              <span class=\"title-magic-star\" style=\"bottom: 2px; right: -8px; --tw-dur: 2.2s; --tw-del: 0.5s;\">✧</span>\n            </div><!-- 发箍+标题包裹容器结束 -->\n        </div>\n        <div class=\"header-right\" style=\"position:relative;\">\n            <span id=\"headerWhisper\" style=\"\n                position: absolute;\n                right: 100%;\n                top: 50%;\n                transform: translateY(-50%);\n                margin-right: 6px;\n                font-size: 0.62em; font-weight: 900; font-style: italic;\n                letter-spacing: 0.5px; pointer-events: none;\n                white-space: nowrap;\n                opacity: 0;\n            \"></span>\n            <span class=\"header-status-text\" id=\"statusBrief\">Connecting...</span>\n            <span class=\"header-arrow\">▼</span>\n        </div>\n    </div>\n\n    <div class=\"badge-wrapper\" id=\"titleBadgeWrapper\" style=\"display: none;\">\n        <div class=\"neon-pill-badge\">\n            <span class=\"badge-icon\">✨</span>\n            <span class=\"badge-text\" id=\"titleBadgeText\"></span>\n        </div>\n    </div>\n\n    <div class=\"ecg-container ecg-normal\" id=\"ecgMonitor\">\n        <div class=\"ecg-label\">ECG</div>\n        <div class=\"ecg-grid\"></div>\n        <div class=\"ecg-wave-box\" id=\"ecgWaveBox\">\n            <canvas id=\"ecgCanvas\"></canvas>\n        </div>\n    </div>\n    <div class=\"voice-wave-container vw-p1\" id=\"voiceWave\">\n        <div class=\"vw-label\">VOICE</div>\n        <div class=\"vw-wave-box\">\n            <div class=\"vw-line\"></div>\n            <div class=\"vw-overlay\"></div>\n        </div>\n    </div>\n\n\n    <div class=\"bar-panel\" id=\"ktPanel\">\n        <div class=\"panel-glow\"></div>\n        <div class=\"panel-inner\">\n            <!-- 沉浸式单列横向滑动菜单 -->\n            <div class=\"nav-tabs\" id=\"navTabs\">\n                <div class=\"nav-tabs-slider\" id=\"navTabsSlider\"></div>\n                <div class=\"tab-btn active\" onclick=\"switchKtTab('tab-base', this, event)\" data-target=\"tab-base\">🔮 状态</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-daily', this, event)\" data-target=\"tab-daily\">🌙 日常</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-lover', this, event)\" data-target=\"tab-lover\" id=\"tabIconLover\" style=\"display:none;\">💗 恋人</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-relation', this, event)\" data-target=\"tab-relation\" id=\"tabIconRelation\" style=\"display:none;\">💔 关系</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-news', this, event)\" data-target=\"tab-news\" id=\"tabIconNews\" style=\"display:none;\">🌐 资讯</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-sys', this, event)\" data-target=\"tab-sys\" id=\"tabIconSys\" style=\"display:none;\">💠 系统</div>\n                <div class=\"tab-btn\" onclick=\"switchKtTab('tab-body', this, event)\" data-target=\"tab-body\">🩺 肉体</div>\n                <div class=\"tab-btn\" onclick=\"switchKtTab('tab-depr', this, event)\" data-target=\"tab-depr\">😈 恶堕</div>\n                <div class=\"tab-btn\" onclick=\"switchKtTab('tab-fluid', this, event)\" data-target=\"tab-fluid\">💦 体液</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-cycle', this, event)\" data-target=\"tab-cycle\" id=\"tabIconCycle\" style=\"display:none;\">🩸 经期</div>\n                <div class=\"tab-btn\" onclick=\"switchKtTab('tab-preg', this, event)\" data-target=\"tab-preg\">🍼 孕育</div>\n<div class=\"tab-btn tab-btn-live\" onclick=\"switchKtTab('tab-live', this, event)\" data-target=\"tab-live\" id=\"tabIconLive\">☁️ 观测</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-gaze', this, event)\" data-target=\"tab-gaze\" id=\"tabIconGaze\" style=\"display:none;\">🌏 世界</div>\n<div class=\"tab-btn\" onclick=\"switchKtTab('tab-rule', this, event)\" data-target=\"tab-rule\">📜 守则</div>\n            </div>\n\n            <div class=\"tab-content-container\" id=\"swipeContainer\">\n                <div id=\"tab-base\" class=\"tab-content active\"></div>\n<div id=\"tab-daily\" class=\"tab-content\"></div>\n<div id=\"tab-lover\" class=\"tab-content\"></div>\n<div id=\"tab-relation\" class=\"tab-content\"></div>\n<div id=\"tab-news\" class=\"tab-content\"></div>\n<div id=\"tab-sys\" class=\"tab-content\"></div>\n                <div id=\"tab-body\" class=\"tab-content\"></div>\n                <div id=\"tab-depr\" class=\"tab-content\"></div>\n                <div id=\"tab-fluid\" class=\"tab-content\"></div>\n<div id=\"tab-cycle\" class=\"tab-content\"></div>\n                <div id=\"tab-preg\" class=\"tab-content\"></div>\n<div id=\"tab-live\" class=\"tab-content\"></div>\n<div id=\"tab-gaze\" class=\"tab-content\"></div>\n<div id=\"tab-rule\" class=\"tab-content\"></div>\n            </div>\n        </div>\n    </div>\n</div>\n</div><!-- kt-safe-guard 结束 -->


        `;

        // 3. 把两个节点挂到 SillyTavern 页面上
        document.body.appendChild(floatBtn);
        document.body.appendChild(container);

        // 4. 绑定点击事件：开关面板
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

        // SillyTavern 主页面加载好之后再插入 DOM
        // 这里简单一点：直接调用 createHudDom
        createHudDom();
    });
})();
