// static/js/pages/calendar.js

// ==================================================================================
// 底部栏控制 (新增核心逻辑)
// ==================================================================================

// [新增] 根据当前状态，决定是否浮起底部的“识命”按钮
function updateCalendarBottomBar() {
    const bottomBar = document.getElementById('bottom-calendar-bar');
    const shouldShow = (state.activeTab === 'calendar' && state.calendar.selectedHour !== null);

    if (shouldShow) {
        if (bottomBar) bottomBar.classList.remove('translate-y-full', 'pointer-events-none');
    } else {
        if (bottomBar) bottomBar.classList.add('translate-y-full', 'pointer-events-none');
        // [新增] 当底部栏隐藏时，自动重置回“识命”初始状态
        setTimeout(() => toggleGenderSelect(false), 300);
    }
}

// [新增] 切换性别选择界面
function toggleGenderSelect(showSelect) {
    const initBtn = document.getElementById('bazi-btn-init');
    const selectPnl = document.getElementById('bazi-btn-select');

    if (showSelect) {
        // 隐藏初始按钮，滑出选择面板
        initBtn.classList.add('opacity-0', 'pointer-events-none');
        selectPnl.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-full');
    } else {
        // 恢复初始按钮
        initBtn.classList.remove('opacity-0', 'pointer-events-none');
        selectPnl.classList.add('opacity-0', 'pointer-events-none', 'translate-y-full');
    }
}


// ==================================================================================
// 菜单与视图控制
// ==================================================================================

function closeAllMenus() {
    document.getElementById('year-dropdown-menu')?.classList.add('hidden');
    document.getElementById('month-dropdown-menu')?.classList.add('hidden');
    closeHourPicker();
}

function toggleYearMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('year-dropdown-menu');
    const isOpen = !menu.classList.contains('hidden');
    closeAllMenus();
    if (!isOpen) {
        menu.classList.remove('hidden');
        setTimeout(() => { const active = menu.querySelector('.bg-accent'); if (active) active.scrollIntoView({block: 'center'}); }, 0);
    }
}

function toggleMonthMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('month-dropdown-menu');
    const isOpen = !menu.classList.contains('hidden');
    closeAllMenus();
    if (!isOpen) {
        menu.classList.remove('hidden');
        setTimeout(() => { const active = menu.querySelector('.bg-accent'); if (active) active.scrollIntoView({block: 'center'}); }, 0);
    }
}

function selectYear(val) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(parseInt(val), current.getMonth(), 1);
    updateCalendarView();
    closeAllMenus();
}

function selectMonth(val) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(current.getFullYear(), parseInt(val), 1);
    updateCalendarView();
    closeAllMenus();
}

function changeMonth(offset) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    updateCalendarView();
}

function updateCalendarView() {
    const year = state.calendar.viewDate.getFullYear();
    const month = state.calendar.viewDate.getMonth();
    const yearText = document.getElementById('cal-year-text');
    const monthText = document.getElementById('cal-month-text');
    if (yearText) yearText.textContent = `${year}年`;
    if (monthText) monthText.textContent = `${month + 1}月`;
    const gridContainer = document.getElementById('cal-grid-container');
    if (gridContainer) gridContainer.innerHTML = renderGridHtml(year, month);
}


// ==================================================================================
// 日期与时辰选择逻辑 (核心修改点)
// ==================================================================================

async function selectDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    state.calendar.selectedDate = dateStr;
    state.calendar.viewDate = new Date(dateObj);
    updateCalendarView();

    // [修改] 切换日期时，重置已选时辰，并立即隐藏底部按钮
    state.calendar.selectedHour = null;
    updateCalendarBottomBar();

    const rightPanel = document.getElementById('cal-right-panel');
    if (rightPanel) rightPanel.classList.add('opacity-0');

    try {
        const res = await fetch('/api/calendar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({date: dateStr})
        });
        const json = await res.json();
        setTimeout(() => {
            if (json.status === 'success') {
                state.calendar.selectedData = json.data;
                // 再次确保状态一致
                if (state.activeTab === 'calendar' && !state.calendar.selectedHour) {
                    state.calendar.selectedHour = null;
                }

                if (rightPanel) {
                    rightPanel.innerHTML = renderRightPanelHtml(json.data);
                    updateHourDisplay(); // 这里会再次调用 updateCalendarBottomBar
                    rightPanel.classList.remove('opacity-0');
                }
            }
        }, 200);
    } catch (e) {
        console.error(e);
        if (rightPanel) rightPanel.classList.remove('opacity-0');
    }
}

function toggleHourPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById('hour-picker-panel');
    const hourCard = document.getElementById('hour-card');

    if (picker && hourCard) {
        const isHidden = picker.classList.contains('hidden');
        if (isHidden) {
            const rect = hourCard.getBoundingClientRect();
            picker.style.top = `${rect.bottom + 8}px`;
            picker.style.left = `${rect.left + rect.width / 2}px`;
            picker.style.transform = 'translateX(-50%)';
            picker.classList.remove('hidden');
            setTimeout(() => picker.classList.add('opacity-100'), 10);
        } else {
            closeHourPicker();
        }
    }
}

function closeHourPicker() {
    const picker = document.getElementById('hour-picker-panel');
    if (picker) {
        picker.classList.remove('opacity-100');
        setTimeout(() => picker.classList.add('hidden'), 200);
    }
}

// [修改] 选择时柱
function selectHour(idx) {
    state.calendar.selectedHour = idx;

    // 计算干支 (保持原有逻辑)
    const dayGan = state.calendar.selectedData.gz_day[0];
    const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const GAN_LIST = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const START_MAP = {"甲": 0, "己": 0, "乙": 2, "庚": 2, "丙": 4, "辛": 4, "丁": 6, "壬": 6, "戊": 8, "癸": 8};
    const startIdx = START_MAP[dayGan] || 0;
    const ganIdx = (startIdx + idx) % 10;
    const hourGZ = GAN_LIST[ganIdx] + ZHI_LIST[idx];

    // 更新 UI
    const hourDisplay = document.getElementById('hour-display');
    const hourLabel = document.getElementById('hour-label');

    if (hourDisplay) {
        hourDisplay.innerHTML = highlightText(hourGZ);
        hourDisplay.className = "text-2xl font-serif tracking-widest";
    }
    if (hourLabel) {
        hourLabel.innerHTML = "时柱";
        hourLabel.className = "text-[10px] text-ink opacity-40 mt-2 font-serif";
    }

    closeHourPicker();

    // [关键] 选完时柱后，触发底部“识命”按钮浮出
    updateCalendarBottomBar();
}

// [修改] 刷新时柱显示
function updateHourDisplay() {
    const hourDisplay = document.getElementById('hour-display');
    const hourLabel = document.getElementById('hour-label');

    // 状态检查：如果数据不全
    if (!state.calendar.selectedData || state.calendar.selectedHour === null) {
        if (hourDisplay) {
            hourDisplay.innerHTML = '<span class="font-bold">未选</span>';
            hourDisplay.className = "text-2xl font-serif tracking-widest text-inkLight/30";
        }
        if (hourLabel) {
            hourLabel.innerHTML = "时柱";
            hourLabel.className = "text-[10px] text-ink opacity-40 mt-2 font-serif";
        }

        // [关键] 状态重置或不全时，确保隐藏底部按钮
        updateCalendarBottomBar();
        return;
    }

    // 状态正常，显示当前选择
    selectHour(state.calendar.selectedHour);
}


// ==================================================================================
// 渲染组件 (HTML Generation)
// ==================================================================================

function renderGridHtml(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = '';
    for (let i = 0; i < firstDay; i++) html += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSelected = state.calendar.selectedDate === currentStr;
        const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
        let cellClass = "aspect-square flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 text-sm border border-transparent";
        if (isSelected) cellClass += " bg-accent text-white shadow-md font-bold hover:brightness-110";
        else if (isToday) cellClass += " text-accent border-accent/30 font-bold bg-accent/5 hover:bg-accent/10";
        else cellClass += " text-ink opacity-80 hover:bg-white/80";
        html += `<div onclick="selectDate(new Date(${year}, ${month}, ${d}))" class="${cellClass}">${d}</div>`;
    }
    return html;
}

