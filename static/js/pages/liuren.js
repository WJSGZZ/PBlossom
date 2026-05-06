const LIUREN_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const LIUREN_MONTH_GENERALS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const LIUREN_WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function toDatetimeLocalValue(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[char]));
}

function requestLiurenLocation() {
    if (!navigator.geolocation) {
        state.liuren.locationStatus = "denied";
        renderMain();
        return;
    }
    if (state.liuren.locationStatus === "granted" || state.liuren.locationStatus === "loading") return;
    state.liuren.locationStatus = "loading";
    renderMain();
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.liuren.longitude = pos.coords.longitude;
            state.liuren.locationStatus = "granted";
            renderMain();
        },
        () => {
            state.liuren.longitude = null;
            state.liuren.locationStatus = "denied";
            renderMain();
        },
        { timeout: 8000, maximumAge: 300000 }
    );
}

function openLiurenAdvanced() {
    state.liuren.form = collectLiurenForm();
    state.liuren.advancedOpen = !state.liuren.advancedOpen;
    state.liuren.dropdownOpen = null;
    renderMain();
}

function collectLiurenForm() {
    const questionEl = document.getElementById("liuren-question");
    const datetimeEl = document.getElementById("liuren-datetime");
    const monthGeneralEl = document.getElementById("liuren-month-general");
    const hourBranchEl = document.getElementById("liuren-hour-branch");
    const nobleModeEl = document.getElementById("liuren-noble-mode");
    return {
        question: questionEl ? questionEl.value : "",
        datetime_local: datetimeEl ? buildLiurenDateValue(parseLiurenDate(datetimeEl.value)) : toDatetimeLocalValue(),
        month_general: monthGeneralEl ? monthGeneralEl.value : "",
        hour_branch: hourBranchEl ? hourBranchEl.value : "",
        noble_mode: nobleModeEl ? nobleModeEl.value : "",
    };
}

function setLiurenNow() {
    state.liuren.form = Object.assign({}, collectLiurenForm(), {datetime_local: toDatetimeLocalValue()});
    state.liuren.datePickerOpen = false;
    renderMain();
}

function updateLiurenQuestion(val) {
    if (!state.liuren.result) return;
    const old = state.liuren.result.question || "暂未填写";
    state.liuren.result.question = val;
    if (state.liuren.result.report_text) {
        state.liuren.result.report_text = state.liuren.result.report_text.replace(
            `问事：${old}`, `问事：${val || "暂未填写"}`
        );
    }
    const hid = state.liuren.result._historyId;
    if (hid != null) {
        const rec = state.history.find(r => r.id === hid);
        if (rec) {
            rec.question = val;
            rec.liuren_result = state.liuren.result;
            localStorage.setItem("pblossom_history", JSON.stringify(state.history));
        }
    }
}

function resetLiurenPage() {
    state.liuren.result = null;
    state.liuren.form = null;
    state.liuren.advancedOpen = false;
    state.liuren.datePickerOpen = false;
    state.liuren.pickerView = null;
    renderMain();
}

function liurenPad(num) {
    return String(num).padStart(2, "0");
}

function parseLiurenDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/) || text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
    const now = new Date();
    return match
        ? {year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5])}
        : {year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes()};
}

function buildLiurenDateValue(parts) {
    const maxDay = new Date(parts.year, parts.month, 0).getDate();
    const day = Math.min(parts.day, maxDay);
    return `${parts.year}-${liurenPad(parts.month)}-${liurenPad(day)}T${liurenPad(parts.hour)}:${liurenPad(parts.minute)}`;
}

function formatLiurenDateDisplay(value) {
    const p = parseLiurenDate(value);
    return `${p.year}/${liurenPad(p.month)}/${liurenPad(p.day)} ${liurenPad(p.hour)}:${liurenPad(p.minute)}`;
}

function selectLiurenDateTextSegment(input, event) {
    const pos = input.selectionStart ?? 0;
    const ranges = [
        [0, 4],
        [5, 7],
        [8, 10],
        [11, 13],
        [14, 16],
    ];
    const range = ranges.find(([start, end]) => pos <= end) || ranges[ranges.length - 1];
    setTimeout(() => input.setSelectionRange(range[0], range[1]), 0);
}

