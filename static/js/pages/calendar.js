// static/js/pages/calendar.js

const CALENDAR_ZHI_LIST = ["\u5b50", "\u4e11", "\u5bc5", "\u536f", "\u8fb0", "\u5df3", "\u5348", "\u672a", "\u7533", "\u9149", "\u620c", "\u4ea5"];
const CALENDAR_GAN_LIST = ["\u7532", "\u4e59", "\u4e19", "\u4e01", "\u620a", "\u5df1", "\u5e9a", "\u8f9b", "\u58ec", "\u7678"];
const CALENDAR_START_MAP = {
    "\u7532": 0,
    "\u5df1": 0,
    "\u4e59": 2,
    "\u5e9a": 2,
    "\u4e19": 4,
    "\u8f9b": 4,
    "\u4e01": 6,
    "\u58ec": 6,
    "\u620a": 8,
    "\u7678": 8,
};
const CALENDAR_TIME_RANGES = ["23-01", "01-03", "03-05", "05-07", "07-09", "09-11", "11-13", "13-15", "15-17", "17-19", "19-21", "21-23"];

function getSelectedHourGanZhi() {
    if (!state.calendar.selectedData || state.calendar.selectedHour === null) {
        return "\u672a\u9009";
    }

    const dayGan = state.calendar.selectedData.gz_day[0];
    const startIdx = CALENDAR_START_MAP[dayGan] || 0;
    const ganIdx = (startIdx + state.calendar.selectedHour) % 10;
    return CALENDAR_GAN_LIST[ganIdx] + CALENDAR_ZHI_LIST[state.calendar.selectedHour];
}

async function handleCopyCalendarInfo() {
    if (!state.calendar.selectedData) return;

    const info = state.calendar.selectedData;
    const hourGanZhi = getSelectedHourGanZhi();
    const copyText = `\u65f6\u4ee4 ${info.solar_date} ${info.week} ${info.lunar_str} ${info.gz_year} ${info.gz_month} ${info.gz_day} ${hourGanZhi}`;

    try {
        await navigator.clipboard.writeText(copyText);
        const copyBtn = document.getElementById("calendar-copy-btn");
        const copyLabel = document.getElementById("calendar-copy-label");
        copyBtn?.classList.add("text-accent");
        if (copyLabel) copyLabel.textContent = "\u5df2\u590d\u5236";
        setTimeout(() => {
            copyBtn?.classList.remove("text-accent");
            if (copyLabel) copyLabel.textContent = "\u590d\u5236";
        }, 1200);
    } catch (error) {
        console.error(error);
        alert("\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5");
    }
}

function closeAllMenus() {
    document.getElementById("year-dropdown-menu")?.classList.add("hidden");
    document.getElementById("month-dropdown-menu")?.classList.add("hidden");
    closeHourPicker();
}

function toggleYearMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById("year-dropdown-menu");
    const isOpen = !menu.classList.contains("hidden");
    closeAllMenus();
    if (!isOpen) {
        menu.classList.remove("hidden");
        setTimeout(() => {
            const active = menu.querySelector(".bg-accent");
            if (active) active.scrollIntoView({ block: "center" });
        }, 0);
    }
}

function toggleMonthMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById("month-dropdown-menu");
    const isOpen = !menu.classList.contains("hidden");
    closeAllMenus();
    if (!isOpen) {
        menu.classList.remove("hidden");
        setTimeout(() => {
            const active = menu.querySelector(".bg-accent");
            if (active) active.scrollIntoView({ block: "center" });
        }, 0);
    }
}

function selectYear(val) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(parseInt(val, 10), current.getMonth(), 1);
    updateCalendarView();
    closeAllMenus();
}

function selectMonth(val) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(current.getFullYear(), parseInt(val, 10), 1);
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
    const yearText = document.getElementById("cal-year-text");
    const monthText = document.getElementById("cal-month-text");
    if (yearText) yearText.textContent = `${year}\u5e74`;
    if (monthText) monthText.textContent = `${month + 1}\u6708`;
    const gridContainer = document.getElementById("cal-grid-container");
    if (gridContainer) gridContainer.innerHTML = renderGridHtml(year, month);
}

async function selectDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    state.calendar.selectedDate = dateStr;
    state.calendar.viewDate = new Date(dateObj);
    state.calendar.selectedHour = null;
    updateCalendarView();

    const rightPanel = document.getElementById("cal-right-panel");
    if (rightPanel) rightPanel.classList.add("opacity-0");

    try {
        const res = await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: dateStr }),
        });
        const json = await res.json();
        setTimeout(() => {
            if (json.status === "success") {
                state.calendar.selectedData = json.data;
                if (rightPanel) {
                    rightPanel.innerHTML = renderRightPanelHtml(json.data);
                    updateHourDisplay();
                    rightPanel.classList.remove("opacity-0");
                }
            }
        }, 200);
    } catch (e) {
        console.error(e);
        if (rightPanel) rightPanel.classList.remove("opacity-0");
    }
}

function toggleHourPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById("hour-picker-panel");
    const hourCard = document.getElementById("hour-card");

    if (picker && hourCard) {
        const isHidden = picker.classList.contains("hidden");
        if (isHidden) {
            const rect = hourCard.getBoundingClientRect();
            picker.style.top = `${rect.bottom + 8}px`;
            picker.style.left = `${rect.left + rect.width / 2}px`;
            picker.style.transform = "translateX(-50%)";
            picker.classList.remove("hidden");
            setTimeout(() => picker.classList.add("opacity-100"), 10);
        } else {
            closeHourPicker();
        }
    }
}

function closeHourPicker() {
    const picker = document.getElementById("hour-picker-panel");
    if (picker) {
        picker.classList.remove("opacity-100");
        setTimeout(() => picker.classList.add("hidden"), 200);
    }
}

function selectHour(idx) {
    state.calendar.selectedHour = idx;

    const hourGZ = getSelectedHourGanZhi();

    const hourDisplay = document.getElementById("hour-display");
    const hourLabel = document.getElementById("hour-label");

    if (hourDisplay) {
        hourDisplay.innerHTML = highlightText(hourGZ);
        hourDisplay.className = "text-2xl font-serif tracking-widest";
    }
    if (hourLabel) {
        hourLabel.innerHTML = "\u65f6\u67f1";
        hourLabel.className = "text-[10px] text-ink opacity-40 mt-2 font-serif";
    }

    closeHourPicker();
}

function updateHourDisplay() {
    const hourDisplay = document.getElementById("hour-display");
    const hourLabel = document.getElementById("hour-label");

    if (!state.calendar.selectedData || state.calendar.selectedHour === null) {
        if (hourDisplay) {
            hourDisplay.innerHTML = '<span class="font-bold">\u672a\u9009</span>';
            hourDisplay.className = "text-2xl font-serif tracking-widest text-inkLight/30";
        }
        if (hourLabel) {
            hourLabel.innerHTML = "\u65f6\u67f1";
            hourLabel.className = "text-[10px] text-ink opacity-40 mt-2 font-serif";
        }
        return;
    }

    selectHour(state.calendar.selectedHour);
}