function renderRightPanelHtml(info) {
    if (!info) {
        return `<div class="h-full min-h-[400px] flex flex-col items-center justify-center text-inkLight opacity-40 border border-dashed border-border rounded-2xl animate-fade-slow bg-white/40"><div class="mb-4 text-inkLight"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><span class="text-sm tracking-widest font-serif">请选择日期查看时令</span></div>`;
    }
    const dayNum = info.solar_date.split('-')[2];
    const yearMonth = info.solar_date.substring(0, 7).replace('-', '.');

    return `
    <div class="h-[420px] bg-white/70 p-8 rounded-3xl border border-border/40 flex flex-col relative transition-all duration-300 shadow-sm hover:shadow-md animate-fade-slow overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-accent/60"></div>
        <div class="flex justify-between items-start z-10">
            <div class="flex flex-col text-left">
                <span class="text-7xl font-serif text-accent font-bold leading-none tracking-tighter">${dayNum}</span>
                <span class="text-xs text-inkLight tracking-[0.3em] font-sans opacity-60 mt-2 uppercase">${info.week}</span>
            </div>
            <div class="text-right">
                <div class="text-lg font-serif text-ink tracking-[0.1em] font-medium">${yearMonth}</div>
                <div class="text-[10px] text-inkLight tracking-[0.2em] font-sans opacity-50 mt-1 uppercase">Solar Calendar</div>
            </div>
        </div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] font-serif opacity-[0.02] pointer-events-none select-none whitespace-nowrap z-0 text-center">${info.lunar_str.slice(-2)}</div>
        
        <div class="flex-1 flex flex-col items-center justify-center z-20 py-6">
            <div class="grid grid-cols-4 gap-3 w-full">
                <div class="flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-all"><span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Year</span><span class="text-2xl font-serif tracking-widest">${highlightText(info.gz_year)}</span><span class="text-[10px] text-ink opacity-40 mt-2 font-serif">年柱</span></div>
                <div class="flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-all"><span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Month</span><span class="text-2xl font-serif tracking-widest">${highlightText(info.gz_month)}</span><span class="text-[10px] text-ink opacity-40 mt-2 font-serif">月柱</span></div>
                <div class="flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-all"><span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Day</span><span class="text-2xl font-serif tracking-widest">${highlightText(info.gz_day)}</span><span class="text-[10px] text-ink opacity-40 mt-2 font-serif">日柱</span></div>
                
                <div id="hour-card" class="relative flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white hover:border-accent/40 transition-all cursor-pointer group" onclick="toggleHourPicker(event)">
                    <span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Hour</span>
                    <span id="hour-display" class="text-2xl font-serif tracking-widest text-inkLight/30"><span class="font-bold">未选</span></span>
                    <span id="hour-label" class="text-[10px] text-ink opacity-40 mt-2 font-serif">时柱</span>
                    <div class="absolute top-2 right-2 text-inkLight opacity-10 group-hover:text-accent group-hover:opacity-100 transition-all"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
                    <div id="hour-picker-panel" class="hidden opacity-0 fixed bg-white/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl transition-all duration-300 w-[240px] z-[100]">
                        <ul class="max-h-[300px] overflow-y-auto no-scrollbar py-2">
                        ${(() => {
                            const dayGan = info.gz_day[0];
                            const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
                            const GAN_LIST = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
                            const START_MAP = {"甲": 0, "己": 0, "乙": 2, "庚": 2, "丙": 4, "辛": 4, "丁": 6, "壬": 6, "戊": 8, "癸": 8};
                            const TIME_RANGES = ['23-01', '01-03', '03-05', '05-07', '07-09', '09-11', '11-13', '13-15', '15-17', '17-19', '19-21', '21-23'];
                            const startIdx = START_MAP[dayGan] || 0;
                            return ZHI_LIST.map((zhi, idx) => {
                                const ganIdx = (startIdx + idx) % 10;
                                const hourGZ = GAN_LIST[ganIdx] + zhi;
                                return `<li onclick="selectHour(${idx}); event.stopPropagation();" class="px-5 py-3 cursor-pointer transition-colors text-ink hover:bg-accent/5"><div class="flex items-center justify-between"><span class="font-serif text-lg">${highlightText(hourGZ)}</span><span class="text-[10px] opacity-50 font-sans">${zhi}时 ${TIME_RANGES[idx]}</span></div></li>`;
                            }).join('');
                        })()}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="pt-4 border-t border-border/30 flex justify-between items-center z-10">
            <div class="text-xs font-medium text-ink/80 tracking-[0.15em] bg-sidebar/40 px-4 py-1.5 rounded-full border border-border/40">农历 ${info.lunar_str}</div>
            <div class="text-[10px] text-inkLight opacity-40 font-serif tracking-widest italic">Seasonal Rhythm</div>
        </div>
    </div>`;
}

