#!/usr/bin/env python3
"""
《佞臣》历史地图生成器 v4
No title, blue Yellow River, no text labels for rivers/regions, no 高句丽, Tuyuhun visible
"""

import json, os, sys, io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_DIR, '地图资产')
GEOJSON_FILE = os.path.join(OUTPUT_DIR, 'GeoMapData_CN', 'china.json')

# ============================================================
# Visual Config – brighter palette
# ============================================================
FIG_W, FIG_H, DPI = 20, 15, 200
LON_MIN, LON_MAX = 92, 126
LAT_MIN, LAT_MAX = 17.5, 46

BG       = '#1A1612'
OCEAN    = '#1A2530'
CHEN_FC  = '#D4B84A'   # Yellow – Southern Chen
ZHOU_FC  = '#C47A3A'   # Orange – Northern Zhou
TURK_FC  = '#6B6050'   # Muted khaki – Turks
TUYH_FC  = '#5A6848'   # Olive green – Tuyuhun
NEUT_FC  = '#3A3530'   # Neutral
RIVER_C  = '#5AAAC8'
YELLOW_C = '#5AAAC8'   # Same blue as other rivers
TEXT_C   = '#F0E0B8'
TITLE_C  = '#F5E8C0'
CITY_C   = '#FFE040'
FONT     = 'Microsoft YaHei'
PE_S     = [pe.withStroke(linewidth=3, foreground='#00000080')]
PE_L     = [pe.withStroke(linewidth=5, foreground='#00000090')]

# ============================================================
# Province classification
# ============================================================
ALWAYS_CHEN = {
    310000, 330000, 350000, 360000, 430000,
    440000, 450000, 460000, 520000, 530000,
}
ALWAYS_ZHOU = {
    110000, 120000, 130000, 140000, 150000,
    210000, 370000,
    610000, 620000, 630000, 640000,
}
BASHU = {510000, 500000}
SPLIT_HUAI_YZ = {320000, 340000, 410000, 420000}  # 江苏 安徽 河南 湖北
SKIP = {710000, 810000, 820000, 100000}

# Yangtze clipping polygon
_yz = [
    (95, 33), (100, 33.5), (102, 28), (104, 29), (106, 29.5),
    (107, 30), (108, 30.5), (110, 30.3), (111, 30), (112, 30.5),
    (114, 30.6), (115, 29.8), (116, 30), (117, 30.5),
    (117.5, 30.7), (118, 31), (118.5, 31.5), (118.8, 32),
    (120, 32), (121, 31.5), (122, 31.3), (135, 31.2),
]
SOUTH_OF_YZ = Polygon(_yz + [(135, 0), (95, 0)])

# Huai clipping polygon (includes Jiangling north & south of Huai)
_huai = [
    (105, 33.5), (108, 33.2), (111, 32.8),
    (113, 32.8), (114, 32.3), (115.5, 32.6), (116.5, 33),
    (117, 33), (118, 33.3), (119, 33.6), (119.5, 34), (120, 34.2), (125, 34.5),
]
SOUTH_OF_HUAI = Polygon(_huai + [(135, -10), (95, -10)])

# Rivers (visual)
YANGTZE_VIS = [
    (101, 31.5), (103.5, 29), (104.5, 29), (106, 29.5), (107, 30),
    (108, 30.5), (110, 30.3), (111, 30), (112, 30.5),
    (114, 30.6), (115, 29.8), (116, 30), (117, 30.5),
    (117.5, 30.7), (118, 31), (118.5, 31.5), (118.8, 32),
    (120, 32), (121, 31.5), (122, 31.3),
]
YELLOW_VIS = [
    (100, 35), (101, 36), (103, 36), (104, 37.5),
    (106, 37.5), (107, 40), (110, 40), (111, 39),
    (112, 37.5), (113.5, 35), (115, 35), (117, 37),
    (118, 37.5), (119, 37), (119.5, 37.5),
]
HUAI_VIS = [
    (113, 32.8), (114, 32.3), (115.5, 32.6), (116.5, 33),
    (117, 33), (118, 33.3), (119, 33.6), (119.5, 34), (120, 34.2),
]

# ============================================================
# Surrounding power territories (approximate polygons)
# ============================================================
# Turkic – large rectangle covering entire top of map;
# will be clipped by Chinese provinces so southern edge matches Zhou exactly
TURK_POLY = Polygon([
    (LON_MIN, LAT_MAX), (LON_MAX, LAT_MAX), (LON_MAX, 36),
    (LON_MIN, 36), (LON_MIN, LAT_MAX),
])

