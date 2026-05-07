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
    if (state.calendar.selectedData?.gz_hour) return state.calendar.selectedData.gz_hour;
    return "\u672a\u9009";
}

function _equationOfTimeJS(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((date - start) / 86400000);
    const B = (Math.PI / 180) * (360 / 365 * (dayOfYear - 81));
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

function _toTrueSolarTimeJS(date, longitude) {
    const correction = (longitude - 120.0) * 4.0 + _equationOfTimeJS(date);
    return new Date(date.getTime() + correction * 60000);
}

function requestCalendarLocation(callback) {
    if (!navigator.geolocation) {
        state.calendar.locationStatus = "denied";
        if (callback) callback(null);
        return;
    }
    if (state.calendar.locationStatus === "loading") return;
    state.calendar.locationStatus = "loading";
    const indicator = document.getElementById("cal-location-indicator");
    if (indicator) { indicator.className = "text-[9px] text-inkLight/25"; indicator.textContent = "\u5b9a\u4f4d\u4e2d"; }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.calendar.longitude = pos.coords.longitude;
            state.calendar.locationStatus = "granted";
            if (callback) callback(pos.coords.longitude);
        },
        () => {
            state.calendar.longitude = null;
            state.calendar.locationStatus = "denied";
            if (callback) callback(null);
        },
        { timeout: 8000, maximumAge: 300000 }
    );
}

function setCalendarNow() {
    const doCalibrate = (longitude) => {
        const inputEl = document.getElementById("cal-precise-time");
        const timeStr = (inputEl && inputEl.value) ? inputEl.value : state.calendar.preciseTime;
        const now = new Date();
        let sel = state.calendar.selectedDate;
        if (!sel) {
            sel = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
            state.calendar.selectedDate = sel;
            state.calendar.viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
            updateCalendarView();
        }
        let baseDate;
        if (timeStr) {
            const [h, m] = timeStr.split(":").map(Number);
            const [y, mo, d] = sel.split("-").map(Number);
            baseDate = new Date(y, mo - 1, d, h, m, 0);
        } else {
            baseDate = now;
            state.calendar.preciseTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        }
        const tst = (longitude !== null) ? _toTrueSolarTimeJS(baseDate, longitude) : baseDate;
        state.calendar.calibratedTst = `${String(tst.getHours()).padStart(2,"0")}:${String(tst.getMinutes()).padStart(2,"0")}`;
        _fetchCalendarData(sel);
    };
    if (state.calendar.locationStatus === "granted") {
        doCalibrate(state.calendar.longitude);
    } else {
        requestCalendarLocation((lon) => doCalibrate(lon));
    }
}

async function clearPreciseTime() {
    state.calendar.preciseTime = null;
    state.calendar.calibratedTst = null;
    state.calendar.selectedHour = null;
    if (state.calendar.selectedDate) await _fetchCalendarData(state.calendar.selectedDate);
}

function onCalPreciseTimeChange(val) {
    state.calendar.preciseTime = val || null;
    state.calendar.calibratedTst = null;
}

async function onCalPreciseTimeBlur(val) {
    if (!val) { await clearPreciseTime(); return; }
    state.calendar.preciseTime = val;
    state.calendar.calibratedTst = null;
    if (state.calendar.selectedDate) await _fetchCalendarData(state.calendar.selectedDate);
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

function closeAllMenus(shouldRender = true) {
    if (typeof closeDesignSelect === "function") closeDesignSelect(shouldRender);
    if (typeof closeLiurenDatePicker === "function") closeLiurenDatePicker(shouldRender);
    if (typeof closeLiurenDropdown === "function") closeLiurenDropdown(shouldRender);
    if (typeof closeLiurenTimePart === "function") closeLiurenTimePart(shouldRender);
}

function updateDesignSelectDisplay(id, label) {
    const input = document.getElementById(id);
    const container = input?.closest("[data-select-id]");
    const span = container?.querySelector(".design-select-value");
    if (span) { span.textContent = label; span.classList.remove("text-inkLight"); span.classList.add("text-ink"); }
}

function selectYear(val) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(parseInt(val, 10), current.getMonth(), 1);
    updateCalendarView();
    updateDesignSelectDisplay("cal-year-select", `${val}年`);
    closeAllMenus(false);
    return false;
}

function selectMonth(val) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(current.getFullYear(), parseInt(val, 10), 1);
    updateCalendarView();
    updateDesignSelectDisplay("cal-month-select", `${parseInt(val, 10) + 1}月`);
    closeAllMenus(false);
    return false;
}


function jumpCalendarYear(offset) {
    const current = state.calendar.viewDate;
    state.calendar.viewDate = new Date(current.getFullYear() + offset, current.getMonth(), 1);
    updateCalendarView();
}

function goCalendarToday() {
    const today = new Date();
    state.calendar.viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectDate(today);
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
    const yearSelect = document.getElementById("cal-year-select");
    if (yearSelect) yearSelect.value = String(year);
    const monthSelect = document.getElementById("cal-month-select");
    if (monthSelect) monthSelect.value = String(month);
    updateDesignSelectDisplay("cal-year-select", `${year}年`);
    updateDesignSelectDisplay("cal-month-select", `${month + 1}月`);
}

