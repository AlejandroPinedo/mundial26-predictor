"""
shot_map.py — Reproduce el infográfico "dónde se dispara y dónde entra"
sobre datos REALES del Mundial 2026 (API oficial de FIFA, vía fetch_shots.py).

Lee shots.csv, imprime las métricas clave y dibuja shot_map.png.
La cancha se dibuja a mano con matplotlib (en metros, para no deformar).
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Arc, Circle
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "shots.csv")
OUT = os.path.join(HERE, "shot_map.png")

# Paleta (inspirada en el infográfico)
BG, FIELD, LINE = "#EDE6D4", "#E3D9BF", "#C7B998"
SHOT, GOAL, DARK, MUTED = "#5C5C52", "#B11226", "#23231F", "#7A746A"

# Cancha real (m); el arco atacado está a la DERECHA (x=105)
L, W = 105.0, 68.0
GX, GY = L, W / 2          # centro del arco
BOX_X, BOX_DY = L - 16.5, 20.16
SIX_X, SIX_DY = L - 5.5, 9.16
PEN_SPOT = (L - 11.0, W / 2)


def to_m(df):
    df = df.copy()
    df["xm"] = df.x / 100 * L
    df["ym"] = df.y / 100 * W
    return df


def metrics(df):
    nonpen = df[df.is_penalty == 0]

    def conv(sub):
        s = len(sub); g = int(sub.is_goal.sum())
        return s, g, (100.0 * g / s if s else 0.0)

    m = {
        "total": conv(df), "nonpen": conv(nonpen),
        "inside": conv(nonpen[nonpen.inside_box == 1]),
        "outside": conv(nonpen[nonpen.inside_box == 0]),
        "penalties": conv(df[df.is_penalty == 1]),
        "med_shot": nonpen.dist_m.median(),
        "med_goal": nonpen[nonpen.is_goal == 1].dist_m.median(),
        "matches": df.match_id.nunique(),
    }
    print("\n" + "=" * 58)
    print("  MUNDIAL 2026 — Dónde se dispara y dónde entra")
    print("  Fuente: API oficial de FIFA")
    print("=" * 58)
    for k, lbl in [("total", "Tiros totales"), ("nonpen", "Sin penales"),
                   ("inside", "Dentro del area (s/pen)"),
                   ("outside", "Fuera del area"), ("penalties", "Penales")]:
        s, g, c = m[k]
        print(f"  {lbl:<24} {s:>5} tiros  {g:>4} goles  {c:5.1f}%")
    print("-" * 58)
    print(f"  Mediana distancia REMATE: {m['med_shot']:.1f} m")
    print(f"  Mediana distancia GOL:    {m['med_goal']:.1f} m")
    print(f"  Partidos: {m['matches']}")
    print("=" * 58 + "\n")
    return m


def draw_pitch(ax):
    ax.add_patch(Rectangle((0, 0), L, W, facecolor=FIELD, edgecolor=LINE, lw=1.8, zorder=0))
    for i, x0 in enumerate(range(0, int(L), 9)):       # franjas de pasto
        if i % 2 == 0:
            ax.add_patch(Rectangle((x0, 0), 9, W, facecolor="#DFD4B7", edgecolor="none", zorder=0.5))
    ax.add_patch(Rectangle((BOX_X, GY - BOX_DY), L - BOX_X, 2 * BOX_DY, fill=False, edgecolor=LINE, lw=1.8, zorder=1))
    ax.add_patch(Rectangle((SIX_X, GY - SIX_DY), L - SIX_X, 2 * SIX_DY, fill=False, edgecolor=LINE, lw=1.8, zorder=1))
    ax.add_patch(Rectangle((L, GY - 3.66), 1.4, 7.32, facecolor=DARK, edgecolor=DARK, zorder=2))  # arco
    ax.add_patch(Circle(PEN_SPOT, 0.35, color=LINE, zorder=1))
    ax.add_patch(Arc(PEN_SPOT, 18.3, 18.3, angle=0, theta1=128.1, theta2=231.9, edgecolor=LINE, lw=1.8, zorder=1))
    ax.plot([0, 0], [0, W], color=LINE, lw=1.8, zorder=1)                 # línea media
    ax.add_patch(Arc((0, GY), 18.3, 18.3, angle=0, theta1=-90, theta2=90, edgecolor=LINE, lw=1.8, zorder=1))
    ax.set_xlim(-2, 113)
    ax.set_ylim(-3, 71)
    ax.set_aspect("equal")
    ax.axis("off")


def plot(df, m):
    nonpen = df[df.is_penalty == 0]
    miss = nonpen[nonpen.is_goal == 0]
    goals = nonpen[nonpen.is_goal == 1]

    fig = plt.figure(figsize=(12.5, 9.2), dpi=130)
    fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0.05, 0.04, 0.9, 0.64])
    ax.set_facecolor(BG)
    draw_pitch(ax)

    ax.scatter(miss.xm, miss.ym, s=24, c=SHOT, alpha=0.22, edgecolors="none", zorder=3)
    ax.scatter(goals.xm, goals.ym, s=70, c=GOAL, alpha=0.9, edgecolors="white", linewidths=0.6, zorder=4)

    ax.scatter([3], [67], s=24, c=SHOT, alpha=0.4, zorder=5)
    ax.text(6, 67, "remate", va="center", fontsize=11, color=MUTED)
    ax.scatter([24], [67], s=70, c=GOAL, alpha=0.9, edgecolors="white", linewidths=0.6, zorder=5)
    ax.text(27, 67, "gol", va="center", fontsize=11, color=MUTED)

    # Título
    fig.text(0.05, 0.955, "MUNDIAL 2026  ·  DÓNDE SE DISPARA Y DÓNDE ENTRA",
             fontsize=12, color=GOAL, weight="bold")
    fig.text(0.05, 0.90, "Tiras de lejos.", fontsize=34, color=DARK, weight="bold")
    fig.text(0.05, 0.845, "No entra.", fontsize=34, color=GOAL, weight="bold")

    c_out, c_in = m["outside"][2], m["inside"][2]
    fig.text(0.42, 0.90, f"{c_out:.0f}%", fontsize=40, color=GOAL, weight="bold")
    fig.text(0.50, 0.905, "de los remates desde\nfuera del área son gol.", fontsize=12.5, color=DARK, va="top")
    fig.text(0.50, 0.85, f"Dentro del área la cifra sube a {c_in:.0f}%.", fontsize=11, color=MUTED, va="top")

    # Callouts inferiores (todo sin penales)
    s_tot, g_tot, _ = m["total"]
    c_np = m["nonpen"][2]
    cards = [
        (f"{m['med_shot']:.0f} m", "MEDIANA DE DISTANCIA · REMATE", DARK),
        (f"{m['med_goal']:.0f} m", "MEDIANA DE DISTANCIA · GOL", GOAL),
        (f"{c_np:.0f}%", "DE LOS REMATES (SIN PENALES) SON GOL", DARK),
    ]
    for i, (big, small, col) in enumerate(cards):
        x = 0.07 + i * 0.31
        fig.text(x, 0.135, big, fontsize=30, color=col, weight="bold")
        fig.text(x, 0.085, small, fontsize=9.5, color=MUTED, weight="bold")
        if i > 0:
            fig.text(x - 0.025, 0.10, "|", fontsize=30, color=LINE)

    fig.text(0.05, 0.025,
             f"DATOS: API OFICIAL DE FIFA · {s_tot} REMATES · {g_tot} GOLES · {m['matches']} PARTIDOS · AL 19 JUN 2026",
             fontsize=8.5, color=MUTED, weight="bold")
    fig.text(0.95, 0.025, "ml/shot-map", fontsize=8.5, color=MUTED, weight="bold", ha="right")

    fig.savefig(OUT, facecolor=BG, bbox_inches="tight")
    print(f"Figura -> {OUT}")


def main():
    df = to_m(pd.read_csv(CSV))
    plot(df, metrics(df))


if __name__ == "__main__":
    main()
