// static/js/main.js

// ==================================================================================
// 全局事件监听 (Global Event Listeners)
// ==================================================================================

// 点击页面空白处取消删除确认状态
document.addEventListener('click', function (e) {
    if (window.activeDeleteId !== null) {
        if (typeof resetDeleteBtnUI === 'function') {
            resetDeleteBtnUI(window.activeDeleteId);
            window.activeDeleteId = null;
        }
    }
});

// 点击空白处关闭所有下拉菜单
document.addEventListener('click', function () {
    closeAllMenus();
});

// ==================================================================================
// 导航与标签切换 (Navigation)
// ==================================================================================

// 返回首页
function resetToHome() {
    state.result = null;
    switchTab('calc');
    setTimeout(() => {
        const inputEl = document.getElementById('input-nums');
        if (inputEl) {
            inputEl.value = "";
            checkInput(inputEl);
        }
    }, 0);
}

// 切换标签页 (核心路由)
function switchTab(tab) {
    state.activeTab = tab;

    // 1. 设置侧边栏按钮样式
    const btnCalc = document.getElementById('nav-calc');
    const btnHistory = document.getElementById('nav-history');
    const btnHelp = document.getElementById('nav-help');
    const btnCalendar = document.getElementById('nav-calendar');

    const styleActive = "bg-active text-ink shadow-inner";
    const styleInactive = "text-inkLight hover:bg-white/50";

    const setBtnStyle = (btn, isActive) => {
        if (!btn) return;
        btn.className = btn.className.replace(styleActive, "").replace(styleInactive, "").trim();
        btn.className += " " + (isActive ? styleActive : styleInactive);
    };

    setBtnStyle(btnCalc, tab === 'calc');
    setBtnStyle(btnHistory, tab === 'history');
    setBtnStyle(btnHelp, tab === 'help');
    // 高亮逻辑：日历页和识命页都高亮同一个按钮
    setBtnStyle(btnCalendar, tab === 'calendar' || tab === 'bazi');

    // 2. 渲染主页面
    renderMain();

    // 3. 底部栏与状态控制逻辑
    const bottomBar = document.getElementById('bottom-calendar-bar');

    if (tab === 'calendar') {
        // [核心修改] 每次点击"时令"，强制重置到初始状态

        // 1. 强制隐藏底部按钮
        if (bottomBar) bottomBar.classList.add('translate-y-full', 'pointer-events-none');

        // 2. 清空已选时辰
        state.calendar.selectedHour = null;

        // 3. 强制重置日期为"今天" (这会触发 selectDate -> updateCalendarView -> updateBottomBar)
        if (typeof selectDate === 'function') {
            selectDate(new Date());
        }
    } else {
        // 如果切到了其他页面 (比如识命页 bazi)，确保日历的底部栏也是隐藏的
        // 注意：识命页本身不需要这个浮动条，它的内容在页面中间
        if (bottomBar) bottomBar.classList.add('translate-y-full', 'pointer-events-none');
    }

    // 4. 帮助页逻辑
    if (tab === 'help' && !state.faq) {
        if (typeof fetchFaqData === 'function') fetchFaqData();
    }
}


// ==================================================================================
// 主渲染函数 (Main Render)
// ==================================================================================

function renderMain() {
    const contentEl = document.getElementById('content-scroll');

    if (typeof updateBottomInputBar === 'function') {
        updateBottomInputBar();
    }

    if (state.activeTab === 'calc') {
        contentEl.innerHTML = getCalcPageHtml();
    } else if (state.activeTab === 'history') {
        contentEl.innerHTML = getHistoryPageHtml();
    } else if (state.activeTab === 'help') {
        contentEl.innerHTML = getHelpPageHtml();
    } else if (state.activeTab === 'calendar') {
        contentEl.innerHTML = getCalendarPageHtml();
    } else if (state.activeTab === 'bazi') {
        contentEl.innerHTML = getBaziPageHtml();
    }
}


// ==================================================================================
// 初始化 (Init)
// ==================================================================================

document.addEventListener('DOMContentLoaded', () => {
    renderMain();
    setTimeout(() => document.getElementById('input-nums')?.focus(), 200);
});