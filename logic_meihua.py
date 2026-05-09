from datetime import datetime
from borax.calendars.lunardate import LunarDate
import logic_common

# 引用 common 中的数据
DATA = logic_common.DATA
YAO_TO_NUM = logic_common.YAO_TO_NUM


# --- 卦象基础逻辑 ---
def get_gua_info(number):
    return DATA["trigrams"].get(str(number), DATA["trigrams"]["1"])


def get_hex_name(u_num, l_num):
    key = f"{u_num}-{l_num}"
    if key in DATA.get("hexagrams", {}):
        return DATA["hexagrams"][key]["name"]
    u, l = get_gua_info(u_num), get_gua_info(l_num)
    return f"{u['name']}{l['name']}" if u['name'] != l['name'] else f"{u['name']}为{u['name']}"


# --- 报告生成辅助函数 ---
def c(text, element, colored=False):
    if not colored: return text
    code = DATA["wuxing"]["colors"].get(element, "")
    return f"{code}{text}\033[0m"


def analyze_rel_yi(ti, yong, colored=False):
    s, k = DATA["wuxing"]["sheng"], DATA["wuxing"]["ke"]
    c_ti = c("体", ti, colored)
    c_yong = c("用", yong, colored)
    if ti == yong:
        return f"{c_ti} 比和 {c_yong}"
    elif s.get(ti) == yong:
        return f"{c_ti} 生 {c_yong}"
    elif s.get(yong) == ti:
        return f"{c_yong} 生 {c_ti}"
    elif k.get(ti) == yong:
        return f"{c_ti} 克 {c_yong}"
    elif k.get(yong) == ti:
        return f"{c_yong} 克 {c_ti}"
    return "未知"


def analyze_ling_yi(zhi, ti, colored=False):
    zhi_el = DATA["dizhi"].get(zhi, "")
    s, k = DATA["wuxing"]["sheng"], DATA["wuxing"]["ke"]
    prefix = c(f"{zhi}({zhi_el})", zhi_el, colored)
    target = c(f"体({ti})", ti, colored)
    if zhi_el == ti:
        return f"{prefix}比和{target}"
    elif s.get(zhi_el) == ti:
        return f"{prefix}生{target}"
    elif s.get(ti) == zhi_el:
        return f"{target}生{prefix}"
    elif k.get(zhi_el) == ti:
        return f"{prefix}克{target}"
    elif k.get(ti) == zhi_el:
        return f"{target}克{prefix}"
    return "未知"


def build_gua_text(buf, u_num, l_num, c_yao, title, cal_info, colored=False):
    u = get_gua_info(u_num)
    l = get_gua_info(l_num)
    name = get_hex_name(u_num, l_num)
    ti_pos = "下" if c_yao >= 4 else "上"
    ti_el = u['element'] if ti_pos == "上" else l['element']
    yo_el = l['element'] if ti_pos == "上" else u['element']
    buf.write(f"[{title}：{name}]\n")
    yao_names = ["初", "二", "三", "四", "五", "上"]
    all_yao = l['yao'] + u['yao']
    for i in range(5, -1, -1):
        line_str = "━━━━━━━━━━━━" if all_yao[i] == 1 else "━━━━━  ━━━━━"

        # [修复] 只要 c_yao 匹配，无论是什么卦（本/变/互），都显示圆点
        mark = " ●" if (c_yao == i + 1) else "  "

        note = ""
        is_ti = False
        if i == 4 and ti_pos == "上":
            is_ti = True
        elif i == 4 and ti_pos == "下":
            is_ti = False
        elif i == 1 and ti_pos == "下":
            is_ti = True
        elif i == 1 and ti_pos == "上":
            is_ti = False
        if i == 4 or i == 1:
            role = "体卦" if is_ti else "用卦"
            el = u['element'] if i >= 3 else l['element']
            note = f"{role}：{c(el, el, colored)}"
        buf.write(f"{yao_names[i]}爻  {line_str}{mark}    {note}\n")
        if i == 3: buf.write("─────────────────────────\n")
    u_role = "体" if ti_pos == "上" else "用"
    l_role = "体" if ti_pos == "下" else "用"
    buf.write(
        f"上卦：{u['symbol']} {u['name']}{u_num}({u['nature']}) [{u_role}卦：{c(u['element'], u['element'], colored)}]\n")
    buf.write(
        f"下卦：{l['symbol']} {l['name']}{l_num}({l['nature']}) [{l_role}卦：{c(l['element'], l['element'], colored)}]\n")
    buf.write(f"体用关系：{analyze_rel_yi(ti_el, yo_el, colored)}\n")
    if cal_info:
        for k, n in [('y', '年'), ('m', '月'), ('d', '日'), ('h', '时')]:
            zhi = cal_info[k]
            rel_str = analyze_ling_yi(zhi, ti_el, colored)
            buf.write(f"{n}令关系：{rel_str}\n")
    buf.write("\n")