function getCalendarPageHtml() {
    const viewDate = state.calendar.viewDate;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    let yearListHtml = '';
    for (let y = 1900; y <= 2100; y++) {
        const isSelected = y === year;
        const itemClass = isSelected ? "bg-accent text-white font-bold" : "text-ink hover:bg-black/5";
        yearListHtml += `<li onclick="selectYear(${y})" class="px-4 py-2 cursor-pointer transition-colors text-center ${itemClass}">${y}年</li>`;
    }

    let monthListHtml = '';
    for (let m = 0; m < 12; m++) {
        const isSelected = m === month;
        const itemClass = isSelected ? "bg-accent text-white font-bold" : "text-ink hover:bg-black/5";
        monthListHtml += `<li onclick="selectMonth(${m})" class="px-4 py-2 cursor-pointer transition-colors text-center ${itemClass}">${m + 1}月</li>`;
    }

    const gridContent = renderGridHtml(year, month);
    const rightPanelContent = renderRightPanelHtml(state.calendar.selectedData);

    return `
        <div class="p-8 lg:p-16 animate-fade-slow pb-6 h-full flex flex-col">
            <h2 class="text-3xl font-light text-ink mb-12 tracking-wider border-b border-border/30 pb-4">时令</h2>
            <div class="flex flex-col lg:flex-row gap-8 max-w-[1000px] mx-auto w-full lg:h-[420px]">
                <div class="w-full max-w-[360px] flex-shrink-0 mx-auto lg:mx-0 relative z-10 flex flex-col h-[420px]">
                    <div class="flex justify-between items-center mb-6 px-2">
                        <button onclick="changeMonth(-1)" class="p-2 hover:bg-white/50 rounded-full text-inkLight transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <div onclick="toggleYearMenu(event)" class="flex items-center justify-between w-[110px] bg-white/40 hover:bg-white/70 border border-border/30 rounded-lg shadow-sm px-3 py-1 cursor-pointer transition-colors group select-none"><span id="cal-year-text" class="font-serif text-lg text-ink tracking-widest">${year}年</span><div class="text-inkLight group-hover:text-accent transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div>
                                <div id="year-dropdown-menu" class="hidden absolute top-full left-0 mt-2 w-full max-h-[240px] overflow-y-auto bg-white/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-50 text-sm no-scrollbar"><ul id="year-list-ul">${yearListHtml}</ul></div>
                            </div>
                            <div class="relative">
                                <div onclick="toggleMonthMenu(event)" class="flex items-center justify-between w-[90px] bg-white/40 hover:bg-white/70 border border-border/30 rounded-lg shadow-sm px-3 py-1 cursor-pointer transition-colors group select-none"><span id="cal-month-text" class="font-serif text-lg text-ink tracking-widest">${month + 1}月</span><div class="text-inkLight group-hover:text-accent transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div>
                                <div id="month-dropdown-menu" class="hidden absolute top-full left-0 mt-2 w-full max-h-[240px] overflow-y-auto bg-white/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-50 text-sm no-scrollbar"><ul id="month-list-ul">${monthListHtml}</ul></div>
                            </div>
                        </div>
                        <button onclick="changeMonth(1)" class="p-2 hover:bg-white/50 rounded-full text-inkLight transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                    </div>
                    <div class="grid grid-cols-7 gap-2 mb-2 text-center pb-2">${weekDays.map(d => `<div class="text-xs text-inkLight opacity-40 py-1 font-sans">${d}</div>`).join('')}</div>
                    <div id="cal-grid-container" class="grid grid-cols-7 gap-3 content-start relative z-0 h-[280px]">${gridContent}</div>
                </div>
                <div id="cal-right-panel" class="flex-1 w-full lg:w-auto transition-opacity duration-300">${rightPanelContent}</div>
            </div>
        </div>`;
}