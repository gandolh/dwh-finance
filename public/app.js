'use strict';

// Same-origin: the UI is served by Fastify, so API_BASE is empty.
const API_BASE = '';

// ---------- small helpers ----------

async function api(path, params) {
  let url = API_BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    }
    const s = qs.toString();
    if (s) url += '?' + s;
  }
  const res = await fetch(url);
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg = (body && body.error) || res.status + ' ' + res.statusText;
    throw new Error(msg);
  }
  return body;
}

function el(id) {
  return document.getElementById(id);
}

function setStatus(id, msg, isError) {
  const node = el(id);
  node.textContent = msg || '';
  node.classList.toggle('error', !!isError);
}

function fmtDate(value) {
  if (value === undefined || value === null) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function fmtNum(v) {
  if (typeof v !== 'number') return v;
  return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function bool(v) {
  return v
    ? '<span class="badge yes">yes</span>'
    : '<span class="badge no">no</span>';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

// Canvas line chart. series = [{ points: [{x:Date|num, y:num}], color, label }]
function drawLineChart(canvas, series) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const pad = { l: 60, r: 16, t: 16, b: 28 };

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    ctx.fillStyle = '#6b7585';
    ctx.font = '13px sans-serif';
    ctx.fillText('No data to plot.', pad.l, H / 2);
    return;
  }

  const xs = all.map((p) => +p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const sx = (x) =>
    pad.l + ((+x - minX) / (maxX - minX || 1)) * (W - pad.l - pad.r);
  const sy = (y) =>
    H - pad.b - ((y - minY) / (maxY - minY)) * (H - pad.t - pad.b);

  // axes + y labels
  ctx.strokeStyle = '#d9dde3';
  ctx.fillStyle = '#6b7585';
  ctx.font = '11px sans-serif';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * (H - pad.t - pad.b);
    const val = maxY - (i / 4) * (maxY - minY);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillText(fmtNum(Number(val.toFixed(2))), 6, y + 3);
  }

  // lines
  for (const s of series) {
    if (!s.points.length) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    s.points
      .slice()
      .sort((a, b) => +a.x - +b.x)
      .forEach((p, i) => {
        const X = sx(p.x);
        const Y = sy(p.y);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
    ctx.stroke();
  }

  // legend
  let lx = pad.l;
  ctx.font = '12px sans-serif';
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, 4, 12, 4);
    ctx.fillStyle = '#1c2330';
    ctx.fillText(s.label, lx + 16, 9);
    lx += 24 + ctx.measureText(s.label).width + 16;
  }
}

// ---------- tab switching ----------

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    el(btn.dataset.tab).classList.add('active');
  });
});

// ---------- shared caches ----------

let providerCache = []; // [{_id, name, ...}]
let providerById = {};

async function ensureProviders() {
  if (providerCache.length) return providerCache;
  providerCache = (await api('/api/v1/providers/')) || [];
  providerById = {};
  providerCache.forEach((p) => (providerById[String(p._id)] = p));
  return providerCache;
}

// ===================================================================
//  ASSETS (Q1, Q2, temporal)
// ===================================================================

async function loadAssets() {
  setStatus('assets-status', 'Loading…');
  const offset = el('assets-offset').value || 0;
  const limit = el('assets-limit').value || 20;
  try {
    const assets = (await api('/api/v1/assets/', { offset, limit })) || [];
    const tbody = el('assets-table').querySelector('tbody');
    tbody.innerHTML = '';
    assets.forEach((a) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + esc(a.symbol) + '</td>' +
        '<td>' + esc(a.type) + '</td>' +
        '<td>' + esc(a.region) + '</td>' +
        '<td>' + esc(a.description) + '</td>';
      tr.addEventListener('click', () => {
        tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('selected'));
        tr.classList.add('selected');
        showAssetDetail(a);
      });
      tbody.appendChild(tr);
    });
    setStatus('assets-status', assets.length + ' asset(s)');
    populateAssetSelectors(assets);
  } catch (e) {
    setStatus('assets-status', e.message, true);
  }
}