async function _fetchCalendarData(dateStr) {
    const body = { date: dateStr };
    if (state.calendar.calibratedTst) {
        body.time = state.calendar.calibratedTst;
    } else if (state.calendar.preciseTime) {
        body.time = state.calendar.preciseTime;
    }
    try {
        const res = await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.status === "success") {
            state.calendar.selectedData = json.data;
            const rightPanel = document.getElementById("cal-right-panel");
            if (rightPanel) rightPanel.innerHTML = renderRightPanelHtml(json.data);
        }
    } catch (e) {
        console.error(e);
    }
}

async function selectDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    state.calendar.selectedDate = dateStr;
    state.calendar.viewDate = new Date(dateObj);
    if (!state.calendar.preciseTime) state.calendar.selectedHour = null;
    updateCalendarView();
    await _fetchCalendarData(dateStr);
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

function renderYearOptionsHtml(year) {
    let html = "";
    for (let y = 1900; y <= 2100; y++) {
        html += `<option value="${y}" ${y === year ? "selected" : ""}>${y}\u5e74</option>`;
    }
    return html;
}

function renderMonthOptionsHtml(month) {
    let html = "";
    for (let m = 0; m < 12; m++) {
        html += `<option value="${m}" ${m === month ? "selected" : ""}>${m + 1}\u6708</option>`;
    }
    return html;
}

function renderCalendarPillar(label, value, caption = "", extra = "") {
    return `
        <div ${extra} class="relative min-w-0 calendar-pillar-card px-5 py-5 flex flex-col justify-between min-h-[160px] h-full ${extra ? "cursor-pointer calendar-pillar-card-interactive group" : ""}">
            <div class="text-[11px] text-inkLight tracking-[0.22em]">${label}</div>
            <div class="text-3xl font-serif tracking-widest leading-none ${value === "\u672a\u9009" ? "text-inkLight/35" : ""}">${value === "\u672a\u9009" ? value : highlightText(value)}</div>
            <div class="text-xs text-inkLight">${caption}</div>
            ${extra ? `<div class="absolute top-3 right-3 text-inkLight/35 group-hover:text-accent transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div>` : ""}
        </div>`;
}

function renderRightPanelHtml(info) {
    if (!info) {
        return `<div class="h-full min-h-[400px] flex flex-col items-center justify-center text-inkLight/60 border border-dashed border-border/60 rounded-xl bg-white/35"><span class="text-sm tracking-[0.2em]">\u9009\u62e9\u65e5\u671f</span></div>`;
    }
    const dayNum = info.solar_date.split("-")[2];
    const yearMonth = info.solar_date.substring(0, 7).replace("-", ".");
    const preciseTime = state.calendar.preciseTime;

    // Inline location badge next to \u6b64\u523b
    const ls = state.calendar.locationStatus;
    const pin = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.69 2 6 4.69 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.31-2.69-6-6-6z"/><circle cx="12" cy="8" r="2"/></svg>`;
    const locationBadge = (ls === "granted" && state.calendar.longitude !== null)
        ? `<span id="cal-location-indicator" class="flex items-center gap-0.5 text-[9px] text-inkLight/35">${pin}${state.calendar.longitude.toFixed(2)}\u00b0</span>`
        : ls === "loading"
        ? `<span id="cal-location-indicator" class="text-[9px] text-inkLight/25">\u2026</span>`
        : `<span id="cal-location-indicator"></span>`;

    // Hour pillar \u2014 static, same as the other three
    const calibratedTst = state.calendar.calibratedTst;
    const hourVal = ((preciseTime || calibratedTst) && info.gz_hour) ? info.gz_hour : "\u672a\u9009";
    const hourCap = ((preciseTime || calibratedTst) && info.gz_hour) ? `时 ${calibratedTst || info.true_solar_time || preciseTime}` : "";

    return `
    <div class="h-full calendar-main-card p-9 grid grid-rows-[auto_1px_1fr] gap-0">
        <div class="flex items-start justify-between pb-7">
            <div>
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-sm text-inkLight tracking-[0.28em]">\u65f6\u4ee4</span>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center border border-border/50 rounded-md overflow-hidden" style="background:rgba(255,252,247,0.6)">
                            <input type="time" id="cal-precise-time"
                                class="text-[11px] text-inkLight bg-transparent px-1 py-0.5 outline-none focus:outline-none w-[66px]"
                                value="${escapeAttr(preciseTime || '')}"
                                onchange="onCalPreciseTimeChange(this.value)"
                                onblur="onCalPreciseTimeBlur(this.value)"
                                onclick="event.stopPropagation()">
                            <button onclick="setCalendarNow(); event.stopPropagation()"
                                class="text-[10px] text-inkLight/50 hover:text-accent border-l border-border/40 px-2 py-0.5 transition-colors whitespace-nowrap">
                                \u6821\u51c6
                            </button>
                        </div>
                        ${locationBadge}
                    </div>
                </div>
                <div class="flex items-end gap-5">
                    <span class="text-8xl font-serif text-accent leading-none">${dayNum}</span>
                    <div class="pb-3">
                        <div class="text-4xl font-serif text-ink tracking-[0.08em]">${yearMonth}</div>
                        <div class="text-sm text-inkLight mt-2">${info.week}</div>
                    </div>
                </div>
            </div>
            <div class="inline-flex items-center px-3 py-1.5 rounded-full text-xs text-inkLight" style="background:rgba(255,252,247,0.55);border:1px solid rgba(208,198,185,0.28)">\u519c\u5386 ${info.lunar_str}</div>
        </div>
        <div class="border-t border-border/30"></div>
        <div class="pt-10">
            <div class="grid grid-cols-4 gap-5 w-full">
                ${renderCalendarPillar("\u5e74\u67f1", info.gz_year, "\u5e74")}
                ${renderCalendarPillar("\u6708\u67f1", info.gz_month, "\u6708")}
                ${renderCalendarPillar("\u65e5\u67f1", info.gz_day, "\u65e5")}
                ${renderCalendarPillar("\u65f6\u67f1", hourVal, hourCap)}
            </div>
            ${info.jieqi_prev ? `
            <div class="flex items-center justify-end gap-2 text-[11px] text-inkLight/55 mt-5">
                <span class="tracking-widest text-inkLight/40 mr-1">\u8282\u6c14</span>
                <span class="font-medium">${escapeHtml(info.jieqi_prev)}</span>
                <span class="text-inkLight/40">${escapeHtml(info.jieqi_prev_date)}</span>
                <span class="text-inkLight/30 mx-0.5">\u00b7</span>
                <span class="font-medium">${escapeHtml(info.jieqi_next)}</span>
                <span class="text-inkLight/40">${escapeHtml(info.jieqi_next_date)}</span>
            </div>` : ''}
        </div>
    </div>`;
}