def generate_report_content(ben, bian, hu, c_yao, cal_info, timestamp, time_str, colored=False):
    import io
    buf = io.StringIO()
    header_color = "\033[1;37m" if colored else ""
    reset_color = "\033[0m" if colored else ""
    buf.write(f"{header_color}起卦时间：{timestamp}{reset_color}\n")
    buf.write(f"{header_color}四柱八字：{time_str}{reset_color}\n")
    if cal_info and cal_info.get("input_nums"):
        nums = cal_info["input_nums"]
        buf.write(f"数字：{nums[0]} {nums[1]} {nums[2]}\n")
    buf.write("-" * 50 + "\n")
    build_gua_text(buf, ben[0], ben[1], c_yao, "本卦", cal_info, colored)
    build_gua_text(buf, bian[0], bian[1], c_yao, "变卦", cal_info, colored)

    # [修复] 互卦也传入 c_yao，而不是 0，这样互卦也会在对应位置显示动爻标记
    build_gua_text(buf, hu[0], hu[1], c_yao, "互卦", cal_info, colored)

    buf.write("-" * 50 + "\n")
    content = buf.getvalue()
    buf.close()
    return content


# --- 核心业务逻辑封装 ---
def perform_divination(n1, n2, n3, custom_time=None):
    # 1. 归一化数字
    n1 = logic_common.normalize_number(int(n1), 8)
    n2 = logic_common.normalize_number(int(n2), 8)
    n3 = logic_common.normalize_number(int(n3), 6)

    # 2. 处理时间
    if custom_time:
        for fmt in ('%m/%d/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S'):
            try:
                dt = datetime.strptime(custom_time, fmt)
                break
            except ValueError:
                continue
        else:
            dt = datetime.now()
    else:
        dt = datetime.now()

    # 3. 排干支（23点为子时换日，日柱取次日）
    from datetime import timedelta
    calendar_dt = dt + timedelta(days=1) if dt.hour == 23 else dt
    lunar = LunarDate.from_solar_date(calendar_dt.year, calendar_dt.month, calendar_dt.day)
    full_hour_gz = logic_common.get_hour_gz(lunar.gz_day[0], dt.hour)

    cal_info = {'y': lunar.gz_year[1], 'm': lunar.gz_month[1], 'd': lunar.gz_day[1], 'h': full_hour_gz[1], 'input_nums': [n1, n2, n3]}
    ui_time_str = f"{lunar.gz_year} {lunar.gz_month} {lunar.gz_day} {full_hour_gz}"
    report_time_str = f"{lunar.gz_year}年 {lunar.gz_month}月 {lunar.gz_day}日 {full_hour_gz}时"
    timestamp = dt.strftime('%m/%d/%Y %H:%M:%S')

    # 4. 排卦
    ben_u, ben_l = n1, n2
    ben_info_u = get_gua_info(ben_u)
    ben_info_l = get_gua_info(ben_l)

    ben_yao = ben_info_l['yao'] + ben_info_u['yao']
    bian_yao = list(ben_yao)
    bian_yao[n3 - 1] = 1 - bian_yao[n3 - 1]

    bian_l = YAO_TO_NUM.get(tuple(bian_yao[0:3]), 1)
    bian_u = YAO_TO_NUM.get(tuple(bian_yao[3:6]), 1)

    hu_l_yao = [ben_yao[1], ben_yao[2], ben_yao[3]]
    hu_u_yao = [ben_yao[2], ben_yao[3], ben_yao[4]]
    hu_l = YAO_TO_NUM.get(tuple(hu_l_yao), 1)
    hu_u = YAO_TO_NUM.get(tuple(hu_u_yao), 1)

    # 5. 生成文本报告
    gua_params = {
        "ben": (ben_u, ben_l), "bian": (bian_u, bian_l), "hu": (hu_u, hu_l),
        "c_yao": n3, "cal_info": cal_info, "timestamp": timestamp, "time_str": report_time_str
    }
    report_text = generate_report_content(**gua_params, colored=False)

    # 6. 构建前端返回数据
    ben_ti_pos = "下" if n3 >= 4 else "上"

    # 辅助函数：构建单个卦的字典
    def make_gua_dict(title, u_num, l_num, yao_lines, ti_pos, ti_el):
        u_info = get_gua_info(u_num)
        l_info = get_gua_info(l_num)
        return {
            "title": title, "name": get_hex_name(u_num, l_num),
            "upper": u_info, "lower": l_info,
            "yao_lines": yao_lines, "ti_pos": ti_pos, "ti_element": ti_el
        }

    ben_ti_el = ben_info_u['element'] if ben_ti_pos == "上" else ben_info_l['element']

    res_data = {
        "timestamp": timestamp, "ganzhi_str": ui_time_str, "report_text": report_text,
        "input_nums": [n1, n2, n3],
        "ben": make_gua_dict("本卦", ben_u, ben_l, ben_yao, ben_ti_pos, ben_ti_el),
        "bian": make_gua_dict("变卦", bian_u, bian_l, bian_yao, ben_ti_pos,
                              get_gua_info(bian_u)['element'] if ben_ti_pos == "上" else get_gua_info(bian_l)[
                                  'element']),
        "hu": make_gua_dict("互卦", hu_u, hu_l, hu_l_yao + hu_u_yao, ben_ti_pos,
                            get_gua_info(hu_u)['element'] if ben_ti_pos == "上" else get_gua_info(hu_l)['element'])
    }

    # 7. 计算五行关系
    s, ke = DATA["wuxing"]["sheng"], DATA["wuxing"]["ke"]
    for k in ['ben', 'bian', 'hu']:
        ti_el = res_data[k]['ti_element']
        ti_pos = res_data[k]['ti_pos']
        yong_el = res_data[k]['lower']['element'] if ti_pos == "上" else res_data[k]['upper']['element']

        rel_desc = "关系持平"
        if ti_el == yong_el:
            rel_desc = "体 用 比和"
        elif s.get(ti_el) == yong_el:
            rel_desc = "体 生 用"
        elif s.get(yong_el) == ti_el:
            rel_desc = "用 生 体"
        elif ke.get(ti_el) == yong_el:
            rel_desc = "体 克 用"
        elif ke.get(yong_el) == ti_el:
            rel_desc = "用 克 体"

        res_data[k]['relation_desc'] = rel_desc
        res_data[k]['change_yao_idx'] = n3 if k != 'hu' else None

        # 简单关系判断辅助
        def simple_rel(zhi, ti):
            raw = analyze_ling_yi(zhi, ti, False)
            if "生" in raw: return "生体" if "生体" in raw else "体泄"
            if "克" in raw: return "克体" if "克体" in raw else "体克"
            if "比" in raw: return "比和"
            return ""

        res_data[k]['ling_data'] = [
            {"label": "年", "zhi": cal_info['y'], "element": DATA["dizhi"][cal_info['y']],
             "rel": simple_rel(cal_info['y'], ti_el)},
            {"label": "月", "zhi": cal_info['m'], "element": DATA["dizhi"][cal_info['m']],
             "rel": simple_rel(cal_info['m'], ti_el)},
            {"label": "日", "zhi": cal_info['d'], "element": DATA["dizhi"][cal_info['d']],
             "rel": simple_rel(cal_info['d'], ti_el)},
            {"label": "时", "zhi": cal_info['h'], "element": DATA["dizhi"][cal_info['h']],
             "rel": simple_rel(cal_info['h'], ti_el)}
        ]

    return res_data
