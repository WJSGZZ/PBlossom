import math
from datetime import datetime, timedelta

from lunar_python import Solar


GAN = list("甲乙丙丁戊己庚辛壬癸")
ZHI = list("子丑寅卯辰巳午未申酉戌亥")
WUXING = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火", "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水",
}
SHENG = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
KE = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}

GAN_HOME = {
    "甲": "寅", "乙": "辰", "丙": "巳", "丁": "未", "戊": "巳",
    "己": "未", "庚": "申", "辛": "戌", "壬": "亥", "癸": "丑",
}
QI_TO_MONTH_GENERAL = {
    "雨水": "亥", "春分": "戌", "谷雨": "酉", "小满": "申", "夏至": "未", "大暑": "午",
    "处暑": "巳", "秋分": "辰", "霜降": "卯", "小雪": "寅", "冬至": "丑", "大寒": "子",
}
NOBLE_DAY_NIGHT = {
    "甲": ("丑", "未"), "戊": ("丑", "未"), "庚": ("丑", "未"),
    "乙": ("子", "申"), "己": ("子", "申"),
    "丙": ("亥", "酉"), "丁": ("亥", "酉"),
    "壬": ("巳", "卯"), "癸": ("巳", "卯"),
    "辛": ("午", "寅"),
}
GENERAL_ORDER = ["贵", "蛇", "雀", "合", "勾", "龙", "空", "虎", "常", "玄", "阴", "后"]
XUN_STARTS = ["甲子", "甲戌", "甲申", "甲午", "甲辰", "甲寅"]
XUN_EMPTY = {"甲子": "戌亥", "甲戌": "申酉", "甲申": "午未", "甲午": "辰巳", "甲辰": "寅卯", "甲寅": "子丑"}
XING = {
    "寅": "巳", "巳": "申", "申": "寅",
    "丑": "戌", "戌": "未", "未": "丑",
    "子": "卯", "卯": "子",
    "辰": "辰", "午": "午", "酉": "酉", "亥": "亥",
}
CHONG = {
    "子": "午", "丑": "未", "寅": "申", "卯": "酉", "辰": "戌", "巳": "亥",
    "午": "子", "未": "丑", "申": "寅", "酉": "卯", "戌": "辰", "亥": "巳",
}
GAN_HE = {"甲": "己", "己": "甲", "乙": "庚", "庚": "乙", "丙": "辛", "辛": "丙", "丁": "壬", "壬": "丁", "戊": "癸", "癸": "戊"}
SANHE_NEXT = {
    "申": "子", "子": "辰", "辰": "申",
    "亥": "卯", "卯": "未", "未": "亥",
    "寅": "午", "午": "戌", "戌": "寅",
    "巳": "酉", "酉": "丑", "丑": "巳",
}
YIMA = {
    "申": "寅", "子": "寅", "辰": "寅",
    "寅": "申", "午": "申", "戌": "申",
    "亥": "巳", "卯": "巳", "未": "巳",
    "巳": "亥", "酉": "亥", "丑": "亥",
}
MENG = set("寅申巳亥")
ZHONG = set("子午卯酉")
RELATIVE = {
    "same": "兄弟",
    "resource": "父母",
    "output": "子孙",
    "wealth": "妻财",
    "officer": "官鬼",
}
YANG = set("甲丙戊庚壬子寅辰午申戌")
def zhi_at(index):
    return ZHI[index % 12]


def ganzhi_at(index):
    return GAN[index % 10] + ZHI[index % 12]


def format_solar(solar):
    return solar.toYmdHms()[:-3]


def equation_of_time(dt):
    """均时差（分钟），Spencer 1971 近似，精度约 ±30 秒。"""
    B = math.radians(360 / 365 * (dt.timetuple().tm_yday - 81))
    return 9.87 * math.sin(2 * B) - 7.53 * math.cos(B) - 1.5 * math.sin(B)


def to_true_solar_time(dt, longitude):
    """北京时间 → 真太阳时（经度修正 + 均时差）。"""
    correction = (float(longitude) - 120.0) * 4.0 + equation_of_time(dt)
    return dt + timedelta(minutes=correction)


def _solar_to_minutes(s):
    """Convert a Solar object to a comparable integer (year-aware)."""
    return (s.getYear() * 525960 + s.getMonth() * 43800 +
            s.getDay() * 1440 + s.getHour() * 60 + s.getMinute())