# Tuyuhun – west side reaches the map edge, irregular N/E borders
TUYUHUN_POLY = Polygon([
    (LON_MIN, 38.5),
    (95, 38.8), (96.5, 39.2), (98, 38.6), (99.5, 39.0),
    (100.5, 38.3), (101.5, 37.5), (102.2, 37.8),
    (103, 37.2), (103.5, 36.5), (103.2, 35.8),
    (102.5, 34.8), (101.5, 33.5), (100.8, 32.8),
    (100, 32.5), (98.5, 33.2), (96.5, 33.0),
    (94.5, 33.8), (LON_MIN, 34), (LON_MIN, 38.5),
])

# Sea/ocean mask – Bohai Sea + Yellow Sea + eastern waters
# Everything east of the approximate coastline should stay ocean
SEA_MASK = Polygon([
    (117, 41), (121.5, 41), (122.5, 40), (123.5, 39.5), (124, 40), (126, 41.5),
    (126, 0), (117, 0)
])

# Exclusion zone south-west of Tuyuhun (no state territory here)
SW_EXCLUSION = Polygon([
    (LON_MIN, 34), (103, 34), (103, LAT_MIN),
    (LON_MIN, LAT_MIN), (LON_MIN, 34),
])

# ============================================================
# Cities – 邺城 is Zhou capital, 建康 is Chen capital
# ============================================================
CHEN_CITIES = {
    '建康': (118.78, 32.06, True),   # Chen capital
    '江陵': (112.19, 30.35, False),
}
ZHOU_CITIES = {
    '邺城': (114.40, 36.34, True),   # Zhou capital
    '长安': (108.94, 34.26, False),
    '洛阳': (112.45, 34.75, False),
    '彭城': (117.18, 34.26, False),  # modern Xuzhou
    '寿春': (116.78, 32.58, False),
    '成都': (104.07, 30.57, False),
}

MAPS = [
    ('南陈 — 北周 初始对峙', '天嘉元年 · 游戏开局',             set(),                'map_1_initial.png'),
    ('南陈占据巴蜀',          '天嘉五年 · 南陈征蜀成功',         {'bashu'},            'map_2_bashu.png'),
    ('南陈占据巴蜀与淮南',    '天嘉八年 · 巴蜀与淮南尽归南陈',   {'bashu','huainan'},  'map_3_bashu_huainan.png'),
    ('南陈占据淮南',          '天嘉八年 · 征蜀未果，淮南归陈',   {'huainan'},          'map_4_huainan.png'),
]

# ============================================================
# Helpers
# ============================================================
def safe_op(geom, clip, op='intersection'):
    try:
        if not geom.is_valid: geom = make_valid(geom)
        if not clip.is_valid: clip = make_valid(clip)
        r = getattr(geom, op)(clip)
        return r if not r.is_empty else None
    except: return None

def plot_geom(ax, geom, fc, ec=None, lw=0.3, alpha=0.92):
    if ec is None: ec = fc  # Same as face → no visible border
    if geom is None or geom.is_empty: return
    if isinstance(geom, MultiPolygon):
        for g in geom.geoms: plot_geom(ax, g, fc, ec, lw, alpha)
    elif isinstance(geom, Polygon):
        xs, ys = geom.exterior.xy
        ax.fill(xs, ys, fc=fc, ec=ec, lw=lw, alpha=alpha, zorder=2)
        for h in geom.interiors:
            hx, hy = h.xy
            ax.fill(hx, hy, fc=OCEAN, ec=ec, lw=0, alpha=1, zorder=3)

def plot_line(ax, coords, color, lw=1.5, alpha=0.7, zorder=5):
    xs, ys = zip(*coords)
    ax.plot(xs, ys, color=color, lw=lw, alpha=alpha, zorder=zorder, solid_capstyle='round')