async function showAssetDetail(asset) {
  const box = el('asset-detail');
  box.classList.remove('empty');
  const id = asset._id;
  box.innerHTML =
    '<h4>' + esc(asset.symbol) + ' — details</h4>' +
    '<div class="asof">' +
    '<label style="color:#6b7585;font-size:12px">As of (temporal): ' +
    '<input type="date" id="asof-input" /></label>' +
    '<button id="asof-go">View state</button>' +
    '<button id="asof-now">Latest</button></div>' +
    '<pre id="asset-json">' + esc(JSON.stringify(asset, null, 2)) + '</pre>' +
    '<h4>Version history</h4>' +
    '<div id="asset-history">loading…</div>';

  el('asof-go').addEventListener('click', async () => {
    const d = el('asof-input').value;
    if (!d) return;
    try {
      const v = await api('/api/v1/assets/' + id, { asOf: d + 'T23:59:59Z' });
      el('asset-json').textContent = JSON.stringify(v, null, 2);
    } catch (e) {
      el('asset-json').textContent = 'Error: ' + e.message;
    }
  });
  el('asof-now').addEventListener('click', async () => {
    try {
      const v = await api('/api/v1/assets/' + id);
      el('asset-json').textContent = JSON.stringify(v, null, 2);
    } catch (e) {
      el('asset-json').textContent = 'Error: ' + e.message;
    }
  });

  // version history
  try {
    const history = (await api('/api/v1/assets/' + id + '/history')) || [];
    const wrap = el('asset-history');
    if (!history.length) {
      wrap.innerHTML = '<span class="muted">No version history.</span>';
      return;
    }
    wrap.innerHTML = history
      .map(
        (v) =>
          '<div class="history-item">' +
          '<strong>v' + esc(v.version) + '</strong> &middot; ' +
          'provider: ' + esc(v.dataProviderName || '—') + ' &middot; ' +
          'deleted: ' + bool(v.isDeleted) + '<br/>' +
          'valid: ' + esc(fmtDate(v.validFrom)) + ' → ' +
          esc(v.validTo ? fmtDate(v.validTo) : 'present') +
          '</div>'
      )
      .join('');
  } catch (e) {
    el('asset-history').innerHTML =
      '<span class="status error">' + esc(e.message) + '</span>';
  }
}

// fill the Time Series + Analytics asset dropdowns
function populateAssetSelectors(assets) {
  ['ts-asset', 'an-asset'].forEach((selId) => {
    const sel = el(selId);
    const keep = sel.value;
    const first = sel.querySelector('option');
    sel.innerHTML = '';
    sel.appendChild(first);
    assets.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a._id;
      opt.textContent = a.symbol + ' (' + a.type + ')';
      sel.appendChild(opt);
    });
    if (keep) sel.value = keep;
  });
}

el('assets-reload').addEventListener('click', loadAssets);

// ===================================================================
//  PROVIDERS (Q3, Q4)
// ===================================================================

async function loadProviders() {
  setStatus('providers-status', 'Loading…');
  try {
    const providers = await ensureProviders();
    const tbody = el('providers-table').querySelector('tbody');
    tbody.innerHTML = '';
    providers.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + esc(p.name) + '</td>' +
        '<td>' + esc(p.apiVersion) + '</td>' +
        '<td>' + bool(p.isActive) + '</td>' +
        '<td>' + esc((p.discoveredAttributes || []).join(', ')) + '</td>';
      tr.addEventListener('click', () => {
        tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('selected'));
        tr.classList.add('selected');
        showProviderDetail(p.name);
      });
      tbody.appendChild(tr);
    });
    setStatus('providers-status', providers.length + ' provider(s)');
  } catch (e) {
    setStatus('providers-status', e.message, true);
  }
}

