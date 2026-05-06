// static/js/config.js

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Noto Serif SC"', '"Songti SC"', "SimSun", "serif"],
                sans: ['"Inter"', "sans-serif"],
                mono: ['"Noto Sans Mono"', "monospace"],
            },
            colors: {
                bg: "#F5F2EB",
                sidebar: "#EBE9E4",
                ink: "#2D2D2D",
                inkLight: "#808080",
                accent: "#C85C42",
                active: "#DCD8D0",
                border: "#DCD8D0",
                gold: "#C0B07C",
                wood: "#8AA480",
                water: "#7C9CAE",
                fire: "#BC8078",
                earth: "#A28870",
                redDot: "#C85C42",
            },
        },
    },
};

const ELEMENT_COLORS = {
    金: "text-gold",
    木: "text-wood",
    水: "text-water",
    火: "text-fire",
    土: "text-earth",
};

const ELEMENT_BG_COLORS = {
    金: "bg-gold",
    木: "bg-wood",
    水: "bg-water",
    火: "bg-fire",
    土: "bg-earth",
};

const GANZHI_MAP = {
    甲: "木",
    乙: "木",
    丙: "火",
    丁: "火",
    戊: "土",
    己: "土",
    庚: "金",
    辛: "金",
    壬: "水",
    癸: "水",
    子: "水",
    丑: "土",
    寅: "木",
    卯: "木",
    辰: "土",
    巳: "火",
    午: "火",
    未: "土",
    申: "金",
    酉: "金",
    戌: "土",
    亥: "水",
};

const ICONS = {
    export: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    copy: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path></svg>`,
    sparkles: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"/><path d="M19 15l.8 2.7L22 18.5l-2.2.8L19 22l-.8-2.7-2.2-.8 2.2-.8L19 15z"/><path d="M5 2l.7 2.3L8 5l-2.3.7L5 8l-.7-2.3L2 5l2.3-.7L5 2z"/></svg>`,
};

const BAGUA_MAP = {
    乾: "金",
    兑: "金",
    离: "火",
    震: "木",
    巽: "木",
    坎: "水",
    艮: "土",
    坤: "土",
};

const NATURE_MAP = {
    天: "金",
    泽: "金",
    火: "火",
    日: "火",
    雷: "木",
    风: "木",
    水: "水",
    月: "水",
    雨: "水",
    山: "土",
    地: "土",
};

const MAP_FOR_BAZI = {
    ...GANZHI_MAP,
};

const MAP_FOR_GUA = {
    ...BAGUA_MAP,
    ...NATURE_MAP,
};

const WUXING_MAP_ALL = {
    ...GANZHI_MAP,
    ...BAGUA_MAP,
    ...NATURE_MAP,
};

const GAN_WUXING = GANZHI_MAP;

const savedHistory = localStorage.getItem("pblossom_history");

window.state = {
    activeTab: "calc",
    result: null,
    resultContextTab: null,
    history: savedHistory ? JSON.parse(savedHistory) : [],
    faq: null,
    calendar: {
        viewDate: new Date(),
        selectedDate: null,
        selectedData: null,
        selectedHour: null,
        preciseTime: null,
        calibratedTst: null,
        longitude: null,
        locationStatus: null,
    },
    ui: {
        selectOpen: null,
    },
    liuren: {
        result: null,
        advancedOpen: false,
        form: null,
        datePickerOpen: false,
        pickerView: null,
        dropdownOpen: null,
        timePartOpen: null,
    },
};

window.activeDeleteId = null;