# ============================================================
# Data loading – merge all provinces per group into single geometry
# ============================================================
def load_and_classify():
    with open(GEOJSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    raw = {'chen_core': [], 'zhou_core': [], 'bashu': [], 'huainan': [], 'split_south': []}

    for feat in data.get('features', []):
        adcode = int(feat['properties'].get('adcode', 0))
        if adcode in SKIP or adcode == 0: continue
        geom = shape(feat['geometry'])
        if geom.is_empty: continue
        if not geom.is_valid: geom = make_valid(geom)

        if adcode in ALWAYS_CHEN:
            raw['chen_core'].append(geom)
        elif adcode in ALWAYS_ZHOU:
            raw['zhou_core'].append(geom)
        elif adcode in BASHU:
            raw['bashu'].append(geom)
        elif adcode in SPLIT_HUAI_YZ:
            s_yz = safe_op(geom, SOUTH_OF_YZ, 'intersection')
            n_yz = safe_op(geom, SOUTH_OF_YZ, 'difference')
            if s_yz: raw['split_south'].append(s_yz)
            if n_yz:
                s_huai = safe_op(n_yz, SOUTH_OF_HUAI, 'intersection')
                n_huai = safe_op(n_yz, SOUTH_OF_HUAI, 'difference')
                if s_huai: raw['huainan'].append(s_huai)
                if n_huai: raw['zhou_core'].append(n_huai)

    # Merge each group into a single unified geometry (removes inter-province gaps)
    merged = {}
    for key, geoms in raw.items():
        if geoms:
            # Buffer slightly to close tiny gaps, then un-buffer
            buffered = [g.buffer(0.01) for g in geoms]
            union = unary_union(buffered).buffer(-0.01)
            merged[key] = union
        else:
            merged[key] = Polygon()

    # Subtract Tuyuhun from Chinese regions
    for key in ['zhou_core', 'bashu', 'huainan']:
        if not merged[key].is_empty:
            res = safe_op(merged[key], TUYUHUN_POLY, 'difference')
            if res: merged[key] = res

    # Subtract SW_EXCLUSION from zhou_core ONLY, so bashu (Sichuan) remains intact
    if not merged['zhou_core'].is_empty:
        res = safe_op(merged['zhou_core'], SW_EXCLUSION, 'difference')
        if res: merged['zhou_core'] = res

    # Build Turkic render polygon: subtract all Chinese territory + Tuyuhun + sea
    all_provinces = unary_union([
        merged[k] for k in merged if not merged[k].is_empty
    ])
    turk_render = safe_op(TURK_POLY, all_provinces, 'difference')
    if turk_render:
        turk_render = safe_op(turk_render, TUYUHUN_POLY, 'difference')
    if turk_render:
        turk_render = safe_op(turk_render, SEA_MASK, 'difference')
    merged['turk_render'] = turk_render if turk_render else Polygon()

    return merged

# ============================================================
# Rendering
# ============================================================
def render_map(groups, title, subtitle, extras, filename, idx):
    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), facecolor=BG)
    ax.set_facecolor(OCEAN)
    ax.set_xlim(LON_MIN, LON_MAX)
    ax.set_ylim(LAT_MIN, LAT_MAX)
    ax.set_aspect(1.18)
    ax.axis('off')

    # --- Surrounding power territories (drawn first, behind everything) ---
    plot_geom(ax, groups['turk_render'], TURK_FC, lw=0, alpha=1.0)
    plot_geom(ax, TUYUHUN_POLY, TUYH_FC, lw=0, alpha=1.0)

    # --- Zhou core (unified, no province borders) ---
    plot_geom(ax, groups['zhou_core'], ZHOU_FC, lw=0)

    # --- Bashu ---
    bc = CHEN_FC if 'bashu' in extras else ZHOU_FC
    plot_geom(ax, groups['bashu'], bc, lw=0)

    # --- Huainan ---
    hc = CHEN_FC if 'huainan' in extras else ZHOU_FC
    plot_geom(ax, groups['huainan'], hc, lw=0)

    # --- Chen core ---
    plot_geom(ax, groups['chen_core'], CHEN_FC, lw=0)
    plot_geom(ax, groups['split_south'], CHEN_FC, lw=0)

    # --- Territorial boundary line (between Chen & Zhou) ---
    # Draw a subtle boundary along the Yangtze (always) and Huai (if taken)
    plot_line(ax, YANGTZE_VIS, '#FFFFFF', lw=1.8, alpha=0.25, zorder=4)
    if 'huainan' in extras:
        plot_line(ax, HUAI_VIS, '#FFFFFF', lw=1.5, alpha=0.2, zorder=4)

    # --- Rivers ---
    plot_line(ax, YANGTZE_VIS, RIVER_C, lw=2.5, alpha=0.55)
    plot_line(ax, YELLOW_VIS, YELLOW_C, lw=2.5, alpha=0.55)
    plot_line(ax, HUAI_VIS, RIVER_C, lw=1.5, alpha=0.4)

    # (River labels removed per user request)

    # --- Cities ---
    # Chen cities
    for name, (lon, lat, is_cap) in CHEN_CITIES.items():
        if not (LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX): continue
        marker = ('*', 16) if is_cap else ('o', 6)
        ax.plot(lon, lat, marker[0], color=CITY_C, markersize=marker[1],
                markeredgecolor='#806020', markeredgewidth=0.8, zorder=9)
        ax.text(lon + 0.5, lat + 0.35, name, fontsize=9, color=TEXT_C,
                fontfamily=FONT, fontweight='bold', path_effects=PE_S, zorder=9)

    # Zhou cities (some may become Chen cities if territory changes)
    for name, (lon, lat, is_cap) in ZHOU_CITIES.items():
        if not (LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX): continue
        # Check if this city is now in Chen territory
        in_chen = False
        if name == '成都' and 'bashu' in extras: in_chen = True
        if name == '寿春' and 'huainan' in extras: in_chen = True

        marker = ('*', 16) if is_cap else ('o', 6)
        ax.plot(lon, lat, marker[0], color=CITY_C, markersize=marker[1],
                markeredgecolor='#806020', markeredgewidth=0.8, zorder=9)
        ax.text(lon + 0.5, lat + 0.35, name, fontsize=9, color=TEXT_C,
                fontfamily=FONT, fontweight='bold', path_effects=PE_S, zorder=9)

    # --- Territory Labels ---
    # Chen label (dark text on yellow)
    ax.text(113, 24, '南  陈', fontsize=34, color='#8A7020', alpha=0.65,
            fontfamily=FONT, fontweight='bold', ha='center',
            path_effects=[pe.withStroke(linewidth=2, foreground='#D4B84A30')], zorder=10)
    # Zhou label (dark text on orange)
    ax.text(112, 38, '北  周', fontsize=34, color='#6A3518', alpha=0.65,
            fontfamily=FONT, fontweight='bold', ha='center',
            path_effects=[pe.withStroke(linewidth=2, foreground='#C47A3A30')], zorder=10)

    # (蜀/淮南 labels removed per user request)

    # --- Surrounding Power Labels (高句丽 removed per user request) ---
    ax.text(110, 44, '突  厥', fontsize=18, color='#A09070', alpha=0.55,
            fontfamily=FONT, fontweight='bold', ha='center', path_effects=PE_L, zorder=10)
    ax.text(97, 36.5, '吐谷浑', fontsize=13, color='#90A070', alpha=0.5,
            fontfamily=FONT, fontweight='bold', ha='center', path_effects=PE_L, zorder=10)

    # (Title/subtitle removed per user request)

    # --- Legend ---
    legend_items = [
        ('■ 南陈', CHEN_FC), ('■ 北周', ZHOU_FC),
        ('■ 突厥', TURK_FC), ('■ 吐谷浑', TUYH_FC),
        ('★ 都城', CITY_C),  ('● 重镇', CITY_C),
    ]
    for i, (label, clr) in enumerate(legend_items):
        ax.text(0.90, 0.18 - i * 0.026, label, transform=ax.transAxes,
                fontsize=9, color=clr, fontfamily=FONT, fontweight='bold',
                path_effects=PE_S, zorder=15)

    # (Map number removed along with title)

    # --- Border ---
    for sp in ax.spines.values(): sp.set_visible(False)
    ax.add_patch(plt.Rectangle((0.005, 0.005), 0.99, 0.99,
                 transform=ax.transAxes, fill=False, ec='#5A4A30', lw=2.5, zorder=20))

    path = os.path.join(OUTPUT_DIR, filename)
    plt.savefig(path, dpi=DPI, bbox_inches='tight', facecolor=BG, pad_inches=0.1)
    plt.close(fig)
    print(f'  ✓ {path}')


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print('=' * 55)
    print('  《佞臣》历史地图生成器 v4')
    print('=' * 55)

    print('\n  Loading & merging provinces...')
    groups = load_and_classify()
    for k, v in groups.items():
        t = type(v).__name__
        print(f'    {k}: {t} (valid={v.is_valid if hasattr(v,"is_valid") else "?"})')

    for i, (title, sub, extras, fn) in enumerate(MAPS, 1):
        print(f'\n  Map {i}: {title}')
        render_map(groups, title, sub, extras, fn, i)

    print(f'\n  All maps → {OUTPUT_DIR}')
    print('=' * 55)

if __name__ == '__main__':
    main()
