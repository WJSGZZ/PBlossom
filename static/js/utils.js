// static/js/utils.js

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
    const coloredName = highlightText(guaData.name, 'gua');

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