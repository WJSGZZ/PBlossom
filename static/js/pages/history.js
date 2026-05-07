// static/js/pages/history.js

// "2026-05-06 09:05" → "05/06/2026 09:05:00"
function solarToTimestamp(solar) {
    if (!solar) return "";
    const [datePart, timePart = "00:00"] = solar.split(" ");
    const [y, m, d] = datePart.split("-");
    return `${m}/${d}/${y} ${timePart}:00`;
}

// 导入 txt 文件
function tapImport() {
    const input = document.getElementById('import-file-input');
    if (input) {
        input.value = '';  // 允许重复选同一文件
        input.click();
    }
}

function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;

        // ── 六壬 format detection ──────────────────────────────────────
        const isLiuren = text.indexOf('【六壬排盘】') >= 0
            || text.indexOf('【起课信息】') >= 0
            || text.indexOf('【三传】') >= 0
            || (/阳历时[：:]/.test(text) && /月将[：:]/.test(text) && /干支[：:]/.test(text));

        if (isLiuren) {
            const dtMatch = text.match(/(?:北京时间|阳历时)[：:]\s*(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2})[：:](\d{1,2})/);
            if (!dtMatch) { showToast('格式无法识别'); return; }

            const [, y, mo, d, h, mi] = dtMatch;
            const pad2 = n => String(n).padStart(2, '0');
            const datetime_local = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}`;

            const questionMatch = text.match(/问事[：:]\s*(.+)/);
            const _q = questionMatch ? questionMatch[1].trim() : '';
            const question = _q === '[暂未填写]' ? '' : _q;

            const mgMatch = text.match(/月将[：:]\s*([子丑寅卯辰巳午未申酉戌亥])/);
            const hbMatch = text.match(/占时[：:]\s*([子丑寅卯辰巳午未申酉戌亥])/);
            const nmMatch = text.match(/贵人[：:]\s*(昼贵|夜贵)/);

            const lonMatch = text.match(/东经([\d.]+)°/);

            const liurenInput = {
                question,
                datetime_local,
                timezone_offset_minutes: new Date().getTimezoneOffset(),
                longitude: lonMatch ? parseFloat(lonMatch[1]) : null,
                location_attempted: false,
                overrides: {
                    month_general: mgMatch ? mgMatch[1] : null,
                    hour_branch: hbMatch ? hbMatch[1] : null,
                    noble_mode: nmMatch ? (nmMatch[1] === '昼贵' ? 'day' : 'night') : null,
                },
            };

            fetch('/api/liuren', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(liurenInput)
            })
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') {
                    const data = res.data;
                    const record = {
                        type: 'liuren',
                        id: Date.now(),
                        title: (data.liuren.course_types && data.liuren.course_types.length) ? data.liuren.course_types[0] : '六壬',
                        question: data.question || '',
                        solar: data.calendar.solar,
                        ganzhi: data.calendar.ganzhi,
                        liuren_input: liurenInput,
                        liuren_result: data,
                    };
                    state.history.unshift(record);
                    localStorage.setItem('pblossom_history', JSON.stringify(state.history));
                    renderMain();
                    showToast('导入成功');
                } else {
                    showToast('格式无法识别');
                }
            })
            .catch(() => showToast('导入失败，请重试'));
            return;
        }

        // ── 梅花易数 format ────────────────────────────────────────────
        const numsMatch = text.match(/数字[：:]\s*(\d+)\s+(\d+)\s+(\d+)/);
        const timeMatch = text.match(/起卦时间[：:]\s*(.+)/);
        const ganzhiMatch = text.match(/四柱八字[：:]\s*(.+)/);
        const noteMatch = text.match(/【备注】[：:]\s*(.+)/);

        if (!numsMatch || !timeMatch || !ganzhiMatch) {
            showToast('格式无法识别');
            return;
        }

        const [n1, n2, n3] = [numsMatch[1], numsMatch[2], numsMatch[3]];
        const timestamp = timeMatch[1].trim();
        const note = noteMatch ? noteMatch[1].trim() : '';

        fetch('/api/divine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n1, n2, n3, timestamp })
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                const record = { ...res.data, id: Date.now(), input_nums: [Number(n1), Number(n2), Number(n3)], note };
                state.history.unshift(record);
                localStorage.setItem('pblossom_history', JSON.stringify(state.history));
                renderMain();
                showToast('导入成功');
            } else {
                showToast('格式无法识别');
            }
        })
        .catch(() => showToast('导入失败，请重试'));
    };
    reader.onerror = function() { showToast('文件读取失败'); };
    reader.readAsText(file, 'utf-8');
}

// 加载历史记录（每次重新计算）
function loadRecord(id) {
    const record = state.history.find(r => r.id === id);
    if (!record) return;

    if (record.type === "liuren") {
        if (!record.liuren_input) {
            state.liuren.result = { ...record.liuren_result, _historyId: record.id };
            state.liuren.form = null;
            state.liuren.advancedOpen = false;
            state.activeTab = "liuren";
            renderMain();
            return;
        }
        fetch('/api/liuren', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record.liuren_input)
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                const data = res.data;
                data._historyId = record.id;
                const recalculated = {
                    ...record,
                    title: (data.liuren.course_types && data.liuren.course_types.length) ? data.liuren.course_types[0] : "六壬",
                    question: data.question || "",
                    solar: data.calendar.solar,
                    ganzhi: data.calendar.ganzhi,
                    liuren_result: data,
                };
                const idx = state.history.findIndex(r => r.id === id);
                if (idx !== -1) state.history[idx] = recalculated;
                localStorage.setItem("pblossom_history", JSON.stringify(state.history));
                state.liuren.result = data;
                state.liuren.form = null;
                state.liuren.advancedOpen = false;
                state.activeTab = "liuren";
                renderMain();
            } else {
                showToast(res.message || "排盘失败");
            }
        })
        .catch(() => showToast('排盘失败，请重试'));
        return;
    }

    const [n1, n2, n3] = record.input_nums;
    fetch('/api/divine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n1, n2, n3, timestamp: record.timestamp })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            const recalculated = { ...res.data, id: record.id, input_nums: record.input_nums, note: record.note || '' };
            const idx = state.history.findIndex(r => r.id === id);
            if (idx !== -1) state.history[idx] = recalculated;
            state.result = recalculated;
            state.resultContextTab = 'history';
            renderMain();
        }
    });
}

// 删除记录
function deleteRecord(event, btn, id) {
    event.stopPropagation();

    if (window.activeDeleteId !== null && window.activeDeleteId !== id) {
        resetDeleteBtnUI(window.activeDeleteId);
    }

    if (btn.dataset.status === 'confirm') {
        if (window._deleteLeaveHandler && window._deleteLeaveBtn) {
            window._deleteLeaveBtn.removeEventListener('mouseleave', window._deleteLeaveHandler);
            window._deleteLeaveHandler = null;
            window._deleteLeaveBtn = null;
        }
        state.history = state.history.filter(r => r.id !== id);
        localStorage.setItem('pblossom_history', JSON.stringify(state.history));
        if (state.result && state.result.id === id) {
            state.result = null;
            state.resultContextTab = null;
        }
        window.activeDeleteId = null;
        const card = document.getElementById(`history-card-${id}`);
        if (card) {
            card.style.transition = "opacity 0.15s";
            card.style.opacity = "0";
            setTimeout(() => {
                card.remove();
                if (state.history.length === 0) {
                    const grid = document.querySelector("#content-scroll .grid");
                    if (grid) grid.outerHTML = `<div class="flex-1 flex flex-col items-center justify-center text-inkLight opacity-30 min-h-[400px]"><p class="font-light tracking-widest">暂无记录</p></div>`;
                }
            }, 150);
        }
    } else {
        btn.dataset.status = 'confirm';
        window.activeDeleteId = id;
        btn.innerHTML = `<span style="font-size:11px;font-weight:700;color:#dc2626;line-height:1">确认</span>`;
        btn.className = "delete-btn-tag peer w-9 h-9 rounded-xl bg-red-50 ring-1 ring-red-200 opacity-100 cursor-pointer transition-all duration-200 flex items-center justify-center";
        btn.style.width = '';
        btn.style.height = '';

        if (window._deleteLeaveHandler && window._deleteLeaveBtn) {
            window._deleteLeaveBtn.removeEventListener('mouseleave', window._deleteLeaveHandler);
        }
        window._deleteLeaveHandler = function() {
            resetDeleteBtnUI(id);
            window.activeDeleteId = null;
            btn.removeEventListener('mouseleave', window._deleteLeaveHandler);
            window._deleteLeaveHandler = null;
            window._deleteLeaveBtn = null;
        };
        window._deleteLeaveBtn = btn;
        btn.addEventListener('mouseleave', window._deleteLeaveHandler);
    }
}

// 重置删除按钮UI
function resetDeleteBtnUI(id) {
    const card = document.getElementById(`history-card-${id}`);
    if (card) {
        const btn = card.querySelector('.delete-btn-tag');
        if (btn) {
            btn.dataset.status = 'normal';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

            // [关键修改] 恢复 'peer' 类
            btn.className = "delete-btn-tag peer rounded-xl text-inkLight hover:text-red-500 hover:bg-red-50/50 transition-all duration-200 flex items-center justify-center";
            btn.style.width = '36px';
            btn.style.height = '36px';
        }
    }
}

function getHistoryPageHtml() {
    let historyContent = '';
    if (state.history.length === 0) {
        historyContent = `
            <div class="flex-1 flex flex-col items-center justify-center text-inkLight opacity-30 min-h-[400px]">
                <p class="font-light tracking-widest">暂无记录</p>
            </div>`;
    } else {
        let itemsHtml = [...state.history].sort((a, b) => {
            const ta = a.solar || a.timestamp || '';
            const tb = b.solar || b.timestamp || '';
            return tb.localeCompare(ta);
        }).map(record => {
            const isLiuren = record.type === "liuren";

            let title, pillars, timeStr, noteText;
            if (isLiuren) {
                title = record.title || "六壬";
                pillars = record.ganzhi.replace(/[年月日时]/g, '').split(' ').filter(s => s.trim());
                timeStr = solarToTimestamp(record.solar);
                noteText = record.question ? (record.question.length > 8 ? record.question.substring(0, 8) + '…' : record.question) : '';
            } else {
                title = record.ben.name;
                pillars = record.ganzhi_str.replace(/[年月日时]/g, '').split(' ').filter(s => s.trim());
                timeStr = record.timestamp || "";
                noteText = record.note ? (record.note.length > 8 ? record.note.substring(0, 8) + '…' : record.note) : '';
            }

            return `
                <div id="history-card-${record.id}" onclick="loadRecord(${record.id})" class="text-left bg-white/50 hover:bg-white/80 px-5 rounded-2xl border border-border/40 hover:border-border/70 transition-all duration-300 shadow-sm hover:shadow-md group relative overflow-hidden w-full cursor-pointer flex items-center" style="padding-top:28px;padding-bottom:28px;min-height:120px">
                    <div class="absolute top-0 left-0 w-1 h-full bg-active group-hover:bg-accent transition-colors duration-300"></div>

                    <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div class="relative">
                            <button onclick="deleteRecord(event, this, ${record.id})" class="delete-btn-tag peer w-9 h-9 rounded-xl text-inkLight hover:text-red-500 hover:bg-red-50/50 transition-all duration-200 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                                删除
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
                            </div>
                        </div>
                    </div>

                    <div class="pl-3 pr-8 w-full">
                        <div class="text-4xl font-medium tracking-wide mb-2" style="color:rgba(45,45,45,0.5)">${title}</div>
                        <div class="border-t border-border/25 pt-2">
                            <div class="flex flex-wrap gap-1 mb-1">
                                ${pillars.map(p => `<span class="text-xs px-2 py-0.5 rounded-full bg-white/70 border border-transparent" style="color:#808080">${p}</span>`).join('')}
                            </div>
                            <span class="text-xs tracking-wide" style="color:rgba(128,128,128,0.6)">${timeStr}</span>
                        </div>
                    </div>
                    ${noteText ? `<span class="absolute text-xs max-w-[120px] truncate" style="color:#9b948a;right:18px;bottom:28px">${noteText}</span>` : ''}
                </div>`;
        }).join('');
        historyContent = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pr-2">${itemsHtml}</div>`;
    }

    return `
        <div class="p-8 lg:p-16 animate-fade-slow pb-6">
            <div class="flex items-end justify-between border-b border-border/30 pb-4 mb-12">
                <h2 class="text-3xl font-light text-ink tracking-wider">往昔</h2>
                <div class="relative group">
                    <button onclick="tapImport()" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="8" y="2" width="8" height="3" rx="1"/>
                            <path d="M8 3H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
                            <path d="M12 10v6"/><path d="M9 13l3 3 3-3"/>
                        </svg>
                    </button>
                    <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                        导入
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
                    </div>
                </div>
            </div>
            ${historyContent}
        </div>`;
}
