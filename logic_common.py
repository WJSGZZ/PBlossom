import os
import sys
import json

# --- 资源路径适配 ---
def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

# --- 数据加载 ---
def load_json_data(filename, default_value):
    try:
        json_path = get_resource_path(filename)
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return default_value

# 加载静态数据
DATA = load_json_data('hexagrams.json', {})
FAQ_DATA = load_json_data('faq.json', [])

# 预处理卦名索引
YAO_TO_NUM = {}
if "trigrams" in DATA:
    for k, v in DATA["trigrams"].items():
        YAO_TO_NUM[tuple(v["yao"])] = int(k)

# --- 常量定义 ---
ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
GAN_LIST = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
START_MAP = {"甲": 0, "己": 0, "乙": 2, "庚": 2, "丙": 4, "辛": 4, "丁": 6, "壬": 6, "戊": 8, "癸": 8}

# 五行映射表
GAN_WUXING = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"
}

# --- 通用工具函数 ---
def normalize_number(num, max_val):
    result = num % max_val
    return max_val if result == 0 else result

def get_hour_gz(day_gan, hour):
    zhi_idx = 0 if hour == 23 else (hour + 1) // 2
    start_idx = START_MAP.get(day_gan, 0)
    gan_idx = (start_idx + zhi_idx) % 10
    return f"{GAN_LIST[gan_idx]}{ZHI_LIST[zhi_idx]}"
