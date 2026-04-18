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
        const inputEl = document.getElementById("input-nums");
        if (inputEl) {
            inputEl.value = "";
            checkInput(inputEl);
        }
    }, 0);
}

function switchTab(tab) {
    state.activeTab = tab;
    if (state.resultContextTab === tab) {
        state.result = null;
        state.resultContextTab = null;
    } else if (tab === "calc") {
        state.resultContextTab = null;
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

    setBtnStyle(btnCalc, tab === "calc");
    setBtnStyle(btnHistory, tab === "history");
    setBtnStyle(btnHelp, tab === "help");
    setBtnStyle(btnCalendar, tab === "calendar");

    renderMain();

    if (tab === "calendar") {
        state.calendar.selectedHour = null;
        if (typeof selectDate === "function") {
            selectDate(new Date());
        }
    }

    if (tab === "help" && !state.faq) {
        if (typeof fetchFaqData === "function") fetchFaqData();
    }
}

function renderMain() {
    const contentEl = document.getElementById("content-scroll");

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
    setTimeout(() => document.getElementById("input-nums")?.focus(), 200);
});