function getCalendarPageHtml() {
    const viewDate = state.calendar.viewDate;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const weekDays = ["\u65e5", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d"];

    const yearOptions = Array.from({length: 201}, (_, i) => {
        const y = 1900 + i;
        return {value: String(y), label: `${y}\u5e74`};
    });
    const monthOptions = Array.from({length: 12}, (_, i) => ({value: String(i), label: `${i + 1}\u6708`}));

    const gridContent = renderGridHtml(year, month);
    const rightPanelContent = renderRightPanelHtml(state.calendar.selectedData);

    return `
        <div class="p-8 lg:p-16 animate-fade-slow pb-6 h-full flex flex-col">
            <div class="flex items-end justify-between border-b border-border/30 pb-4 mb-12">
                ${renderPageTitle("\u65f6\u4ee4")}
                ${renderHeaderActionButton({icon: ICONS.copy, label: "\u590d\u5236", onClick: "handleCopyCalendarInfo()", buttonId: "calendar-copy-btn", labelId: "calendar-copy-label"})}
            </div>
            <div class="flex flex-col lg:flex-row gap-10 max-w-[1240px] mx-auto w-full lg:h-[480px] items-stretch">
                <div class="w-full max-w-[430px] flex-shrink-0 mx-auto lg:mx-0 relative z-10 flex flex-col h-[480px]">
                    <div class="flex justify-between items-center mb-5 px-1">
                        <div class="flex items-center gap-1">
                            <button onclick="jumpCalendarYear(-1)" class="w-8 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200" title="\u4e0a\u4e00\u5e74"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg></button>
                            <button onclick="changeMonth(-1)" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200" title="\u4e0a\u4e00\u6708"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                        </div>
                        <div class="flex items-center gap-2">
                            ${renderDesignSelect({id: "cal-year-select", value: String(year), options: yearOptions, callback: "selectYear", widthClass: "w-[126px]"})}
                            ${renderDesignSelect({id: "cal-month-select", value: String(month), options: monthOptions, callback: "selectMonth", widthClass: "w-[92px]"})}
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="changeMonth(1)" class="w-9 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200" title="\u4e0b\u4e00\u6708"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                            <button onclick="jumpCalendarYear(1)" class="w-8 h-9 flex items-center justify-center rounded-xl text-inkLight hover:text-ink hover:bg-white/60 transition-all duration-200" title="\u4e0b\u4e00\u5e74"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 17 11 12 6 7"></polyline><polyline points="13 17 18 12 13 7"></polyline></svg></button>
                        </div>
                    </div>
                    <div class="grid grid-cols-7 gap-3 mb-3 text-center pb-2">${weekDays.map((d) => `<div class="text-xs text-inkLight opacity-40 py-1 font-sans">${d}</div>`).join("")}</div>
                    <div id="cal-grid-container" class="grid grid-cols-7 gap-4 content-start relative z-0 h-[375px]">${gridContent}</div>
                </div>
                <div id="cal-right-panel" class="flex-1 min-w-0 h-full">${rightPanelContent}</div>
            </div>
        </div>`;
}
