// static/js/pages/history.js

// 加载历史记录
function loadRecord(id) {
    const record = state.history.find(r => r.id === id);
    if (record) {
        state.result = record;
        switchTab('calc');
    }
}

// 删除记录
function deleteRecord(event, btn, id) {
    event.stopPropagation();

    if (window.activeDeleteId !== null && window.activeDeleteId !== id) {
        resetDeleteBtnUI(window.activeDeleteId);
    }

    if (btn.dataset.status === 'confirm') {
        state.history = state.history.filter(r => r.id !== id);
        localStorage.setItem('pblossom_history', JSON.stringify(state.history));
        if (state.result && state.result.id === id) {
            state.result = null;
        }
        window.activeDeleteId = null;
        renderMain();
    } else {
        btn.dataset.status = 'confirm';
        window.activeDeleteId = id;
        btn.innerHTML = `<span class="text-sm font-bold text-red-600 whitespace-nowrap">确认</span>`;

        // [关键修改] 保留 'peer' 类，确保提示框逻辑不失效
        btn.className = "delete-btn-tag peer p-1.5 rounded-lg bg-red-50 ring-1 ring-red-200 opacity-100 cursor-default transition-all";
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
            btn.className = "delete-btn-tag peer p-1.5 rounded-lg text-inkLight hover:text-red-600 hover:bg-red-50/50 transition-colors";
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
        let itemsHtml = state.history.map(record => {
            const pillars = record.ganzhi_str.replace(/[年月日时]/g, '').split(' ').filter(s => s.trim());
            let noteDisplay = record.note ? `<span class="text-base font-normal text-inkLight ml-3 opacity-80">${record.note.length > 7 ? record.note.substring(0, 7) + "..." : record.note}</span>` : "";

            return `
                <div id="history-card-${record.id}" onclick="loadRecord(${record.id})" class="text-left bg-white/40 hover:bg-white p-5 rounded-xl border border-border/50 hover:border-border transition-all duration-300 shadow-sm hover:shadow-md group relative overflow-hidden w-full cursor-pointer">
                    <div class="absolute top-0 left-0 w-1 h-full bg-active group-hover:bg-accent transition-colors duration-300"></div>
                    
                    <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        
                        <div class="relative">
                            
                            <button onclick="deleteRecord(event, this, ${record.id})" class="delete-btn-tag peer p-1.5 rounded-lg text-inkLight hover:text-red-600 hover:bg-red-50/50 transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>

                            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-ink text-white text-sm rounded-lg opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                                删除
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
                            </div>
                        </div>
                    </div>

                    <div class="pl-3 pr-10 flex flex-col h-full justify-between gap-3">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-xl font-medium text-ink tracking-wide group-hover:text-accent transition-colors">${record.ben.name}${noteDisplay}</span>
                            </div>
                            <span class="text-[10px] font-mono text-inkLight opacity-40 tracking-wider">${record.timestamp}</span>
                        </div>
                        <div class="flex items-center gap-2 pt-3 border-t border-border/30">
                            ${pillars.map(p => `<span class="text-xs text-inkLight bg-white/60 px-2 py-0.5 rounded border border-transparent group-hover:border-border/50 transition-colors">${p}</span>`).join('')}
                        </div>
                    </div>
                </div>`;
        }).join('');
        historyContent = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pr-2">${itemsHtml}</div>`;
    }

    return `
        <div class="p-8 lg:p-16 animate-fade-slow pb-6">
            <h2 class="text-3xl font-light text-ink mb-12 tracking-wider border-b border-border/30 pb-4">往昔</h2>
            ${historyContent}
        </div>`;
}