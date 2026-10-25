// static/js/pages/calc.js

// ==================================================================================
// 底部输入栏控制
// ==================================================================================
function updateBottomInputBar() {
    const contentEl = document.getElementById('content-scroll');
    const bottomBar = document.getElementById('bottom-input-bar');
    const isPlumNewHome = (
        state.activeTab === 'calc' &&
        !state.result &&
        !state.resultContextTab &&
        !(state.liuren && (state.liuren.result || state.liuren.advancedOpen || state.liuren.form))
    );
    const shouldShow = false;

    if (shouldShow) {
        if (bottomBar) bottomBar.classList.remove('translate-y-full', 'pointer-events-none', 'opacity-0', 'invisible');
        if (contentEl) contentEl.classList.add('pb-[100px]');
    } else {
        if (bottomBar) bottomBar.classList.add('translate-y-full', 'pointer-events-none', 'opacity-0', 'invisible');
        if (contentEl) contentEl.classList.remove('pb-[100px]');
    }
}

function openLiurenPage() {
    state.resultContextTab = null;
    if (state.ui) state.ui.homeMethodMenuOpen = false;
    if (state.liuren) {
        state.liuren.result = null;
        state.liuren.form = null;
        state.liuren.advancedOpen = false;
    }
    switchTab("liuren");
}

function toggleHomeMethodMenu(event) {
    if (event) event.stopPropagation();
    state.ui = state.ui || {};
    state.ui.homeMethodMenuOpen = !state.ui.homeMethodMenuOpen;
    syncHomeMethodMenuDom();
}

function closeHomeMethodMenu(shouldRender = true) {
    if (!state.ui || !state.ui.homeMethodMenuOpen) return;
    state.ui.homeMethodMenuOpen = false;
    syncHomeMethodMenuDom();
}

function selectHomeMethod(method, event) {
    if (event) event.stopPropagation();
    state.ui = state.ui || {};
    state.ui.homeMethodMenuOpen = false;
    syncHomeMethodMenuDom();
    if (method === "liuren") {
        if (state.activeTab !== "liuren") {
            openLiurenPage();
        }
        return;
    }
    if (method === "meihua" && state.activeTab !== "calc") {
        resetToHome();
        return;
    }
}

function syncHomeMethodMenuDom() {
    const isOpen = !!(state.ui && state.ui.homeMethodMenuOpen);
    document.querySelectorAll(".home-method-pill").forEach((pill) => {
        pill.classList.toggle("home-method-pill-open", isOpen);
    });
    document.querySelectorAll(".home-method-menu").forEach((menu) => {
        menu.classList.toggle("home-method-menu-open", isOpen);
    });
}