async function showProviderDetail(name) {
  const box = el('provider-detail');
  box.classList.remove('empty');
  box.innerHTML = 'loading…';
  try {
    const p = await api('/api/v1/providers/' + encodeURIComponent(name));
    box.innerHTML =
      '<h4>' + esc(p.name) + '</h4>' +
      '<pre>' + esc(JSON.stringify(p, null, 2)) + '</pre>';
  } catch (e) {
    box.innerHTML = '<span class="status error">' + esc(e.message) + '</span>';
  }
}

el('providers-reload').addEventListener('click', loadProviders);

// ===================================================================
//  TIME SERIES (Q5)
// ===================================================================

let tsState = { cursor: null, points: [], rows: [] };

async function onTsAssetChange() {
  const assetId = el('ts-asset').value;
  const sel = el('ts-provider');
  sel.innerHTML = '<option value="">— pick provider —</option>';
  if (!assetId) return;
  setStatus('ts-status', 'Finding providers…');
  try {
    await ensureProviders();
    const ids = (await api('/api/v1/data/providers-for-asset', { assetId })) || [];
    if (!ids.length) {
      setStatus('ts-status', 'No provider has data for this asset yet.');
      return;
    }
    ids.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = String(id);
      const p = providerById[String(id)];
      opt.textContent = p ? p.name : String(id);
      sel.appendChild(opt);
    });
    setStatus('ts-status', ids.length + ' provider(s) with data');
  } catch (e) {
    setStatus('ts-status', e.message, true);
  }
}

function renderTsTable() {
  const rows = tsState.rows;
  const table = el('ts-table');
  // collect data field keys across rows
  const keys = [];
  rows.forEach((r) => {
    const d = r.data || {};
    Object.keys(d).forEach((k) => {
      if (!keys.includes(k)) keys.push(k);
    });
  });
  table.querySelector('thead').innerHTML =
    '<tr><th>Timestamp</th>' + keys.map((k) => '<th>' + esc(k) + '</th>').join('') + '</tr>';
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = rows
    .map((r) => {
      const d = r.data || {};
      return (
        '<tr class="static"><td>' + esc(fmtDate(r.timestamp)) + '</td>' +
        keys.map((k) => '<td>' + esc(fmtNum(d[k])) + '</td>').join('') +
        '</tr>'
      );
    })
    .join('');
}

function renderTsChart() {
  const points = tsState.rows
    .filter((r) => r.data && typeof r.data.close === 'number')
    .map((r) => ({ x: new Date(r.timestamp), y: r.data.close }));
  drawLineChart(el('ts-chart'), [{ points, color: '#2b6cb0', label: 'close' }]);
}

async function loadTimeSeries(append) {
  const assetId = el('ts-asset').value;
  const providerId = el('ts-provider').value;
  const start = el('ts-start').value;
  const end = el('ts-end').value;
  const limit = el('ts-limit').value || 50;
  if (!assetId || !providerId) {
    setStatus('ts-status', 'Pick an asset and a provider.', true);
    return;
  }
  if (!start || !end) {
    setStatus('ts-status', 'Pick a start and end date.', true);
    return;
  }
  setStatus('ts-status', 'Loading…');
  const params = {
    assetId,
    providerId,
    startDate: start + 'T00:00:00Z',
    endDate: end + 'T23:59:59Z',
    limit,
  };
  if (append && tsState.cursor) {
    params.cursorTimestamp = tsState.cursor.cursorTimestamp;
    params.cursorId = tsState.cursor.cursorId;
  }
  try {
    const resp = await api('/api/v1/data/', params);
    const data = (resp && resp.data) || [];
    if (!append) tsState.rows = [];
    tsState.rows = tsState.rows.concat(data);
    tsState.cursor = resp ? resp.nextCursor : null;
    renderTsTable();
    renderTsChart();
    el('ts-more').disabled = !tsState.cursor;
    setStatus(
      'ts-status',
      tsState.rows.length + ' point(s)' + (tsState.cursor ? ' (more available)' : '')
    );
  } catch (e) {
    setStatus('ts-status', e.message, true);
  }
}

