// static/js/utils.js

function showToast(msg, duration = 1500) {
    const el = document.getElementById('web-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.opacity = '0'; }, duration);
}

// ==================================================================================
// 工具函数 (Utilities)
// ==================================================================================

/**
 * 统一上色工具
 * @param {string} text - 需要处理的文本
 * @param {string} mode - 'all'(默认) | 'bazi'(干支) | 'gua'(卦名专用，不染地支)
 */
function highlightText(text, mode = 'all') {
    if (!text) return "";

    let targetMap;
    if (mode === 'gua') {
        targetMap = MAP_FOR_GUA;
    } else if (mode === 'bazi') {
        targetMap = MAP_FOR_BAZI;
    } else {
        targetMap = WUXING_MAP_ALL;
    }

    return text.split('').map(char => {
        let wuxing = targetMap[char];
        if (!wuxing && ELEMENT_COLORS[char]) {
            wuxing = char;
        }
        if (wuxing && ELEMENT_COLORS[wuxing]) {
            return `<span class="${ELEMENT_COLORS[wuxing]} font-bold">${char}</span>`;
        }
        return char;
    }).join('');
}

const colorizeWuxing = (text) => highlightText(text, 'all');
const colorizeGanZhi = (text) => highlightText(text, 'bazi');

// ==================================================================================
// 渲染组件 (Render Components)
// ==================================================================================

function renderBetaBadge() {
    return `<span class="px-1.5 py-0.5 rounded border border-border/45 bg-white/35 text-[9px] font-sans text-inkLight/70 tracking-[0.04em] translate-y-1">Beta</span>`;
}

function renderPageTitle(title, {beta = false} = {}) {
    return `
        <div class="flex items-center gap-3">
            <h2 class="text-3xl font-light text-ink tracking-wider">${title}</h2>
            ${beta ? renderBetaBadge() : ""}
        </div>`;
}

function renderHeaderActionButton({icon, label, onClick, buttonId = "", labelId = "", disabled = false, wrapperClass = "relative group"}) {
    return `
        <div class="${wrapperClass}">
            <button ${buttonId ? `id="${buttonId}"` : ""} onclick="${onClick}" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200" ${disabled ? "disabled" : ""}>
                ${icon}
            </button>
            <div ${labelId ? `id="${labelId}"` : ""} class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                ${label}
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
            </div>
        </div>`;
}

function escapeAttr(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function closeDesignSelect(shouldRender = true) {
    if (!state.ui || !state.ui.selectOpen) return;
    const id = state.ui.selectOpen;
    state.ui.selectOpen = null;
    const menu = document.querySelector(`[data-design-select-menu="${id}"]`);
    if (menu) {
        const container = menu.closest("[data-select-id]");
        container?.querySelector(".design-select-trigger")?.classList.remove("design-select-trigger-open");
        container?.querySelector(".design-select-arrow")?.classList.remove("design-select-arrow-open");
        menu.remove();
    }
}

function _buildDesignSelectMenu(id, value, options, callback, menuClass) {
    const items = options.map((item) => {
        const active = String(item.value) === String(value);
        return `<button type="button" onclick="selectDesignOption('${id}', '${escapeAttr(String(item.value))}', '${callback}')"
            class="design-select-option ${active ? "design-select-option-active" : ""}">${item.label}</button>`;
    }).join("");
    return `<div data-design-select-menu="${id}" class="design-select-menu ${menuClass}"><div class="design-select-menu-scroll">${items}</div></div>`;
}

function toggleDesignSelect(id, event) {
    event.stopPropagation();
    state.ui = state.ui || {};
    const wasOpen = state.ui.selectOpen === id;
    closeAllMenus(false);
    state.ui.selectOpen = wasOpen ? null : id;
    const input = document.getElementById(id);
    const container = input?.closest("[data-select-id]");
    if (!container) { renderMain(); return; }
    const trigger = container.querySelector(".design-select-trigger");
    const arrow = container.querySelector(".design-select-arrow");
    const isOpen = !wasOpen;
    trigger?.classList.toggle("design-select-trigger-open", isOpen);
    arrow?.classList.toggle("design-select-arrow-open", isOpen);
    container.querySelector("[data-design-select-menu]")?.remove();
    if (isOpen) {
        try {
            const options = JSON.parse(container.dataset.selectOpts || "[]");
            const callback = container.dataset.selectCb || "";
            const menuClass = container.dataset.selectMc || "";
            container.insertAdjacentHTML("beforeend", _buildDesignSelectMenu(id, input.value, options, callback, menuClass));
            setTimeout(() => {
                const scroll = container.querySelector(".design-select-menu-scroll");
                const active = scroll?.querySelector(".design-select-option-active");
                if (scroll && active) scroll.scrollTop = active.offsetTop - scroll.clientHeight / 2 + active.clientHeight / 2;
            }, 0);
        } catch (e) {
            renderMain();
        }
    }
}

function selectDesignOption(id, value, callbackName = "") {
    const input = document.getElementById(id);
    if (input) input.value = value;
    state.ui = state.ui || {};
    // Close dropdown DOM before clearing state so closeAllMenus in callbacks still finds it
    const prevOpen = state.ui.selectOpen;
    if (prevOpen) {
        const menu = document.querySelector(`[data-design-select-menu="${prevOpen}"]`);
        if (menu) {
            const container = menu.closest("[data-select-id]");
            container?.querySelector(".design-select-trigger")?.classList.remove("design-select-trigger-open");
            container?.querySelector(".design-select-arrow")?.classList.remove("design-select-arrow-open");
            menu.remove();
        }
    }
    state.ui.selectOpen = null;
    if (!callbackName && typeof collectLiurenForm === "function" && id.startsWith("liuren-")) {
        state.liuren.form = collectLiurenForm();
    }
    let handled = false;
    if (callbackName && typeof window[callbackName] === "function") {
        handled = window[callbackName](value) === false;
    }
    if (!handled) renderMain();
}

function renderDesignSelect({id, value = "", placeholder = "请选择", options = [], callback = "", widthClass = "w-full", menuClass = "", label = ""}) {
    const open = state.ui && state.ui.selectOpen === id;
    const selected = options.find((item) => String(item.value) === String(value));
    const display = selected ? selected.label : placeholder;
    return `
        <div class="design-select relative ${widthClass}"
             data-select-id="${id}"
             data-select-opts="${escapeAttr(JSON.stringify(options))}"
             data-select-cb="${escapeAttr(callback)}"
             data-select-mc="${escapeAttr(menuClass)}"
             onclick="event.stopPropagation()">
            <input id="${id}" type="hidden" value="${escapeAttr(value)}">
            <button type="button" onclick="toggleDesignSelect('${id}', event)" class="design-select-trigger ${open ? "design-select-trigger-open" : ""}">
                ${label ? `<span class="design-select-label">${label}</span>` : ""}
                <span class="design-select-value ${selected ? "text-ink" : "text-inkLight"}">${display}</span>
                <span class="design-select-arrow ${open ? "design-select-arrow-open" : ""}" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </button>
            ${open ? _buildDesignSelectMenu(id, value, options, callback, menuClass) : ""}
        </div>`;
}

// 渲染单根爻线
function renderYaoLine(isYang, isChange, label, trigramInfo) {
    // 1. 计算线条颜色
    let lineBgClass = "bg-ink";

    if (trigramInfo) {
        const wx = BAGUA_MAP[trigramInfo.name] || trigramInfo.element;
        if (ELEMENT_BG_COLORS[wx]) {
            // 使用 opacity-90 保持一点通透感
            lineBgClass = `${ELEMENT_BG_COLORS[wx]} opacity-90`;
        }
    }

    // 2. 构建线条 HTML
    const yangLine = `<div class="w-full h-[18px] ${lineBgClass} rounded-sm shadow-sm"></div>`;
    const yinLine = `
        <div class="w-full flex justify-between h-[18px]">
            <div class="w-[44%] ${lineBgClass} rounded-sm shadow-sm"></div>
            <div class="w-[44%] ${lineBgClass} rounded-sm shadow-sm"></div>
        </div>`;

    const lineVisual = isYang ? yangLine : yinLine;
    const dot = isChange ? `<div class="w-3 h-3 rounded-full bg-accent shadow-sm"></div>` : '';

    let labelHtml = '';
    if (label && trigramInfo) {
        const wx = BAGUA_MAP[trigramInfo.name] || trigramInfo.element;
        const elColor = ELEMENT_COLORS[wx] || 'text-ink';

        // [修改] 移除了自然类象(雷/风等)两边的括号，并增加了 margin-left
        labelHtml = `
            <span class="mr-2 font-light opacity-80 text-xs">${label}</span>
            <span class="text-xs ${elColor} font-medium tracking-tight">${trigramInfo.name}</span>
            <span class="${elColor} font-bold text-xs">${trigramInfo.element}</span>
            <span class="text-xs text-inkLight opacity-60 ml-1.5 scale-90">${trigramInfo.nature}</span>
        `;
    }

    return `
        <div class="relative flex justify-center items-center w-full h-9 my-1">
            <div class="w-[160px] flex justify-center">
                ${lineVisual}
            </div>
            <div class="absolute left-[calc(50%+90px)] top-0 h-full flex items-center">
                <div class="w-8 flex justify-center items-center">
                    ${dot}
                </div>
                <div class="text-sm text-inkLight flex items-center whitespace-nowrap">
                    ${labelHtml}
                </div>
            </div>
        </div>`;
}

// 渲染单个卦柱
function renderHexagramColumn(guaData) {
    let footerHtml = '';
    if (guaData.ling_data) {
        const lingTableHtml = guaData.ling_data.map(d => {
            const relColor = (d.rel === '生体' || d.rel === '比和') ? 'text-redDot font-bold' : 'text-inkLight opacity-70';
            const zhiColor = ELEMENT_COLORS[GANZHI_MAP[d.zhi]] || 'text-ink';
            const elColor = ELEMENT_COLORS[d.element] || 'text-ink';

            return `
                <div class="flex justify-between items-center bg-white/40 px-3 py-2 rounded-sm text-xs border border-transparent hover:border-border/30 transition-colors">
                    <span class="text-inkLight opacity-80 flex items-center">
                        ${d.label}令
                        <span class="font-medium ${zhiColor} ml-1">${d.zhi}</span>
                        <span class="${elColor} ml-0.5 transform scale-90 font-bold">${d.element}</span>
                    </span>
                    <span class="${relColor}">${d.rel}</span>
                </div>
            `;
        }).join('');

        footerHtml = `
            <div class="mt-auto border-t border-border/50 pt-6">
                <div class="grid grid-cols-2 gap-3">
                    ${lingTableHtml}
                </div>
            </div>`;
    }

    let yaoLinesHtml = '';
    for (let i = 5; i >= 0; i--) {
        const isUpper = i >= 3;
        const isYang = guaData.yao_lines[i] === 1;

        let label = null;
        const tiPos = guaData.ti_pos;
        const isTiZone = (tiPos === "上" && isUpper) || (tiPos === "下" && !isUpper);

        if (i === 4) label = isTiZone ? "体" : "用";
        if (i === 1) label = isTiZone ? "体" : "用";

        const isChange = (guaData.change_yao_idx !== undefined && (i + 1) === guaData.change_yao_idx);
        const currentTrigram = isUpper ? guaData.upper : guaData.lower;

        yaoLinesHtml += renderYaoLine(isYang, isChange, label, currentTrigram);
        if (i === 3) yaoLinesHtml += `<div class="h-6"></div>`;
    }

    const relText = colorizeWuxing(guaData.relation_desc || '关系');
    const relationBar = `
        <div class="flex items-center justify-center py-3 px-6 bg-sidebar/50 rounded-full mb-6 border border-border/30 shadow-sm">
            <span class="text-ink font-medium text-lg tracking-widest">${relText}</span>
        </div>
    `;

    // 卦名使用 'gua' 模式，避免错误染色
    const coloredName = guaData.name;

    return `
        <div class="flex flex-col h-full bg-white/40 p-8 rounded-xl border border-border/60 hover:border-border transition-all duration-300 shadow-sm hover:shadow-md">
            <div class="text-center mb-6">
                <div class="text-inkLight text-[10px] tracking-[0.3em] uppercase mb-2 opacity-60">${guaData.title}</div>
                <div class="text-3xl font-medium text-ink tracking-wide">${coloredName}</div>
            </div>
            <div class="flex flex-col items-center mb-6">
                ${yaoLinesHtml}
            </div>
            ${relationBar}
            <div class="mb-4 flex justify-center opacity-0 h-0 overflow-hidden"></div>
            ${footerHtml}
        </div>`;
}
