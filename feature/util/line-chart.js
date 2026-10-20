// A small single-series line chart as inline SVG: one value per day,
// recessive grid, min/max on the y axis, first/last day on the x axis, and
// a tooltip on each point (hover target bigger than the dot).

const W = 320;
const H = 150;
const PAD = { l: 44, r: 12, t: 12, b: 26 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// points: [{ x: label, y: number | null }]; fmt: number -> text
export function lineChart(points, fmt = (v) => String(Math.round(v))) {
    const pts = points.filter((p) => typeof p.y === "number");
    if (pts.length === 0) return `<p class="chart-empty">No data yet.</p>`;

    let lo = Math.min(...pts.map((p) => p.y));
    let hi = Math.max(...pts.map((p) => p.y));
    if (hi === lo) {
        lo -= 1;
        hi += 1;
    }
    const pad = (hi - lo) * 0.1;
    lo -= pad;
    hi += pad;

    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const xAt = (i) => PAD.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
    const yAt = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * ih;

    const grid = [hi - pad, lo + pad]
        .map((v) => `<line class="chart-grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${yAt(v)}" y2="${yAt(v)}"/>
            <text class="chart-axis" x="${PAD.l - 6}" y="${yAt(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`)
        .join("");
    const path = pts.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join("");
    const dots = pts
        .map((p, i) => `<g class="chart-point">
            <circle cx="${xAt(i)}" cy="${yAt(p.y)}" r="10" fill="transparent"/>
            <circle class="chart-dot" cx="${xAt(i)}" cy="${yAt(p.y)}" r="4"/>
            <title>${esc(p.x)}: ${esc(fmt(p.y))}</title></g>`)
        .join("");
    const xLabels =
        `<text class="chart-axis" x="${PAD.l}" y="${H - 6}">${esc(pts[0].x)}</text>` +
        (pts.length > 1
            ? `<text class="chart-axis" x="${W - PAD.r}" y="${H - 6}" text-anchor="end">${esc(pts[pts.length - 1].x)}</text>`
            : "");

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
        ${grid}<path class="chart-line" d="${path}"/>${dots}${xLabels}</svg>`;
}