function renderHomeMethodAction(currentMethod = "meihua") {
    const methodMenuOpen = !!(state.ui && state.ui.homeMethodMenuOpen);
    const activeCheck = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.5l4 4L19 7"></path>
        </svg>`;
    return `
        <div class="home-method-action" onclick="event.stopPropagation()">
            <button type="button" class="home-method-pill ${methodMenuOpen ? "home-method-pill-open" : ""}" onclick="toggleHomeMethodMenu(event)">
                <span class="home-method-pill-text">${currentMethod === "liuren" ? "六壬" : "梅花"}</span>
                <span class="home-method-caret" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </button>
            <div class="home-method-menu ${methodMenuOpen ? "home-method-menu-open" : ""}">
                <button type="button" class="home-method-option ${currentMethod === "meihua" ? "home-method-option-active" : ""}" onclick="selectHomeMethod('meihua', event)">
                    <span class="home-method-check">${currentMethod === "meihua" ? activeCheck : ""}</span>
                    <span class="home-method-copy">
                        <span class="home-method-title">梅花</span>
                        <span class="home-method-desc">支持绝大部分问事</span>
                    </span>
                </button>
                <button type="button" class="home-method-option ${currentMethod === "liuren" ? "home-method-option-active" : ""}" onclick="selectHomeMethod('liuren', event)">
                    <span class="home-method-check">${currentMethod === "liuren" ? activeCheck : ""}</span>
                    <span class="home-method-copy">
                        <span class="home-method-title home-method-title-beta">
                            <span>六壬</span>
                            <span class="home-method-beta">Beta</span>
                        </span>
                        <span class="home-method-desc">更加强大与深度</span>
                    </span>
                </button>
            </div>
        </div>
    `;
}

// 过滤非整数字符（只保留数字、逗号、空格、负号）
function filterIntInput(el) {
    const pos = el.selectionStart;
    const original = el.value;
    const filtered = original.replace(/[^\d,\s\-]/g, '');
    if (filtered !== original) {
        el.value = filtered;
        el.setSelectionRange(pos - 1, pos - 1);
    }
}

// 检查旧底部输入栏有效性；首页三个数字框不需要被这里禁用。
function checkInput(el) {
    const btn = document.getElementById('btn-submit');
    if (!btn || !el) return;
    const hasVal = el.value.trim().length > 0;

    if (hasVal) {
        btn.classList.remove('text-border', 'opacity-50');
        btn.classList.add('text-accent', 'opacity-100');
        btn.disabled = false;
    } else {
        btn.classList.add('text-border', 'opacity-50');
        btn.classList.remove('text-accent', 'opacity-100');
        btn.disabled = true;
    }
}

function getHomeInputNumbers() {
    const fields = [1, 2, 3].map((index) => document.getElementById(`home-num-${index}`));
    if (fields.every(Boolean)) {
        return fields.map((field, index) => {
            const raw = String(field.value || "").trim();
            const fallback = state.ui?.homeNums?.[index] || 1;
            return parseInt(raw || fallback, 10);
        }).filter((num) => !Number.isNaN(num));
    }

    const inputEl = document.getElementById('input-nums');
    const val = inputEl ? inputEl.value : "";
    return val
        .replace(/\uFF0C/g, ',')
        .replace(/\s+/g, ',')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((num) => !Number.isNaN(num));
}

function focusNextHomeNum(event, index) {
    if (event.key === "Backspace" && index > 1 && !event.currentTarget.value) {
        event.preventDefault();
        document.getElementById(`home-num-${index - 1}`)?.focus();
        return;
    }

    if (event.key === " " || event.key === "," || event.key === "\uFF0C") {
        event.preventDefault();
        document.getElementById(`home-num-${Math.min(index + 1, 3)}`)?.focus();
        return;
    }

    if (event.key !== "Enter") return;
    event.preventDefault();
    if (index < 3) {
        document.getElementById(`home-num-${index + 1}`)?.focus();
    } else {
        handleCalculate();
    }
}

// 起卦计算
async function handleCalculate() {
    const inputEl = document.getElementById('input-nums');
    const btn = document.getElementById('home-btn-submit') || document.getElementById('btn-submit');

    const nums = getHomeInputNumbers();

    if (nums.length !== 3) {
        alert("请确保输入三个整数");
        return;
    }

    const originalBtnHtml = btn ? btn.innerHTML : "";
    if (btn) {
        btn.innerHTML = `<div class="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>`;
        btn.disabled = true;
    }

    try {
        const response = await fetch('/api/divine', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({n1: nums[0], n2: nums[1], n3: nums[2]})
        });
        const res = await response.json();

        if (res.status === 'success') {
            const newRecord = { ...res.data, id: Date.now(), input_nums: nums };
            state.result = newRecord;
            state.resultContextTab = null;
            if (typeof addHistoryRecord === "function") {
                addHistoryRecord(newRecord);
            } else {
                state.history.unshift(newRecord);
                localStorage.setItem('pblossom_history', JSON.stringify(state.history));
            }
            renderMain();
        } else {
            alert("错误:" + res.message);
        }
    } catch (error) {
        console.error(error);
        alert("网络请求失败");
    } finally {
        if (btn) {
            btn.innerHTML = originalBtnHtml;
            btn.disabled = false;
        }
        if (inputEl) checkInput(inputEl);
    }
}

// [核心升级] 动态导出逻辑：请求后端重算报告
async function handleExport() {
    if (!state.result) return;

    const data = state.result;
    const nums = data.input_nums;

    // 生成文件名
    const timestampStr = data.timestamp.replace(/:/g, '-').replace(' ', '_');
    const fileName = `${timestampStr}_${nums[0]}_${nums[1]}_${nums[2]}.txt`;

    try {
        // [请求重算] 带着起卦时的三个数字 + 起卦时间，去后端重新生成一份报告
        // 这样可以确保报告使用最新的 Python 格式化代码（包含动爻标记等）
        const response = await fetch('/api/divine', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                n1: nums[0],
                n2: nums[1],
                n3: nums[2],
                timestamp: data.timestamp // 关键：传入原始时间，让后端“回到过去”计算
            })
        });

        const res = await response.json();

        if (res.status === 'success') {
            // 获取最新生成的纯文本报告
            let finalContent = res.data.report_text;

            // 拼接当前的备注 (Note)
            // 备注存在前端，后端可能不知道，所以在这里拼接最保险
            if (data.note && data.note.trim()) {
                const noteSection = `【备注】：${data.note}\n`;
                finalContent = noteSection + "-".repeat(50) + "\n" + finalContent;
            }

            // 执行下载
            downloadReport(fileName, finalContent);
        } else {
            alert("报告生成失败: " + res.message);
        }
    } catch (e) {
        console.error("导出失败:", e);
        alert("导出失败，请检查网络连接");
    }
}

