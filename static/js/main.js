// static/js/main.js

document.addEventListener("click", function () {
    if (window.activeDeleteId !== null) {
        if (typeof resetDeleteBtnUI === "function") {
            resetDeleteBtnUI(window.activeDeleteId);
            window.activeDeleteId = null;
        }
    }
});

document.addEventListener("click", function () {
    closeAllMenus();
});

function resetToHome() {
    state.result = null;
    state.resultContextTab = null;
    switchTab("calc");
    setTimeout(() => {
        if (document.getElementById("home-btn-submit")) return;
        const inputEl = document.getElementById("input-nums");
        if (inputEl) {
            inputEl.value = "";
            checkInput(inputEl);
        }
    }, 0);
}

function switchTab(tab) {
    const isSameTab = state.activeTab === tab;
    state.activeTab = tab;
    state.ui = state.ui || {};
    state.ui.suppressPageAnimation = isSameTab;

    if (tab === "help") {
        state.ui.showFaqDot = false;
        localStorage.setItem(FAQ_SEEN_KEY, APP_VERSION);
    }
    if (state.resultContextTab === tab) {
        state.result = null;
        state.resultContextTab = null;
    } else if (tab === "calc") {
        state.resultContextTab = null;
        if (state.ui && typeof randomHomeNums === "function") {
            state.ui.homeNums = randomHomeNums();
        }
        if (state.liuren) {
            state.liuren.result = null;
            state.liuren.form = null;
            state.liuren.advancedOpen = false;
        }
    }

    let calendarDateToFetch = null;
    if (tab === "calendar") {
        const now = new Date();
        calendarDateToFetch = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
        state.calendar.selectedDate = calendarDateToFetch;
        state.calendar.viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
        state.calendar.selectedData = null;
        state.calendar.selectedHour = null;
        state.calendar.calibratedTst = null;
        state.calendar.calibratedTstDate = null;
        state.calendar.hourHidden = false;
        state.calendar.preciseTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    }

    const btnCalc = document.getElementById("nav-calc");
    const btnHistory = document.getElementById("nav-history");
    const btnHelp = document.getElementById("nav-help");
    const btnCalendar = document.getElementById("nav-calendar");

    const styleActive = "bg-active text-ink shadow-inner";
    const styleInactive = "text-inkLight hover:bg-white/50";

    const setBtnStyle = (btn, isActive) => {
        if (!btn) return;
        btn.className = btn.className.replace(styleActive, "").replace(styleInactive, "").trim();
        btn.className += " " + (isActive ? styleActive : styleInactive);
    };

    setBtnStyle(btnCalc, tab === "calc" || tab === "liuren");
    setBtnStyle(btnHistory, tab === "history");
    setBtnStyle(btnHelp, tab === "help");
    setBtnStyle(btnCalendar, tab === "calendar");

    const faqDot = document.getElementById("nav-help-dot");
    if (faqDot) faqDot.classList.toggle("hidden", !(state.ui && state.ui.showFaqDot));

    if (isSameTab && tab === "calendar" && calendarDateToFetch) {
        if (typeof updateCalendarView === "function") updateCalendarView();
        if (typeof _fetchCalendarData === "function") _fetchCalendarData(calendarDateToFetch);
        state.ui.suppressPageAnimation = false;
        return;
    }

    renderMain();

    if (calendarDateToFetch && typeof _fetchCalendarData === "function") {
        _fetchCalendarData(calendarDateToFetch);
    }

    if (tab === "liuren") {
        if (typeof requestLiurenLocation === "function") requestLiurenLocation();
    }

    if (tab === "help" && !state.faq) {
        if (typeof fetchFaqData === "function") fetchFaqData();
    }
}

function renderMain() {
    const contentEl = document.getElementById("content-scroll");
    const faqDot = document.getElementById("nav-help-dot");
    if (faqDot) faqDot.classList.toggle("hidden", !(state.ui && state.ui.showFaqDot));

    if (typeof updateBottomInputBar === "function") {
        updateBottomInputBar();
    }

    if (state.result && state.resultContextTab === state.activeTab) {
        contentEl.innerHTML = getCalcPageHtml();
    } else if (state.activeTab === "calc") {
        contentEl.innerHTML = getCalcPageHtml();
    } else if (state.activeTab === "history") {
        contentEl.innerHTML = getHistoryPageHtml();
    } else if (state.activeTab === "help") {
        contentEl.innerHTML = getHelpPageHtml();
    } else if (state.activeTab === "calendar") {
        contentEl.innerHTML = getCalendarPageHtml();
    } else if (state.activeTab === "liuren") {
        contentEl.innerHTML = getLiurenPageHtml();
    }

    if (state.ui && state.ui.suppressPageAnimation) {
        contentEl.querySelectorAll(".animate-fade-slow").forEach((el) => {
            el.classList.remove("animate-fade-slow");
        });
        state.ui.suppressPageAnimation = false;
    }
}

// 将 localStorage 中旧的 ISO 格式时间戳迁移为小程序格式 MM/DD/YYYY HH:MM:SS
function migrateTimestamps() {
    const ISO_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})$/;
    let changed = false;
    state.history = state.history.map(r => {
        if (r.timestamp && ISO_RE.test(r.timestamp)) {
            const [, y, m, d, t] = r.timestamp.match(ISO_RE);
            r = { ...r, timestamp: `${m}/${d}/${y} ${t}` };
            changed = true;
        }
        return r;
    });
    if (changed) localStorage.setItem('pblossom_history', JSON.stringify(state.history));
}

document.addEventListener("DOMContentLoaded", () => {
    migrateTimestamps();
    renderMain();
    setTimeout(() => {
        if (!document.getElementById("home-btn-submit")) {
            document.getElementById("input-nums")?.focus();
        }
    }, 200);
});