def get_corrected_year_gz(solar, lunar):
    """Year ganzhi using 立春 as boundary, not 正月初一."""
    year = solar.getYear()
    try:
        from lunar_python import Solar as _Solar
        lichun = _Solar.fromYmdHms(year, 1, 15, 0, 0, 0).getLunar().getNextJie()
        if lichun.getName() != "立春":
            return lunar.getYearInGanZhi()
        before = _solar_to_minutes(solar) < _solar_to_minutes(lichun.getSolar())
        effective_year = year - 1 if before else year
    except Exception:
        effective_year = year
    offset = (effective_year - 1984) % 60
    return GAN[offset % 10] + ZHI[offset % 12]


def get_corrected_month_gz(solar, lunar):
    """Month ganzhi with jieqi time precision (lunar_python applies jie at day start)."""
    month_gz = lunar.getMonthInGanZhi()
    try:
        nj = lunar.getNextJie().getSolar()
        same_day = (nj.getYear() == solar.getYear() and
                    nj.getMonth() == solar.getMonth() and
                    nj.getDay() == solar.getDay())
        if same_day and _solar_to_minutes(solar) < _solar_to_minutes(nj):
            gan_i = (GAN.index(month_gz[0]) - 1) % 10
            zhi_i = (ZHI.index(month_gz[1]) - 1) % 12
            return GAN[gan_i] + ZHI[zhi_i]
    except Exception:
        pass
    return month_gz


def get_day_gz_with_zi_boundary(dt):
    """Day ganzhi switches at 子初 (23:00) for divination/Bazi display."""
    day_dt = dt + timedelta(days=1) if dt.hour >= 23 else dt
    solar = Solar.fromYmdHms(day_dt.year, day_dt.month, day_dt.day, 0, 0, 0)
    return solar.getLunar().getDayInGanZhi()


def parse_local_datetime(value):
    if not value:
        return datetime.now().replace(second=0, microsecond=0)
    value = value.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError("日期时间格式无法识别")