// 导出下载辅助函数 (保持不变，只是被 handleExport 调用)
function downloadReport(filename, text) {
    const blob = new Blob([text], {type: 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// 更新备注
function updateNote(val) {
    if (!state.result) return;
    state.result.note = val;
    const idx = state.history.findIndex(r => r.id === state.result.id);
    if (idx !== -1) {
        state.history[idx].note = val;
        localStorage.setItem('pblossom_history', JSON.stringify(state.history));
    }
}

// 生成 HTML
function getCalcPageHtml() {
    if (!state.result) {
        const homeNums = state.ui?.homeNums || [1, 2, 3];
        const numberInputs = homeNums.map((num, index) => `
            <div class="home-num-slot">
                    <input id="home-num-${index + 1}"
                        type="text"
                        inputmode="numeric"
                        placeholder="${num}"
                        oninput="filterIntInput(this)"
                        onkeydown="focusNextHomeNum(event, ${index + 1})"
                    class="home-num-box">
            </div>
        `).join("");
        return `
            <div class="relative h-full flex flex-col items-center justify-center p-8 animate-fade-slow min-h-[500px]">
                ${renderHomeMethodAction("meihua")}
                <div class="home-brand">
                    <div class="text-5xl text-ink font-serif tracking-[0.1em] mb-4 opacity-90 font-light text-center">Plum Blossom</div>
                    <div class="text-xs text-inkLight tracking-[0.3em] uppercase opacity-50 text-center mb-12">Ancient Wisdom, Modern Elegance</div>
                </div>
                <div class="home-input-dock">
                    <div class="home-num-capsule">
                        <div class="home-num-fields">
                        ${numberInputs}
                        </div>
                        <button id="home-btn-submit" type="button" onclick="handleCalculate()" class="home-start-btn" aria-label="Start">
                            <span class="home-start-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M5 12h13"></path>
                                    <path d="m12 6 6 6-6 6"></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>`;
    } else {
        const data = state.result;
        data.bian.change_yao_idx = data.ben.change_yao_idx;
        data.hu.change_yao_idx = data.ben.change_yao_idx;

        const benHtml = renderHexagramColumn(data.ben);
        const bianHtml = renderHexagramColumn(data.bian);
        const huHtml = renderHexagramColumn(data.hu);

        const cleanGanzhi = data.ganzhi_str.replace(/[年月日时]/g, '');

        return `
            <div class="p-8 lg:p-12 animate-fade-slow pb-6">

                <div class="max-w-[1600px] mx-auto mb-6 pb-4 border-b border-border/30 px-4">
                    <div class="flex items-end justify-between mb-3">
                        <div>
                            <div class="text-xs text-inkLight mb-1 tracking-widest opacity-60">起卦时间: ${data.timestamp}</div>
                            <div class="text-2xl font-light text-ink tracking-wide whitespace-nowrap">${colorizeGanZhi(cleanGanzhi)}</div>
                        </div>
                        ${renderHeaderActionButton({icon: ICONS.export, label: "导出", onClick: "handleExport()", wrapperClass: "relative group flex-shrink-0 ml-4"})}
                    </div>
                    <div class="w-full md:max-w-[160px] group relative">
                        <div class="flex items-center">
                            <span class="text-accent font-serif font-bold text-sm mr-2 select-none whitespace-nowrap opacity-80">注:</span>
                            <input type="text" value="${data.note || ''}" oninput="updateNote(this.value)" placeholder="点击此处输入备注" class="w-full bg-transparent border-b border-transparent group-hover:border-border/50 focus:border-accent outline-none text-sm text-ink/80 font-serif tracking-wide placeholder:text-inkLight/30 placeholder:text-sm transition-all py-0 h-6">
                        </div>
                    </div>
                </div>
                <div class="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-16 items-stretch h-auto px-4">
                    <div class="flex-1 min-w-[320px]">${benHtml}</div>
                    <div class="flex-1 min-w-[320px]">${bianHtml}</div>
                    <div class="flex-1 min-w-[320px]">${huHtml}</div>
                </div>
            </div>`;
    }
}