function normalizeLiurenDateInput(input) {
    input.value = formatLiurenDateDisplay(input.value);
    state.liuren.form = collectLiurenForm();
}

function toggleLiurenDatePicker(event) {
    event.stopPropagation();
    state.liuren.form = collectLiurenForm();
    const parts = parseLiurenDate(state.liuren.form.datetime_local);
    state.liuren.pickerView = state.liuren.pickerView || {year: parts.year, month: parts.month};
    state.liuren.datePickerOpen = !state.liuren.datePickerOpen;
    renderMain();
}

function closeLiurenDatePicker(shouldRender = true) {
    if (!state.liuren || !state.liuren.datePickerOpen) return;
    state.liuren.datePickerOpen = false;
    if (shouldRender) renderMain();
}

function toggleLiurenDropdown(key, event) {
    event.stopPropagation();
    state.liuren.form = collectLiurenForm();
    state.liuren.dropdownOpen = state.liuren.dropdownOpen === key ? null : key;
    renderMain();
}

function selectLiurenDropdown(key, value) {
    const form = collectLiurenForm();
    form[key] = value;
    state.liuren.form = form;
    state.liuren.dropdownOpen = null;
    renderMain();
}

function closeLiurenDropdown(shouldRender = true) {
    if (!state.liuren || !state.liuren.dropdownOpen) return;
    state.liuren.dropdownOpen = null;
    if (shouldRender) renderMain();
}

function toggleLiurenTimePart(part, event) {
    event.stopPropagation();
    state.liuren.form = collectLiurenForm();
    state.liuren.timePartOpen = state.liuren.timePartOpen === part ? null : part;
    renderMain();
}

function closeLiurenTimePart(shouldRender = true) {
    if (!state.liuren || !state.liuren.timePartOpen) return;
    state.liuren.timePartOpen = null;
    if (shouldRender) renderMain();
}

function selectLiurenTimePart(part, value) {
    const form = collectLiurenForm();
    const current = parseLiurenDate(form.datetime_local);
    current[part] = Number(value);
    form.datetime_local = buildLiurenDateValue(current);
    state.liuren.form = form;
    state.liuren.timePartOpen = null;
    renderMain();
}

function shiftLiurenPickerMonth(offset) {
    const form = collectLiurenForm();
    const current = state.liuren.pickerView || parseLiurenDate(form.datetime_local);
    const next = new Date(current.year, current.month - 1 + offset, 1);
    state.liuren.form = form;
    state.liuren.pickerView = {year: next.getFullYear(), month: next.getMonth() + 1};
    state.liuren.datePickerOpen = true;
    renderMain();
}

function setLiurenDateField(field, value) {
    const form = collectLiurenForm();
    const parts = parseLiurenDate(form.datetime_local);
    parts[field] = Number(value);
    form.datetime_local = buildLiurenDateValue(parts);
    state.liuren.form = form;
    state.liuren.datePickerOpen = true;
    renderMain();
}

function selectLiurenDay(year, month, day) {
    const form = collectLiurenForm();
    const parts = parseLiurenDate(form.datetime_local);
    form.datetime_local = buildLiurenDateValue({year, month, day, hour: parts.hour, minute: parts.minute});
    state.liuren.form = form;
    state.liuren.pickerView = {year, month};
    state.liuren.datePickerOpen = true;
    renderMain();
}

function renderLiurenCalendarDays(parts, view) {
    const first = new Date(view.year, view.month - 1, 1);
    const daysInMonth = new Date(view.year, view.month, 0).getDate();
    const prevDays = new Date(view.year, view.month - 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i += 1) {
        cells.push({day: prevDays - first.getDay() + i + 1, muted: true});
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push({day, year: view.year, month: view.month, current: true});
    }
    while (cells.length % 7 !== 0) {
        cells.push({day: cells.length - first.getDay() - daysInMonth + 1, muted: true});
    }
    return cells.map((cell) => {
        const selected = cell.current && parts.year === cell.year && parts.month === cell.month && parts.day === cell.day;
        return `
            <button type="button" ${cell.current ? `onclick="selectLiurenDay(${cell.year}, ${cell.month}, ${cell.day})"` : ""}
                class="h-8 rounded-lg text-sm transition-colors ${selected ? "bg-accent text-white" : cell.current ? "text-ink hover:bg-white/70" : "text-inkLight/35"}">
                ${cell.day}
            </button>`;
    }).join("");
}

