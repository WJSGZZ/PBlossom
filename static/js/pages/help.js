async function fetchFaqData() {
    try {
        const response = await fetch('/api/faq');
        const res = await response.json();
        if (res.status === 'success') {
            state.faq = res.data;
            renderMain();
        } else {
            console.error("FAQ加载失败");
            state.faq = [];
        }
    } catch (error) {
        state.faq = [];
        renderMain();
    }
}

function toggleFaq(header) {
    const card = header.parentElement;
    const wrapper = card.querySelector('.answer-wrapper');
    const arrow = header.querySelector('.arrow-icon');
    const isClosed = wrapper.classList.contains('grid-rows-[0fr]');

    if (isClosed) {
        wrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
        wrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
        arrow.classList.add('rotate-180');
        card.classList.add('!bg-white', '!shadow-md', '!border-border');
    } else {
        wrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
        wrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
        arrow.classList.remove('rotate-180');
        card.classList.remove('!bg-white', '!shadow-md', '!border-border');
    }
}

function getHelpPageHtml() {
    let contentHtml = '';
    if (!state.faq) {
        contentHtml = `
            <div class="flex flex-col items-center justify-center h-[300px] text-inkLight opacity-50">
                <div class="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full mb-4"></div>
                <p class="text-xs tracking-widest">正在加载常见问题...</p>
            </div>`;
    } else if (state.faq.length === 0) {
        contentHtml = `<div class="flex flex-col items-center justify-center text-inkLight opacity-30 min-h-[400px]"><p class="font-light tracking-widest text-sm">暂无内容</p></div>`;
    } else {
        contentHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pr-2">` +
            state.faq.map((item, index) => {
                let answerHtml = Array.isArray(item.answer) ? item.answer.map(l => l === "" ? '<br/>' : `<div>${l}</div>`).join('') : item.answer;

                // [修复] 统一卡片阴影和动画规范
                return `
                <div class="group relative bg-white/40 hover:bg-white rounded-xl border border-border/50 hover:border-border transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden h-fit">
                    <div class="absolute top-0 left-0 w-1 h-full bg-active group-hover:bg-accent transition-colors duration-300"></div>
                    <div class="flex items-start justify-between p-5 cursor-pointer select-none" onclick="toggleFaq(this)">
                        <div class="pl-3 flex-1 pr-4">
                            <div class="text-lg font-medium text-ink tracking-wide group-hover:text-accent transition-colors mb-1 leading-snug">${item.question}</div>
                            <div class="text-[10px] font-mono text-inkLight opacity-40 tracking-wider uppercase">FAQ #${String(index + 1).padStart(2, '0')}</div>
                        </div>
                        <span class="arrow-icon text-inkLight opacity-40 transition-transform duration-300 mt-1">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </span>
                    </div>
                    <div class="answer-wrapper grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-in-out">
                        <div class="overflow-hidden">
                            <div class="px-5 pb-6 pl-8 text-sm text-inkLight leading-relaxed opacity-90 font-sans border-t border-border/30 pt-4 mx-2">${answerHtml}</div>
                        </div>
                    </div>
                </div>`
            }).join('') + `</div>`;
    }

    return `
        <div class="p-8 lg:p-16 animate-fade-slow pb-6">
            <h2 class="text-3xl font-light text-ink mb-12 tracking-wider border-b border-border/30 pb-4">常见问题</h2>
            ${contentHtml}
        </div>`;
}