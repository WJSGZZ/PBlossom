// static/js/pages/bazi.js

async function handleBaziAnalyze(gender = 1) {
    const dateStr = state.calendar.selectedDate;
    const hourIdx = state.calendar.selectedHour;

    if (!dateStr || hourIdx === null) {
        alert("请先选择完整的日期和时辰");
        return;
    }

    const targetBtn = event.currentTarget;
    let originalContent = '';
    if(targetBtn) {
        originalContent = targetBtn.innerHTML;
        targetBtn.innerHTML = `<div class="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>`;
        targetBtn.disabled = true;
    }

    try {
        const response = await fetch('/api/bazi_analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                date: dateStr,
                hour_idx: hourIdx,
                gender: gender
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务器错误 (${response.status})`);
        }

        const res = await response.json();

        if (res.status === 'success') {
            state.baziResult = res.data;
            switchTab('bazi');
        } else {
            alert("排盘失败: " + res.message);
        }
    } catch (e) {
        console.error(e);
        alert("请求失败，请检查网络或服务器。");
    } finally {
        if(targetBtn && originalContent) {
            targetBtn.innerHTML = originalContent;
            targetBtn.disabled = false;
        }
        if(typeof toggleGenderSelect === 'function') toggleGenderSelect(false);
    }
}

// 导出功能
function exportBaziImage() {
    if (!state.baziResult || !state.baziResult.report_text) {
        alert("暂无排盘数据");
        return;
    }
    const textContent = state.baziResult.report_text;
    const dateStr = state.baziResult.solar_date;
    const fileName = `bazi_${dateStr}.txt`;

    const blob = new Blob([textContent], {type: 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function getWxColor(wx) {
    if (typeof ELEMENT_COLORS !== 'undefined' && ELEMENT_COLORS[wx]) {
        return ELEMENT_COLORS[wx];
    }
    return "text-ink";
}

function getWxBgColor(wx) {
    if (typeof ELEMENT_BG_COLORS !== 'undefined' && ELEMENT_BG_COLORS[wx]) {
        return ELEMENT_BG_COLORS[wx];
    }
    return "bg-gray-300";
}

function getBaziPageHtml() {
    const info = state.baziResult;
    if (!info) return `<div class="h-full flex flex-col items-center justify-center text-inkLight opacity-60"><p>数据未加载</p></div>`;

    // 1. 渲染四柱
    const pillarsHtml = info.pillars.map(p => {
        const hiddenHtml = p.hidden.map(h => {
            const wx = GANZHI_MAP[h.gan] || "";
            return `
            <div class="flex items-center justify-between text-[10px] w-full px-3 py-0.5 border-b border-dashed border-border/10 last:border-0 h-[22px]">
                <span class="text-inkLight scale-90 origin-left opacity-70 w-4">${h.shishen_short}</span>
                <span class="font-medium ${getWxColor(wx)} flex-1 text-right">${h.gan}</span>
            </div>`;
        }).join('');

        const labelMap = {"年柱": "祖业", "月柱": "提纲", "日柱": "日元", "时柱": "归宿"};

        let shishenTag = p.name === "日柱"
            ? `<span class="bg-accent text-white px-2 py-0.5 rounded-[4px] text-[10px] font-bold shadow-sm tracking-wider">日主</span>`
            : `<span class="bg-sidebar text-inkLight border border-border/50 px-2 py-0.5 rounded-[4px] text-[10px] tracking-wider">${p.gan_shishen_short}</span>`;

        const kongTag = p.is_kong ? `<div class="absolute top-2 right-2 text-[9px] text-inkLight border border-inkLight/30 rounded px-1 scale-90 bg-white/80">空亡</div>` : '';

        const cs = p.chang_sheng;
        let csColor = "text-inkLight opacity-40";
        if (["帝旺", "临官", "长生", "冠带"].includes(cs)) csColor = "text-accent font-bold opacity-100";

        return `
        <div class="flex flex-col items-center w-full">
            <div class="mb-3 text-center">
                <div class="text-xs font-bold text-ink opacity-70">${p.name}</div>
                <div class="text-[9px] text-inkLight opacity-40 scale-90 mt-0.5">${labelMap[p.name]}</div>
            </div>
            
            <div class="bg-white/70 w-full rounded-xl border border-border/40 flex flex-col items-center overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative">
                ${kongTag}
                
                <div class="w-full h-[90px] flex flex-col items-center justify-center border-b border-border/10 bg-white/40 relative">
                    <div class="absolute top-2 left-2 transform scale-90 origin-top-left">${shishenTag}</div>
                    <div class="text-4xl font-serif font-bold ${getWxColor(p.gan_wx)} pt-2">${p.gan}</div>
                </div>

                <div class="w-full flex flex-col items-center bg-white/10 pt-3 pb-2">
                    <div class="text-4xl font-serif font-bold ${getWxColor(p.zhi_wx)} mb-1">${p.zhi}</div>
                    <div class="text-[9px] ${csColor} mb-3 bg-sidebar/30 px-2 py-0.5 rounded-full scale-90">${p.chang_sheng}</div>
                    
                    <div class="w-full px-2 mb-2">
                        <div class="bg-sidebar/20 rounded-lg p-1 min-h-[70px] flex flex-col justify-center">
                            ${hiddenHtml || '<div class="text-[9px] text-center opacity-20">-</div>'}
                        </div>
                    </div>

                    <div class="w-full text-center py-1 border-t border-dashed border-border/20 mt-1">
                        <span class="text-[9px] text-inkLight/60 tracking-widest block scale-90">${p.nayin}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const dayunHtml = info.dayun.map(dy => {
        const ganWx = GANZHI_MAP[dy.gan];
        const zhiWx = GANZHI_MAP[dy.zhi];
        return `
            <div class="flex flex-col items-center flex-shrink-0 w-[56px] bg-white/40 hover:bg-white rounded-lg py-2 border border-border/20 transition-colors">
                <div class="text-[9px] text-inkLight opacity-50 mb-1 font-mono">${dy.age}岁</div>
                <div class="flex flex-col items-center gap-1 font-serif text-lg my-1">
                    <span class="${getWxColor(ganWx)} font-bold leading-none">${dy.gan}</span>
                    <span class="${getWxColor(zhiWx)} font-bold leading-none">${dy.zhi}</span>
                </div>
                <div class="text-[9px] text-inkLight opacity-30 transform scale-75 font-mono">${dy.year}</div>
            </div>
        `;
    }).join('');

    let wuxingBarHtml = '';
    const counts = info.wuxing_counts;
    const total = 8;
    const me = info.me_element;
    ["金", "木", "水", "火", "土"].forEach(wx => {
        const count = counts[wx];
        const percent = (count / total) * 100;
        const barColorClass = getWxBgColor(wx);
        const textColorClass = getWxColor(wx);
        const isMe = wx === me ? "ring-1 ring-offset-1 ring-border" : "";
        wuxingBarHtml += `
            <div class="flex items-center gap-3 mb-2 last:mb-0">
                <span class="text-[10px] w-3 ${textColorClass} font-bold text-center">${wx}</span>
                <div class="flex-1 h-1.5 bg-sidebar rounded-full overflow-hidden ${isMe}">
                    <div class="h-full ${barColorClass} transition-all duration-500 opacity-90" style="width: ${percent}%"></div>
                </div>
                <span class="text-[10px] w-4 text-right text-inkLight font-mono opacity-60">${count}</span>
            </div>
        `;
    });

    return `
    <div class="p-8 lg:p-16 animate-fade-slow h-full overflow-y-auto no-scrollbar relative">
        
        <div class="absolute top-8 right-8 group z-20">
            <button onclick="exportBaziImage()" class="text-inkLight hover:text-accent transition-colors p-2 rounded-full hover:bg-white/50">
                ${ICONS.export}
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                导出
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
            </div>
        </div>

        <div class="flex items-end justify-between border-b border-border/30 pb-4 mb-12">
            <div class="flex items-baseline gap-4">
                <h2 class="text-3xl font-light text-ink tracking-wider">识命</h2>
                <span class="text-xs text-inkLight opacity-50 tracking-widest bg-sidebar px-2 py-0.5 rounded-sm">${info.gender_str}</span>
            </div>
            
            <div class="text-right hidden md:block mr-12">
                <div class="text-sm font-serif text-ink tracking-widest">${info.solar_date}</div>
                <div class="text-[10px] text-inkLight opacity-50 tracking-widest uppercase">${info.qiyun_info}</div>
            </div>
        </div>

        <div class="max-w-6xl mx-auto flex flex-col gap-6">
            <div class="bg-white/40 p-6 lg:p-8 rounded-3xl border border-border/40 shadow-sm">
                <div class="grid grid-cols-4 gap-4 lg:gap-8">
                    ${pillarsHtml}
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 bg-white/60 border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xs font-bold text-ink flex items-center gap-2">
                            <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            大运
                        </h3>
                    </div>
                    <div class="flex gap-3 overflow-x-auto no-scrollbar items-center pb-1">
                        ${dayunHtml}
                    </div>
                </div>

                <div class="bg-white/60 border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xs font-bold text-ink flex items-center gap-2">
                            <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                            五行
                        </h3>
                    </div>
                    <div class="flex flex-col gap-1">
                        ${wuxingBarHtml}
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}