function renderLiurenTimeColumn(field, value, max) {
    return `
        <div class="h-56 overflow-y-auto no-scrollbar rounded-xl bg-white/35 p-1">
            ${Array.from({length: max}, (_, item) => `
                <button type="button" onclick="setLiurenDateField('${field}', ${item})"
                    class="w-full h-8 rounded-lg text-sm transition-colors ${Number(value) === item ? "bg-accent text-white" : "text-inkLight hover:bg-white/70 hover:text-ink"}">
                    ${liurenPad(item)}
                </button>
            `).join("")}
        </div>`;
}

function renderLiurenDatePickerPanel(current) {
    if (!state.liuren.datePickerOpen) return "";
    const parts = parseLiurenDate(current);
    const view = state.liuren.pickerView || {year: parts.year, month: parts.month};
    return `
        <div class="absolute left-0 top-full z-50 mt-3 w-[560px] rounded-2xl border border-border/55 bg-bg/95 shadow-2xl p-4" onclick="event.stopPropagation()">
            <div class="grid grid-cols-[1fr_140px] gap-4">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-sm text-ink tracking-wide">${view.year}年${liurenPad(view.month)}月</div>
                        <div class="flex gap-1">
                            <button type="button" onclick="shiftLiurenPickerMonth(-1)" class="w-8 h-8 rounded-lg text-inkLight hover:text-ink hover:bg-white/70">‹</button>
                            <button type="button" onclick="shiftLiurenPickerMonth(1)" class="w-8 h-8 rounded-lg text-inkLight hover:text-ink hover:bg-white/70">›</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-7 gap-1 mb-1 text-center text-xs text-inkLight">
                        ${LIUREN_WEEKDAYS.map((day) => `<div class="h-7 leading-7">${day}</div>`).join("")}
                    </div>
                    <div class="grid grid-cols-7 gap-1">
                        ${renderLiurenCalendarDays(parts, view)}
                    </div>
                    <div class="flex justify-between mt-3 text-sm">
                        <button type="button" onclick="setLiurenNow()" class="text-accent hover:text-ink">今天</button>
                        <button type="button" onclick="closeLiurenDatePicker()" class="text-inkLight hover:text-ink">完成</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 border-l border-border/45 pl-4">
                    ${renderLiurenTimeColumn("hour", parts.hour, 24)}
                    ${renderLiurenTimeColumn("minute", parts.minute, 60)}
                </div>
            </div>
        </div>`;
}

function renderLiurenDateControl(current) {
    const value = buildLiurenDateValue(parseLiurenDate(current));
    return `
        <div class="relative flex gap-2 items-center">
            <input id="liuren-datetime" type="datetime-local" value="${value}" onchange="state.liuren.form = collectLiurenForm();" class="liuren-datetime-input flex-1">
            <button type="button" onclick="setLiurenNow()" class="h-12 px-5 rounded-xl bg-white/50 text-xs text-inkLight hover:text-ink hover:bg-white/70 transition-colors whitespace-nowrap">现在</button>
        </div>
    `;
}

function openLiurenNativeDatePicker(event) {
    event.stopPropagation();
    const input = document.getElementById("liuren-datetime");
    if (!input) return;
    if (typeof input.showPicker === "function") {
        input.showPicker();
    } else {
        input.focus();
        input.click();
    }
}