function renderGridHtml(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = "";
    for (let i = 0; i < firstDay; i++) html += "<div></div>";
    for (let d = 1; d <= daysInMonth; d++) {
        const currentStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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
        return `<div class="h-full min-h-[400px] flex flex-col items-center justify-center text-inkLight opacity-40 border border-dashed border-border rounded-2xl animate-fade-slow bg-white/40"><div class="mb-4 text-inkLight"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><span class="text-sm tracking-widest font-serif">\u8bf7\u9009\u62e9\u65e5\u671f\u67e5\u770b\u65f6\u4ee4</span></div>`;
    }
    const dayNum = info.solar_date.split("-")[2];
    const yearMonth = info.solar_date.substring(0, 7).replace("-", ".");

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
                <div class="flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-all duration-200"><span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Year</span><span class="text-2xl font-serif tracking-widest">${highlightText(info.gz_year)}</span><span class="text-[10px] text-ink opacity-40 mt-2 font-serif">\u5e74\u67f1</span></div>
                <div class="flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-all duration-200"><span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Month</span><span class="text-2xl font-serif tracking-widest">${highlightText(info.gz_month)}</span><span class="text-[10px] text-ink opacity-40 mt-2 font-serif">\u6708\u67f1</span></div>
                <div class="flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white transition-all duration-200"><span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Day</span><span class="text-2xl font-serif tracking-widest">${highlightText(info.gz_day)}</span><span class="text-[10px] text-ink opacity-40 mt-2 font-serif">\u65e5\u67f1</span></div>
                
                <div id="hour-card" class="relative flex flex-col items-center bg-white/60 py-3 rounded-2xl border border-border/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white hover:border-accent/40 transition-all duration-200 cursor-pointer group" onclick="toggleHourPicker(event)">
                    <span class="text-[9px] text-inkLight opacity-50 mb-2 tracking-widest uppercase font-sans">Hour</span>
                    <span id="hour-display" class="text-2xl font-serif tracking-widest text-inkLight/30"><span class="font-bold">\u672a\u9009</span></span>
                    <span id="hour-label" class="text-[10px] text-ink opacity-40 mt-2 font-serif">\u65f6\u67f1</span>
                    <div class="absolute top-2 right-2 text-inkLight opacity-10 group-hover:text-accent group-hover:opacity-100 transition-all"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
                    <div id="hour-picker-panel" class="hidden opacity-0 fixed bg-white/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl transition-all duration-300 w-[240px] z-[100]">
                        <ul class="max-h-[300px] overflow-y-auto no-scrollbar py-2">
                        ${(() => {
                            const dayGan = info.gz_day[0];
                            const startIdx = CALENDAR_START_MAP[dayGan] || 0;
                            return CALENDAR_ZHI_LIST.map((zhi, idx) => {
                                const ganIdx = (startIdx + idx) % 10;
                                const hourGZ = CALENDAR_GAN_LIST[ganIdx] + zhi;
                                return `<li onclick="selectHour(${idx}); event.stopPropagation();" class="px-5 py-3 cursor-pointer transition-all duration-200 text-ink hover:bg-accent/5"><div class="flex items-center justify-between"><span class="font-serif text-lg">${highlightText(hourGZ)}</span><span class="text-[10px] opacity-50 font-sans">${zhi}\u65f6 ${CALENDAR_TIME_RANGES[idx]}</span></div></li>`;
                            }).join("");
                        })()}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="pt-4 border-t border-border/30 flex justify-between items-center z-10">
            <div class="text-xs font-medium text-ink/80 tracking-[0.15em] bg-sidebar/40 px-4 py-1.5 rounded-full border border-border/40">\u519c\u5386 ${info.lunar_str}</div>
            <div class="text-[10px] text-inkLight opacity-40 font-serif tracking-widest italic">Seasonal Rhythm</div>
        </div>
    </div>`;
}

function getCalendarPageHtml() {
    const viewDate = state.calendar.viewDate;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const weekDays = ["\u65e5", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d"];

    let yearListHtml = "";
    for (let y = 1900; y <= 2100; y++) {
        const isSelected = y === year;
        const itemClass = isSelected ? "bg-accent text-white font-bold" : "text-ink hover:bg-black/5";
        yearListHtml += `<li onclick="selectYear(${y})" class="px-4 py-2 cursor-pointer transition-colors text-center ${itemClass}">${y}\u5e74</li>`;
    }

    let monthListHtml = "";
    for (let m = 0; m < 12; m++) {
        const isSelected = m === month;
        const itemClass = isSelected ? "bg-accent text-white font-bold" : "text-ink hover:bg-black/5";
        monthListHtml += `<li onclick="selectMonth(${m})" class="px-4 py-2 cursor-pointer transition-colors text-center ${itemClass}">${m + 1}\u6708</li>`;
    }

    const gridContent = renderGridHtml(year, month);
    const rightPanelContent = renderRightPanelHtml(state.calendar.selectedData);

    return `
        <div class="p-8 lg:p-16 animate-fade-slow pb-6 h-full flex flex-col">
            <div class="flex items-end justify-between border-b border-border/30 pb-4 mb-12">
                <h2 class="text-3xl font-light text-ink tracking-wider">\u65f6\u4ee4</h2>
                <div class="relative group">
                    <button id="calendar-copy-btn" onclick="handleCopyCalendarInfo()" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200">
                        ${ICONS.copy}
                    </button>
                    <div id="calendar-copy-label" class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                        \u590d\u5236
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
                    </div>
                </div>
            </div>
            <div class="flex flex-col lg:flex-row gap-8 max-w-[1000px] mx-auto w-full lg:h-[420px]">
                <div class="w-full max-w-[360px] flex-shrink-0 mx-auto lg:mx-0 relative z-10 flex flex-col h-[420px]">
                    <div class="flex justify-between items-center mb-6 px-2">
                        <button onclick="changeMonth(-1)" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <div onclick="toggleYearMenu(event)" class="flex items-center justify-between w-[110px] bg-white/40 hover:bg-white/70 border border-border/30 rounded-lg shadow-sm px-3 py-1 cursor-pointer transition-all duration-200 group select-none"><span id="cal-year-text" class="font-serif text-lg text-ink tracking-widest">${year}\u5e74</span><div class="text-inkLight group-hover:text-accent transition-all duration-200"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div>
                                <div id="year-dropdown-menu" class="hidden absolute top-full left-0 mt-2 w-full max-h-[240px] overflow-y-auto bg-white/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-50 text-sm no-scrollbar"><ul id="year-list-ul">${yearListHtml}</ul></div>
                            </div>
                            <div class="relative">
                                <div onclick="toggleMonthMenu(event)" class="flex items-center justify-between w-[90px] bg-white/40 hover:bg-white/70 border border-border/30 rounded-lg shadow-sm px-3 py-1 cursor-pointer transition-all duration-200 group select-none"><span id="cal-month-text" class="font-serif text-lg text-ink tracking-widest">${month + 1}\u6708</span><div class="text-inkLight group-hover:text-accent transition-all duration-200"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div>
                                <div id="month-dropdown-menu" class="hidden absolute top-full left-0 mt-2 w-full max-h-[240px] overflow-y-auto bg-white/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-50 text-sm no-scrollbar"><ul id="month-list-ul">${monthListHtml}</ul></div>
                            </div>
                        </div>
                        <button onclick="changeMonth(1)" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                    </div>
                    <div class="grid grid-cols-7 gap-2 mb-2 text-center pb-2">${weekDays.map((d) => `<div class="text-xs text-inkLight opacity-40 py-1 font-sans">${d}</div>`).join("")}</div>
                    <div id="cal-grid-container" class="grid grid-cols-7 gap-3 content-start relative z-0 h-[280px]">${gridContent}</div>
                </div>
                <div id="cal-right-panel" class="flex-1 w-full lg:w-auto transition-opacity duration-300">${rightPanelContent}</div>
            </div>
        </div>`;
}
