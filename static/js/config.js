// static/js/config.js

// ==================================================================================
// Tailwind 配置 - 五行雅色
// ==================================================================================
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Noto Serif SC"', '"Songti SC"', 'SimSun', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
                mono: ['"Noto Sans Mono"', 'monospace'],
            },
            colors: {
                bg: "#F5F2EB",
                sidebar: "#EBE9E4",
                ink: "#2D2D2D",
                inkLight: "#808080",
                accent: "#C85C42",
                active: "#DCD8D0",
                border: "#DCD8D0",

                // 五行雅色 (低饱和度)
                gold: "#C4A975",  // 金
                wood: "#85A885",  // 木
                water: "#7CA0B8", // 水
                fire: "#C77A7A",  // 火
                earth: "#A69578", // 土

                redDot: "#C85C42"
            }
        }
    }
};

// ==================================================================================
// 全局常量 (Constants)
// ==================================================================================

// 1. 颜色映射
const ELEMENT_COLORS = {
    "金": "text-gold",
    "木": "text-wood",
    "水": "text-water",
    "火": "text-fire",
    "土": "text-earth"
};

const ELEMENT_BG_COLORS = {
    "金": "bg-gold",
    "木": "bg-wood",
    "水": "bg-water",
    "火": "bg-fire",
    "土": "bg-earth"
};

// 2. 基础字典

// A. 干支 (用于八字、日历)
const GANZHI_MAP = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土',
    '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

// [新增] 全局图标库 (Standardized Icons)
const ICONS = {
    export: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
};

// B. 八卦 (用于卦名、卦象)
const BAGUA_MAP = {
    '乾': '金', '兑': '金',
    '离': '火',
    '震': '木', '巽': '木',
    '坎': '水',
    '艮': '土', '坤': '土'
};

// C. 自然类象 (用于卦名上色，如"天火同人")
const NATURE_MAP = {
    '天': '金', '泽': '金',
    '火': '火', '日': '火',
    '雷': '木', '风': '木',
    '水': '水', '月': '水', '雨': '水',
    '山': '土', '地': '土'
};

// 3. 组合映射表 (核心修改：解决"未济"染色问题)

// 用于【八字/日历】场景：包含干支
const MAP_FOR_BAZI = {
    ...GANZHI_MAP
};

// 用于【卦名】场景：只包含八卦名 + 自然类象 (严禁包含地支，否则"未"会被染)
const MAP_FOR_GUA = {
    ...BAGUA_MAP,
    ...NATURE_MAP
};

// 全量表 (默认回退)
const WUXING_MAP_ALL = {
    ...GANZHI_MAP,
    ...BAGUA_MAP,
    ...NATURE_MAP
};

// 兼容旧变量名
const GAN_WUXING = GANZHI_MAP;

// ==================================================================================
// 应用状态管理 (State)
// ==================================================================================

const savedHistory = localStorage.getItem('pblossom_history');

window.state = {
    activeTab: 'calc',
    result: null,
    history: savedHistory ? JSON.parse(savedHistory) : [],
    faq: null,
    calendar: {
        viewDate: new Date(),
        selectedDate: null,
        selectedData: null,
        selectedHour: null
    },
    baziResult: null
};

window.activeDeleteId = null;