async function handleLiurenSubmit() {
    const questionEl = document.getElementById("liuren-question");
    const datetimeEl = document.getElementById("liuren-datetime");
    const monthGeneralEl = document.getElementById("liuren-month-general");
    const hourBranchEl = document.getElementById("liuren-hour-branch");
    const nobleModeEl = document.getElementById("liuren-noble-mode");

    if (!datetimeEl || !datetimeEl.value) {
        showToast("请选择排盘时间");
        return;
    }

    const btn = document.getElementById("liuren-submit");
    const oldHtml = btn ? btn.innerHTML : "";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>`;
    }

    try {
        const res = await fetch("/api/liuren", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                question: questionEl ? questionEl.value.trim() : "",
                datetime_local: buildLiurenDateValue(parseLiurenDate(datetimeEl.value)),
                timezone_offset_minutes: new Date().getTimezoneOffset(),
                longitude: state.liuren.longitude ?? null,
                location_attempted: state.liuren.locationStatus != null,
                overrides: {
                    month_general: monthGeneralEl && monthGeneralEl.value ? monthGeneralEl.value : null,
                    hour_branch: hourBranchEl && hourBranchEl.value ? hourBranchEl.value : null,
                    noble_mode: nobleModeEl && nobleModeEl.value ? nobleModeEl.value : null,
                },
            }),
        });
        const json = await res.json();
        if (json.status === "success") {
            const data = json.data;
            const record = {
                type: "liuren",
                id: Date.now(),
                title: (data.liuren.course_types && data.liuren.course_types.length) ? data.liuren.course_types[0] : "六壬",
                question: data.question || "",
                solar: data.calendar.solar,
                ganzhi: data.calendar.ganzhi,
                liuren_result: data,
            };
            state.liuren.result = data;
            state.liuren.result._historyId = record.id;
            state.liuren.form = collectLiurenForm();
            state.history.unshift(record);
            localStorage.setItem("pblossom_history", JSON.stringify(state.history));
            renderMain();
        } else {
            showToast(json.message || "排盘失败");
        }
    } catch (error) {
        console.error(error);
        showToast("排盘失败，请重试");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    }
}

async function copyLiurenReport() {
    if (!state.liuren.result) return;
    try {
        await navigator.clipboard.writeText(state.liuren.result.report_text);
        showToast("排盘已复制");
    } catch (error) {
        console.error(error);
        showToast("复制失败，请重试");
    }
}

function downloadLiurenReport() {
    if (!state.liuren.result) return;
    const data = state.liuren.result;
    const filename = `${data.calendar.solar.replace(/[-: ]/g, "").slice(0, 12)}_liuren.txt`;
    downloadReport(filename, data.report_text);
}

function liurenSelectOptions(items, selected, placeholder) {
    return `<option value="">${placeholder}</option>` + items.map((item) => `<option value="${item}" ${item === selected ? "selected" : ""}>${item}</option>`).join("");
}

function renderLiurenDropdown(key, selected, placeholder, items, mode = "grid") {
    return renderDesignSelect({
        id: `liuren-${key.replace("_", "-")}`,
        value: selected || "",
        placeholder,
        options: items,
        widthClass: "w-full",
        menuClass: mode === "grid" ? "max-h-[18rem]" : "max-h-[13rem]",
    });
}

function renderInfoPills(items) {
    return `<div class="flex flex-wrap gap-1.5">${items.map((item) => `<span class="px-2.5 py-1 rounded-full bg-white/50 border border-border/40 text-xs text-inkLight whitespace-nowrap">${item}</span>`).join("")}</div>`;
}

function renderInfoGroup(title, items) {
    return `
        <div class="flex items-center gap-2 min-w-0">
            <span class="text-[10px] text-inkLight/60 tracking-[0.2em] shrink-0">${title}</span>
            <div class="flex flex-wrap gap-1.5 min-w-0">
                ${items.map((item) => `<span class="px-2.5 py-1 rounded-full text-xs text-inkLight/80 whitespace-nowrap" style="background:rgba(252,248,242,0.80);border:1px solid rgba(208,198,185,0.40)">${item}</span>`).join("")}
            </div>
        </div>`;
}

function liurenPlateItem(items, earth) {
    return items.find((item) => item.earth === earth) || {earth, heaven: "", general: ""};
}

function renderPlateCell(item, extra = "") {
    return `
        <div class="liuren-plate-cell ${extra}">
            <div class="text-[11px] text-accent font-bold h-4">${item.general || ""}</div>
            <div class="text-[12px] text-inkLight">${item.earth}宫</div>
            <div class="text-[28px] leading-none">${colorizeGanZhi(item.heaven)}</div>
        </div>`;
}

function renderLiurenStemBranch(text, isEmpty = false) {
    const value = String(text || "");
    if (isEmpty && value.startsWith("空")) {
        return `<span class="text-inkLight/45 font-bold">空</span>${colorizeGanZhi(value.slice(1))}`;
    }
    return colorizeGanZhi(value);
}

function renderTraditionalPlate(items, liuren) {
    const by = (earth) => liurenPlateItem(items, earth);
    return `
        <div class="liuren-panel rounded-2xl p-4 h-full flex flex-col">
            <div class="text-xs text-inkLight tracking-[0.22em] mb-3 shrink-0">天地盘 / 十二天将</div>
            <div class="grid grid-cols-4 grid-rows-4 gap-2 flex-1 min-h-0">
                ${["巳", "午", "未", "申"].map((earth) => renderPlateCell(by(earth))).join("")}
                ${renderPlateCell(by("辰"))}
                <div class="liuren-center-accent col-span-2 row-span-2 rounded-xl flex flex-col items-center justify-center text-center px-3">
                    <div class="text-[11px] text-inkLight tracking-[0.25em] mb-2">月将加占时</div>
                    <div class="text-xl text-ink">${colorizeGanZhi(`${liuren.month_general}临${liuren.hour_branch}`)}</div>
                </div>
                ${renderPlateCell(by("酉"))}
                ${renderPlateCell(by("卯"))}
                ${renderPlateCell(by("戌"))}
                ${["寅", "丑", "子", "亥"].map((earth) => renderPlateCell(by(earth))).join("")}
            </div>
        </div>`;
}

function renderCompactLessons(items, fill = false) {
    const displayItems = items.slice().reverse();
    return `
        <div class="grid grid-cols-4 gap-2 ${fill ? "h-full" : ""}">
            ${displayItems.map((item) => `
                <div class="liuren-inner-card px-3 py-4 text-center ${fill ? "h-full" : "h-48"} flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-inkLight/70 tracking-[0.22em]">${item.name}</span>
                        <span class="text-[11px] text-accent font-bold">${item.general || ""}</span>
                    </div>
                    <div>
                        <div class="text-3xl leading-none">${colorizeGanZhi(item.upper)}</div>
                        <div class="text-[10px] text-inkLight/50 my-3 tracking-widest">临</div>
                        <div class="text-3xl leading-none">${colorizeGanZhi(item.subject || item.lower)}</div>
                    </div>
                    <div class="text-[11px] text-inkLight/65 leading-none whitespace-nowrap">${item.relation}</div>
                </div>
            `).join("")}
        </div>`;
}

function renderCompactTransmissions(items, fill = false) {
    const card = (item) => `
        <div class="liuren-inner-card relative px-4 py-4 ${fill ? "h-full" : "h-36"} flex flex-col justify-between min-w-0">
            <div class="flex items-center justify-between">
                <span class="text-[10px] text-inkLight/70 tracking-[0.22em]">${item.name}</span>
                <span class="text-[11px] text-accent font-bold">${item.general || ""}</span>
            </div>
            <div class="text-4xl leading-none">${renderLiurenStemBranch(item.display || item.ganzhi, item.is_empty)}</div>
            <div class="flex items-center justify-between">
                <div class="text-[11px] text-inkLight/70">${item.six_relative}</div>
                <div class="text-[11px] text-inkLight/70">${item.element}</div>
            </div>
        </div>`;
    return `
        <div class="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)] gap-2 items-stretch ${fill ? "h-full" : ""}">
            ${items.map((item, index) => `
                ${card(item)}
                ${index < items.length - 1 ? `<div class="flex items-center justify-center text-inkLight/35 text-base">›</div>` : ""}
            `).join("")}
        </div>`;
}

function renderLiurenResult(result) {
    if (!result) {
        return `
            <div class="h-full min-h-[360px] flex items-center justify-center text-inkLight opacity-30 tracking-widest">
                输入时间与问事后生成排盘
            </div>`;
    }
    const cal = result.calendar;
    const lr = result.liuren;
    return `
        <div class="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
            <div class="grid grid-cols-[minmax(0,1fr)_380px] gap-4 shrink-0">
                <section class="liuren-panel rounded-2xl px-5 py-4">
                    <div class="grid grid-cols-[minmax(280px,0.68fr)_1fr] gap-5 items-center">
                        <div class="min-w-0 border-r border-border/25 pr-5">
                            <div class="text-[10px] text-inkLight/70 tracking-[0.28em] mb-1">时间信息</div>
                            <div class="text-2xl xl:text-3xl text-ink tracking-wide whitespace-nowrap">${colorizeGanZhi(cal.ganzhi.replace(/[年月日时]/g, ""))}</div>
                            <div class="mt-3 text-[11px] text-inkLight/75 leading-5 whitespace-nowrap">
                                <div>${escapeHtml(cal.solar)}${cal.true_solar_time ? ` <span class="text-inkLight/40">北京时间</span>` : ""}</div>
                                ${cal.true_solar_time
                                    ? `<div>${escapeHtml(cal.true_solar_time)} <span class="text-inkLight/40">真太阳时 东经${cal.longitude}°</span></div>`
                                    : cal.location_failed
                                    ? `<div class="text-inkLight/35">无法获取真太阳时</div>`
                                    : ""}
                                <div>${escapeHtml(cal.lunar)}</div>
                            </div>
                        </div>
                        <div class="min-w-0 grid grid-cols-1 gap-2 content-center">
                            ${renderInfoGroup("节气", [cal.jieqi_prev, cal.jieqi_next])}
                            ${renderInfoGroup("起课", [`月将 ${lr.month_general} 将${lr.month_general_overridden ? "（覆写）" : "（系统）"}`, `占时 ${lr.hour_branch} 时`, `${lr.noble_mode} ${lr.noble_branch}`, `课体 ${(lr.course_types && lr.course_types.length) ? lr.course_types.join(" / ") : "未识别"}`])}
                            ${renderInfoGroup("旬遁", [`旬空 ${lr.empty_branches}`, `${lr.xun}旬`])}
                        </div>
                    </div>
                </section>
                <section class="liuren-panel rounded-2xl px-6 py-4 flex flex-col justify-center">
                    <div class="min-w-0 w-full group">
                        <div class="text-[10px] text-inkLight/70 tracking-[0.28em] mb-2">问事</div>
                        <input type="text"
                            value="${escapeAttr(result.question || '')}"
                            oninput="updateLiurenQuestion(this.value)"
                            placeholder="暂未填写"
                            class="w-full bg-transparent border-b border-transparent group-hover:border-border/40 focus:border-accent/50 outline-none text-base text-inkLight font-serif tracking-wide placeholder:text-inkLight/30 transition-all py-0.5">
                    </div>
                </section>
            </div>

            <div class="grid grid-cols-[minmax(360px,0.9fr)_1.1fr] gap-4 flex-1 min-h-0">
                <section class="min-h-0">
                    ${renderTraditionalPlate(lr.twelve_generals, lr)}
                </section>
                <section class="min-h-0 overflow-hidden flex flex-col gap-4">
                    <div class="liuren-panel rounded-2xl p-4 shrink-0">
                        <div class="text-[10px] text-inkLight/70 tracking-[0.25em] mb-3">四課</div>
                        ${renderCompactLessons(lr.four_lessons, false)}
                    </div>
                    <div class="liuren-panel rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
                        <div class="text-[10px] text-inkLight/70 tracking-[0.25em] mb-3">三传</div>
                        <div class="flex-1 min-h-0">
                            ${renderCompactTransmissions(lr.three_transmissions, true)}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    `;
}

function getLiurenPageHtml() {
    const result = state.liuren.result;
    const form = state.liuren.form || {};
    const current = form.datetime_local || (result ? result.calendar.solar.replace(" ", "T") : toDatetimeLocalValue());
    const question = form.question ?? (result ? result.question : "");
    const lr = result ? result.liuren : {};
    const advanced = state.liuren.advancedOpen;

    if (!result) {
        return `
            <div class="h-full overflow-hidden p-8 lg:p-16">
                <div class="h-full flex flex-col overflow-hidden">
                    <div class="flex items-center gap-3 border-b border-border/30 pb-4 shrink-0">
                        ${renderPageTitle("六壬", {beta: true})}
                    </div>
                    <div class="flex-1 min-h-0 flex items-center justify-center">
                        <section class="bg-white/40 border border-border/50 rounded-xl p-7 h-[340px] max-w-full transition-[width] duration-200 ${advanced ? "w-[720px]" : "w-[520px]"}">
                            <div class="h-full ${advanced ? "md:grid md:grid-cols-[1fr_220px] md:gap-6" : ""}">
                                <div class="h-full flex flex-col justify-between">
                                    <label class="block">
                                        <span class="text-xs text-inkLight tracking-[0.2em]">问事</span>
                                        <input id="liuren-question" value="${escapeHtml(question)}" placeholder="输入你想知道的事情" class="mt-2 w-full bg-transparent border-b border-border/60 focus:border-accent outline-none py-2 text-ink">
                                    </label>
                                    <label class="block">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="text-xs text-inkLight tracking-[0.2em]">时间</span>
                                            ${(() => {
                                                const ls = state.liuren.locationStatus;
                                                const pin = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
                                                if (ls === "granted") return `<span class="flex items-center gap-1 text-xs text-inkLight/70">${pin}东经 ${state.liuren.longitude.toFixed(1)}° 真太阳时</span>`;
                                                if (ls === "loading")  return `<span class="flex items-center gap-1 text-xs text-inkLight/40">${pin}定位中…</span>`;
                                                if (ls === "denied")   return `<span class="flex items-center gap-1 text-xs text-inkLight/35">${pin}无法定位</span>`;
                                                return "";
                                            })()}
                                        </div>
                                        <div>
                                            ${renderLiurenDateControl(current)}
                                        </div>
                                    </label>
                                    <div class="flex gap-3">
                                        <button onclick="openLiurenAdvanced()" class="h-11 px-5 rounded-xl bg-white/50 border border-border/40 text-sm text-inkLight hover:text-ink hover:bg-white/70 transition-colors whitespace-nowrap">${advanced ? "收起" : "高级"}</button>
                                        <button id="liuren-submit" onclick="handleLiurenSubmit()" class="flex-1 h-11 rounded-xl bg-accent text-white flex items-center justify-center hover:opacity-90 transition-opacity">
                                            排盘
                                        </button>
                                    </div>
                                </div>
                                <div class="${advanced ? "mt-5 md:mt-0 h-full flex flex-col justify-between md:border-l md:border-border/30 md:pl-6" : "hidden"}">
                                    <label class="block">
                                        <span class="text-xs text-inkLight">月将</span>
                                        <div class="mt-2">
                                            ${renderLiurenDropdown("month_general", form.month_general || "", "系统选将", [{value: "", label: "系统"}].concat(LIUREN_MONTH_GENERALS.map((item) => ({value: item, label: item}))))}
                                        </div>
                                    </label>
                                    <label class="block">
                                        <span class="text-xs text-inkLight">占时</span>
                                        <div class="mt-2">
                                            ${renderLiurenDropdown("hour_branch", form.hour_branch || "", "系统取时", [{value: "", label: "系统"}].concat(LIUREN_BRANCHES.map((item) => ({value: item, label: item}))))}
                                        </div>
                                    </label>
                                    <label class="block">
                                        <span class="text-xs text-inkLight">贵人</span>
                                        <div class="mt-2">
                                            ${renderLiurenDropdown("noble_mode", form.noble_mode || "", "系统判断昼夜", [
                                                {value: "", label: "系统判断"},
                                            {value: "day", label: "昼贵"},
                                            {value: "night", label: "夜贵"},
                                            ], "list")}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="h-full p-8 lg:p-16 animate-fade-slow">
            <div class="h-full max-w-[1720px] mx-auto flex flex-col">
                <div class="flex items-end justify-between border-b border-border/30 pb-4 mb-6 shrink-0">
                    ${renderPageTitle("六壬", {beta: true})}
                    ${renderHeaderActionButton({icon: ICONS.export, label: "导出", onClick: "downloadLiurenReport()", disabled: !result})}
                </div>

                <section class="flex-1 min-h-0 overflow-hidden">
                    ${renderLiurenResult(result)}
                </section>
            </div>
        </div>
    `;
}