el('ts-asset').addEventListener('change', onTsAssetChange);
el('ts-load').addEventListener('click', () => loadTimeSeries(false));
el('ts-more').addEventListener('click', () => loadTimeSeries(true));

// ===================================================================
//  ANALYTICS (UC3)
// ===================================================================

async function loadSummaries() {
  setStatus('an-summaries-status', 'Loading…');
  const assetId = el('an-asset').value;
  try {
    const rows = (await api('/api/v1/analytics/summaries', { assetId })) || [];
    const tbody = el('an-summaries-table').querySelector('tbody');
    if (!rows.length) {
      tbody.innerHTML =
        '<tr class="static"><td colspan="6" class="muted">No summaries yet — run the Spark aggregation job.</td></tr>';
      setStatus('an-summaries-status', '0 rows');
      return;
    }
    tbody.innerHTML = rows
      .map(
        (r) =>
          '<tr class="static"><td>' + esc(r.assetId) + '</td>' +
          '<td>' + esc(r.year) + '</td>' +
          '<td>' + esc(fmtNum(r.avg_close)) + '</td>' +
          '<td>' + esc(fmtNum(r.max_high)) + '</td>' +
          '<td>' + esc(fmtNum(r.min_low)) + '</td>' +
          '<td>' + esc(r.record_count) + '</td></tr>'
      )
      .join('');
    setStatus('an-summaries-status', rows.length + ' row(s)');
  } catch (e) {
    setStatus('an-summaries-status', e.message, true);
  }
}

async function loadPredictions() {
  setStatus('an-predictions-status', 'Loading…');
  const assetId = el('an-asset').value;
  const tbody = el('an-predictions-table').querySelector('tbody');
  if (!assetId) {
    tbody.innerHTML =
      '<tr class="static"><td colspan="3" class="muted">Pick an asset above to see its predictions.</td></tr>';
    drawLineChart(el('an-chart'), []);
    setStatus('an-predictions-status', 'pick an asset');
    return;
  }
  try {
    const rows = (await api('/api/v1/analytics/predictions', { assetId })) || [];
    if (!rows.length) {
      tbody.innerHTML =
        '<tr class="static"><td colspan="3" class="muted">No predictions for this asset — run the Spark prediction job.</td></tr>';
      drawLineChart(el('an-chart'), []);
      setStatus('an-predictions-status', '0 rows');
      return;
    }
    tbody.innerHTML = rows
      .map(
        (r) =>
          '<tr class="static"><td>' + esc(fmtDate(r.label_time * 1000)) + '</td>' +
          '<td>' + esc(fmtNum(r.label)) + '</td>' +
          '<td>' + esc(fmtNum(r.prediction)) + '</td></tr>'
      )
      .join('');
    const actual = rows
      .filter((r) => typeof r.label === 'number')
      .map((r) => ({ x: r.label_time * 1000, y: r.label }));
    const pred = rows
      .filter((r) => typeof r.prediction === 'number')
      .map((r) => ({ x: r.label_time * 1000, y: r.prediction }));
    drawLineChart(el('an-chart'), [
      { points: actual, color: '#2b6cb0', label: 'actual' },
      { points: pred, color: '#c0392b', label: 'prediction' },
    ]);
    setStatus('an-predictions-status', rows.length + ' row(s)');
  } catch (e) {
    setStatus('an-predictions-status', e.message, true);
  }
}

el('an-summaries').addEventListener('click', loadSummaries);
el('an-predictions').addEventListener('click', loadPredictions);

// ===================================================================
//  init
// ===================================================================

(function init() {
  const now = new Date();
  const past = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  el('ts-start').value = toDateInput(past);
  el('ts-end').value = toDateInput(now);
  loadAssets();
})();