def get_hour_branch(dt):
    if dt.hour == 23:
        return "子"
    return ZHI[((dt.hour + 1) // 2) % 12]


def get_hour_gz(day_gan, hour_branch):
    """Hour ganzhi from day stem and the final divination hour branch."""
    hour_idx = ZHI.index(hour_branch)
    stem_idx = ((GAN.index(day_gan) % 5) * 2 + hour_idx) % 10
    return GAN[stem_idx] + hour_branch


def get_xun(day_gz):
    gan_idx = GAN.index(day_gz[0])
    zhi_idx = ZHI.index(day_gz[1])
    start_zhi = zhi_at(zhi_idx - gan_idx)
    return "甲" + start_zhi


def get_hidden_stems(day_gz):
    xun = get_xun(day_gz)
    start_zhi = ZHI.index(xun[1])
    return [
        {"stem": GAN[i], "branch": zhi_at(start_zhi + i), "ganzhi": GAN[i] + zhi_at(start_zhi + i)}
        for i in range(10)
    ]


def stem_for_branch_in_xun(branch, hidden_stems):
    for item in hidden_stems:
        if item["branch"] == branch:
            return item["stem"]
    return ""


def get_month_general(lunar, overrides):
    if overrides.get("month_general") in ZHI:
        prev_qi = lunar.getPrevQi()
        next_qi = lunar.getNextQi()
        return overrides["month_general"], prev_qi, next_qi, True
    prev_qi = lunar.getPrevQi()
    next_qi = lunar.getNextQi()
    return QI_TO_MONTH_GENERAL.get(prev_qi.getName(), "酉"), prev_qi, next_qi, False


def build_heaven_earth_plate(month_general, hour_branch):
    general_idx = ZHI.index(month_general)
    hour_idx = ZHI.index(hour_branch)
    plate = []
    sky_by_earth = {}
    earth_by_sky = {}
    for i, earth in enumerate(ZHI):
        sky = zhi_at(general_idx + i - hour_idx)
        sky_by_earth[earth] = sky
        earth_by_sky[sky] = earth
        plate.append({"earth": earth, "heaven": sky, "heaven_element": WUXING[sky]})
    return plate, sky_by_earth, earth_by_sky


def relation(upper, lower):
    upper_el = WUXING[upper]
    lower_el = WUXING[lower]
    if upper_el == lower_el:
        return "比和"
    if KE[upper_el] == lower_el:
        return "上克下"
    if KE[lower_el] == upper_el:
        return "下贼上"
    if SHENG[upper_el] == lower_el:
        return "上生下"
    if SHENG[lower_el] == upper_el:
        return "下生上"
    return "无涉"


def build_four_lessons(day_gz, sky_by_earth):
    day_gan, day_branch = day_gz[0], day_gz[1]
    first_lower = GAN_HOME[day_gan]
    first_upper = sky_by_earth[first_lower]
    second_lower = first_upper
    second_upper = sky_by_earth[second_lower]
    third_lower = day_branch
    third_upper = sky_by_earth[third_lower]
    fourth_lower = third_upper
    fourth_upper = sky_by_earth[fourth_lower]
    raw = [
        ("壹", day_gan, first_lower, first_upper),
        ("貳", first_upper, second_lower, second_upper),
        ("叁", day_branch, third_lower, third_upper),
        ("肆", third_upper, fourth_lower, fourth_upper),
    ]
    return [
        {
            "name": name,
            "subject": subject,
            "lower": lower,
            "upper": upper,
            "lower_element": WUXING[subject],
            "upper_element": WUXING[upper],
            "relation": relation(upper, subject),
        }
        for name, subject, lower, upper in raw
    ]


def relative_to_day(day_gan, branch):
    day_el = WUXING[day_gan]
    branch_el = WUXING[branch]
    if day_el == branch_el:
        return RELATIVE["same"]
    if SHENG[branch_el] == day_el:
        return RELATIVE["resource"]
    if SHENG[day_el] == branch_el:
        return RELATIVE["output"]
    if KE[day_el] == branch_el:
        return RELATIVE["wealth"]
    if KE[branch_el] == day_el:
        return RELATIVE["officer"]
    return ""


def _harm_depth(course, relation_name):
    start = ZHI.index(course["lower"])
    end = ZHI.index(course["upper"])
    steps = (end - start) % 12
    total = 0
    upper_el = WUXING[course["upper"]]
    for i in range(steps + 1):
        earth = zhi_at(start + i)
        earth_el = WUXING[earth]
        if relation_name == "上克下" and KE[upper_el] == earth_el:
            total += 1
        elif relation_name == "下贼上" and KE[earth_el] == upper_el:
            total += 1
    return total


def _select_by_shehai(candidates, relation_name, day_is_yang):
    max_depth = max(_harm_depth(c, relation_name) for c in candidates)
    pool = [c for c in candidates if _harm_depth(c, relation_name) == max_depth]
    if len(pool) == 1:
        return pool[0]["upper"]
    meng = [c for c in pool if c["lower"] in MENG]
    if meng:
        pool = meng
    else:
        zhong = [c for c in pool if c["lower"] in ZHONG]
        if zhong:
            pool = zhong
    preferred_names = ("壹", "貳") if day_is_yang else ("叁", "肆")
    preferred = [c for c in pool if c["name"] in preferred_names]
    return (preferred[0] if preferred else pool[0])["upper"]


def _select_initial(candidates, day_is_yang, relation_name):
    if len(candidates) == 1:
        return candidates[0]["upper"], None
    matched = [c for c in candidates if (c["upper"] in YANG) == day_is_yang]
    if len(matched) == 1:
        return matched[0]["upper"], "比用"
    pool = matched if matched else candidates
    return _select_by_shehai(pool, relation_name, day_is_yang), "涉害"


def build_three_transmissions(day_gz, lessons, sky_by_earth, hidden_stems):
    day_gan, day_branch = day_gz[0], day_gz[1]
    day_is_yang = day_gan in YANG
    course_types = []
    earth_by_sky = {sky: earth for earth, sky in sky_by_earth.items()}

    # 伏吟/返吟必须先判断，否则天地盘异常时贼克/元首会误判
    fuyin = all(sky_by_earth.get(z) == z for z in ZHI)
    fanyin = all(sky_by_earth.get(z) == CHONG.get(z) for z in ZHI)

    if fuyin:
        course_types.append("伏吟课")
        beike = [c for c in lessons if c["relation"] == "下贼上"]
        yuanshou = [c for c in lessons if c["relation"] == "上克下"]
        if beike:
            initial, extra = _select_initial(beike, day_is_yang, "下贼上")
            if extra:
                course_types.append(extra)
        elif yuanshou:
            initial, extra = _select_initial(yuanshou, day_is_yang, "上克下")
            if extra:
                course_types.append(extra)
        else:
            initial = GAN_HOME[day_gan] if day_is_yang else day_branch
        middle = XING.get(initial, initial)
        if middle == initial:
            middle = lessons[2]["upper"]
        final = XING.get(middle, middle)
        if final == middle:
            final = CHONG[middle]
        if middle == initial:
            course_types.append("自任")
    elif fanyin:
        course_types.append("返吟课")
        beike = [c for c in lessons if c["relation"] == "下贼上"]
        yuanshou = [c for c in lessons if c["relation"] == "上克下"]
        if beike:
            initial, extra = _select_initial(beike, day_is_yang, "下贼上")
            if extra:
                course_types.append(extra)
            middle = CHONG[initial]
            final = CHONG[middle]
        elif yuanshou:
            initial, extra = _select_initial(yuanshou, day_is_yang, "上克下")
            if extra:
                course_types.append(extra)
            middle = CHONG[initial]
            final = CHONG[middle]
        else:
            initial = YIMA[day_branch]
            middle = lessons[2]["upper"]
            final = lessons[0]["upper"]
            course_types.append("井栏射")
    else:
        beike = [c for c in lessons if c["relation"] == "下贼上"]
        yuanshou = [c for c in lessons if c["relation"] == "上克下"]
        if beike:
            course_types.append("重审课")
            initial, extra = _select_initial(beike, day_is_yang, "下贼上")
            if extra:
                course_types.append(extra)
        elif yuanshou:
            course_types.append("元首课")
            initial, extra = _select_initial(yuanshou, day_is_yang, "上克下")
            if extra:
                course_types.append(extra)
        else:
            # 遥克：日干与四课上神的隔空克制
            day_el = WUXING[day_gan]
            haoshi = [c for c in lessons if KE[day_el] == WUXING[c["upper"]]]   # 蒿矢：日干克上神
            hushi  = [c for c in lessons if KE[WUXING[c["upper"]]] == day_el]   # 虎视：上神克日干
            if haoshi or hushi:
                course_types.append("遥克课")
                if hushi:
                    course_types.append("蒿矢")
                    candidates = hushi
                else:
                    course_types.append("弹射")
                    candidates = haoshi
                initial, extra = _select_initial(candidates, day_is_yang, candidates[0]["relation"] if candidates else "上克下")
                if extra:
                    course_types.append(extra)
            else:
                distinct = {(c["lower"], c["upper"]) for c in lessons}
                if len(distinct) == 4:
                    course_types.append("昴星课")
                    initial = sky_by_earth["酉"] if day_is_yang else earth_by_sky["酉"]
                    middle = lessons[2]["upper"] if day_is_yang else lessons[0]["upper"]
                    final = lessons[0]["upper"] if day_is_yang else lessons[2]["upper"]
                elif len(distinct) == 3:
                    course_types.append("别责课")
                    if day_is_yang:
                        initial = sky_by_earth[GAN_HOME[GAN_HE[day_gan]]]
                    else:
                        initial = SANHE_NEXT[day_branch]
                    middle = lessons[0]["upper"]
                    final = lessons[0]["upper"]
                else:
                    course_types.append("八专课")
                    if day_is_yang:
                        initial = zhi_at(ZHI.index(lessons[0]["upper"]) + 2)
                    else:
                        initial = zhi_at(ZHI.index(lessons[2]["upper"]) - 2)
                    middle = lessons[0]["upper"]
                    final = lessons[0]["upper"]
        if "昴星课" not in course_types and "别责课" not in course_types and "八专课" not in course_types:
            middle = sky_by_earth[initial]
            final = sky_by_earth[middle]
    labels = ["初传", "中传", "末传"]
    branches = [initial, middle, final]
    transmissions = []
    for label, branch in zip(labels, branches):
        stem = stem_for_branch_in_xun(branch, hidden_stems)
        transmissions.append({
            "name": label,
            "branch": branch,
            "stem": stem,
            "ganzhi": (stem + branch) if stem else branch,
            "display": (stem + branch) if stem else f"空{branch}",
            "is_empty": not stem,
            "element": WUXING[branch],
            "six_relative": relative_to_day(day_gz[0], branch),
        })
    return transmissions, course_types


def is_daytime(hour_branch):
    return hour_branch in ["卯", "辰", "巳", "午", "未", "申"]


def build_twelve_generals(day_gan, hour_branch, sky_by_earth, overrides):
    mode = overrides.get("noble_mode")
    if mode not in ("day", "night"):
        mode = "day" if is_daytime(hour_branch) else "night"
    noble_branch = NOBLE_DAY_NIGHT[day_gan][0 if mode == "day" else 1]
    noble_earth = next((earth for earth, sky in sky_by_earth.items() if sky == noble_branch), noble_branch)
    reverse = noble_earth in ["巳", "午", "未", "申", "酉", "戌"]
    noble_idx = ZHI.index(noble_branch)
    generals_by_sky = {}
    for offset, general in enumerate(GENERAL_ORDER):
        sky = zhi_at(noble_idx - offset if reverse else noble_idx + offset)
        generals_by_sky[sky] = general
    return [
        {
            "earth": earth,
            "heaven": sky_by_earth[earth],
            "general": generals_by_sky.get(sky_by_earth[earth], ""),
        }
        for earth in ZHI
    ], mode, noble_branch, noble_earth, generals_by_sky


def apply_general_to_transmissions(transmissions, generals_by_sky, earth_by_sky):
    for item in transmissions:
        earth = earth_by_sky.get(item["branch"], item["branch"])
        item["general"] = generals_by_sky.get(item["branch"], "")
        item["earth"] = earth
    return transmissions


def timezone_label(offset_minutes):
    try:
        minutes = int(offset_minutes)
    except (TypeError, ValueError):
        return "本地时区"
    sign = "+" if minutes <= 0 else "-"
    total = abs(minutes)
    return f"UTC{sign}{total // 60:02d}:{total % 60:02d}"


def build_report(data):
    cal = data["calendar"]
    lr = data["liuren"]
    hidden = "　".join([f"{item['stem']}遁{item['branch']}" for item in lr["hidden_stems"]])
    plate_lines = [
        "天盘/地盘：" + "　".join([f"{x['heaven']}临{x['earth']}" for x in lr["heaven_earth_plate"]]),
        "天将/天盘：" + "　".join([f"{x['general']}{x['heaven']}" for x in lr["twelve_generals"]]),
    ]
    lesson_lines = [
        f"{x['name']}：{x['subject']}上{x['upper']}，{x['relation']}，下类={x['lower_element']}，上神={x['upper_element']}"
        for x in lr["four_lessons"]
    ]
    transmission_lines = [
        f"{x['name']}：{x['six_relative']} {x.get('display') or x['ganzhi']} {x['general']}，地盘={x['earth']}，五行={x['element']}{'，旬空' if x.get('is_empty') else ''}"
        for x in lr["three_transmissions"]
    ]
    lines = [
        "【六壬排盘】",
        f"问事：{data['question'] if (data.get('question') and data['question'] != '暂未填写') else '[暂未填写]'}",
        f"北京时间：{cal['solar']}",
        *([ f"真太阳时：{cal['true_solar_time']}　东经{cal['longitude']:.2f}°" ] if cal.get('true_solar_time') else []),
        "",
        "【时间信息】",
        f"农历：{cal['lunar']}",
        f"干支：{cal['ganzhi']}",
        f"节气：{cal['jieqi_prev']}；{cal['jieqi_next']}",
        "",
        "【起课信息】",
        f"月将：{lr['month_general']}将（{'覆写' if lr.get('month_general_overridden') else '系统'}）",
        f"占时：{lr['hour_branch']}时{'（覆写）' if lr.get('hour_branch_overridden') else ''}",
        f"贵人：{lr['noble_mode']} {lr['noble_branch']}，落地盘 {lr['noble_earth']}{'（覆写）' if lr.get('noble_mode_overridden') else ''}",
        f"旬遁：{lr['xun']}旬，{lr['empty_branches']}空",
        f"日柱遁干：{hidden}",
        f"课体：{'、'.join(lr['course_types']) if lr['course_types'] else '未识别'}",
        "",
        "【天地盘】",
        *plate_lines,
        "",
        "【十二天将】",
        "　".join([f"{x['earth']}宫：{x['general']}将，天盘{x['heaven']}" for x in lr["twelve_generals"]]),
        "",
        "【四课】",
        *lesson_lines,
        "",
        "【三传】",
        *transmission_lines,
    ]
    return "\n".join(lines)


def perform_liuren(req):
    overrides = req.get("overrides") or {}
    dt_input = parse_local_datetime(req.get("datetime_local"))
    question = (req.get("question") or "").strip()

    # 真太阳时修正（若前端提供经度）
    longitude = req.get("longitude")
    location_attempted = bool(req.get("location_attempted", False))
    if longitude is not None:
        try:
            dt = to_true_solar_time(dt_input, longitude)
        except Exception:
            dt = dt_input
    else:
        dt = dt_input

    hour_branch = overrides.get("hour_branch") if overrides.get("hour_branch") in ZHI else get_hour_branch(dt)

    solar = Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
    lunar = solar.getLunar()
    day_gz = get_day_gz_with_zi_boundary(dt)
    year_gz = get_corrected_year_gz(solar, lunar)
    month_gz = get_corrected_month_gz(solar, lunar)
    hour_gz = get_hour_gz(day_gz[0], hour_branch)
    month_general, prev_qi, next_qi, month_general_overridden = get_month_general(lunar, overrides)
    hidden_stems = get_hidden_stems(day_gz)
    plate, sky_by_earth, earth_by_sky = build_heaven_earth_plate(month_general, hour_branch)
    lessons = build_four_lessons(day_gz, sky_by_earth)
    transmissions, course_types = build_three_transmissions(day_gz, lessons, sky_by_earth, hidden_stems)
    generals, noble_mode, noble_branch, noble_earth, generals_by_sky = build_twelve_generals(day_gz[0], hour_branch, sky_by_earth, overrides)
    transmissions = apply_general_to_transmissions(transmissions, generals_by_sky, earth_by_sky)
    engine = "built-in"
    xun = get_xun(day_gz)
    generals_by_sky_map = {g["heaven"]: g["general"] for g in generals}
    for lesson in lessons:
        lesson["general"] = generals_by_sky_map.get(lesson["upper"], "")

    data = {
        "question": question,
        "calendar": {
            "solar": dt_input.strftime("%Y-%m-%d %H:%M:%S"),
            "true_solar_time": dt.strftime("%Y-%m-%d %H:%M:%S") if longitude is not None else None,
            "longitude": round(float(longitude), 2) if longitude is not None else None,
            "location_failed": location_attempted and longitude is None,
            "lunar": f"{lunar.getMonthInChinese()}月{lunar.getDayInChinese()} {hour_branch}时",
            "jieqi_prev": f"{prev_qi.getName()} {format_solar(prev_qi.getSolar())}",
            "jieqi_next": f"{next_qi.getName()} {format_solar(next_qi.getSolar())}",
            "ganzhi": f"{year_gz}年 {month_gz}月 {day_gz}日 {hour_gz}时",
            "timezone": timezone_label(req.get("timezone_offset_minutes")),
        },
        "liuren": {
            "month_general": month_general,
            "month_general_overridden": month_general_overridden,
            "hour_branch": hour_branch,
            "hour_branch_overridden": overrides.get("hour_branch") in ZHI,
            "noble_mode": "昼贵" if noble_mode == "day" else "夜贵",
            "noble_mode_overridden": overrides.get("noble_mode") in ("day", "night"),
            "noble_branch": noble_branch,
            "noble_earth": noble_earth,
            "xun": xun,
            "empty_branches": XUN_EMPTY.get(xun, ""),
            "hidden_stems": hidden_stems,
            "heaven_earth_plate": plate,
            "four_lessons": lessons,
            "three_transmissions": transmissions,
            "twelve_generals": generals,
            "six_relatives": [{"branch": item["branch"], "relative": item["six_relative"]} for item in transmissions],
            "course_types": course_types,
            "engine": engine,
        },
    }
    data["report_text"] = build_report(data)
    return data
