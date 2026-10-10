(function () {
  var $ = function (s) { return document.querySelector(s); };
  var rows = [], st = {}, sortKey = 'views', sortDir = -1, view = [];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fmt(n) { return n === '' || n == null ? '—' : Number(n).toLocaleString('ja-JP'); }
  function msg(t) { $('#msg').textContent = t; }

  function parseCsv(text) {
    var out = [], row = [], f = '', q = false, i = 0, c;
    text = text.replace(/^\uFEFF/, '');
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; if (row.length > 1 || row[0] !== '') out.push(row); row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); out.push(row); }
    return out;
  }

  function handleOf(url) {
    var m = String(url || '').match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})(?:[\/?#]|$)/i);
    if (!m) return '';
    return /^(intent|i|home|share|search|hashtag|settings)$/i.test(m[1]) ? '' : m[1];
  }

  function load(text) {
    var t = parseCsv(text);
    if (t.length < 2) return msg('CSVの内容を読み取れませんでした');
    var h = t[0].map(function (s) { return s.trim().toLowerCase(); });
    var ix = function (n) { return h.indexOf(n); };
    if (ix('userid') < 0) return msg('見出し行(userId,name,works,…)が見つかりません');
    rows = t.slice(1).map(function (r) {
      var g = function (n) { var k = ix(n); return k < 0 ? '' : (r[k] || '').trim(); };
      var num = function (n) { var v = g(n); return v === '' ? '' : Number(v) || 0; };
      return { id: g('userid'), name: g('name'), works: num('works') || 0, views: num('views'),
        likes: num('likes'), bookmarks: num('bookmarks'), r18: num('r18') || 0,
        x: g('x'), h: handleOf(g('x')) };
    }).filter(function (r) { return r.id; });
    lsSet('pcv_csv', text);
    $('#tools').hidden = false; $('#tbl').hidden = false;
    msg(rows.length + '人を読み込みました(Xあり ' + rows.filter(function (r) { return r.h; }).length + '人)');
    render();
  }

  function saveSt() { lsSet('pcv_st', JSON.stringify(st)); }
  function flag(r, k) { return !!(st[r.id] && st[r.id][k]); }
  function setFlag(r, k, v) { (st[r.id] = st[r.id] || {})[k] = v; saveSt(); }

  function filtered() {
    var q = $('#q').value.trim().toLowerCase(), mv = Number($('#minv').value) || 0;
    var ox = $('#onlyx').checked, hf = $('#hidef').checked, nr = $('#nor18').checked;
    var list = rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0) return false;
      if (mv && (Number(r.views) || 0) < mv) return false;
      if (ox && !r.h) return false;
      if (hf && flag(r, 'f')) return false;
      if (nr && r.r18 > 0) return false;
      return true;
    });
    var k = sortKey, d = sortDir;
    list.sort(function (a, b) {
      var x, y;
      if (k === 'name') return -d * a.name.localeCompare(b.name);
      if (k === 'f' || k === 'l') { x = flag(a, k) ? 1 : 0; y = flag(b, k) ? 1 : 0; }
      else { x = Number(a[k]) || 0; y = Number(b[k]) || 0; }
      return (y - x) * -d || b.works - a.works;
    });
    return list;
  }

  function render() {
    view = filtered();
    $('#tb').innerHTML = view.map(function (r, i) {
      var f = flag(r, 'f'), l = flag(r, 'l');
      var xs = r.h
        ? '<a class="btn" data-a="follow" data-i="' + i + '" href="https://x.com/intent/follow?screen_name=' + r.h + '" target="_blank" rel="noopener">フォロー</a>' +
          '<a class="btn" data-a="prof" data-i="' + i + '" href="https://x.com/' + r.h + '" target="_blank" rel="noopener">@' + esc(r.h) + '</a>'
        : '<span class="mut">なし</span>';
      return '<tr class="' + (f && l ? 'done' : '') + '">' +
        '<td><input type="checkbox" data-a="cf" data-i="' + i + '"' + (f ? ' checked' : '') + '></td>' +
        '<td><input type="checkbox" data-a="cl" data-i="' + i + '"' + (l ? ' checked' : '') + '></td>' +
        '<td><a href="https://www.pixiv.net/users/' + esc(r.id) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a></td>' +
        '<td class="n">' + fmt(r.works) + '</td><td class="n">' + fmt(r.views) + '</td>' +
        '<td class="n">' + fmt(r.likes) + '</td><td class="n">' + fmt(r.bookmarks) + '</td>' +
        '<td class="n">' + (r.r18 || '') + '</td><td>' + xs + '</td></tr>';
    }).join('');
    var nf = rows.filter(function (r) { return flag(r, 'f'); }).length;
    var nl = rows.filter(function (r) { return flag(r, 'l'); }).length;
    $('#stat').textContent = '表示 ' + view.length + ' / ' + rows.length + '人 ・ フォロー済 ' + nf + ' ・ リスト追加済 ' + nl;
  }

  $('#tb').addEventListener('click', function (e) {
    var t = e.target, a = t.getAttribute && t.getAttribute('data-a');
    if (!a) return;
    var r = view[Number(t.getAttribute('data-i'))];
    if (!r) return;
    if (a === 'cf') { setFlag(r, 'f', t.checked); render(); }
    else if (a === 'cl') { setFlag(r, 'l', t.checked); render(); }
    else if (a === 'follow') { setFlag(r, 'f', true); setTimeout(render, 0); }
  });

  function openNext(key, urlOf) {
    var r = view.filter(function (v) { return v.h && !flag(v, key); })[0];
    if (!r) return msg('表示中の対象はすべて処理済みです');
    setFlag(r, key, true);
    window.open(urlOf(r), '_blank', 'noopener');
    msg((key === 'f' ? 'フォロー画面' : 'プロフィール') + 'を開きました: @' + r.h);
    render();
  }
  $('#nextF').onclick = function () { openNext('f', function (r) { return 'https://x.com/intent/follow?screen_name=' + r.h; }); };
  $('#nextL').onclick = function () { openNext('l', function (r) { return 'https://x.com/' + r.h; }); };

  $('#copyH').onclick = function () {
    var hs = view.filter(function (r) { return r.h; });
    var t = hs.map(function (r) { return '@' + r.h; }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { msg('X IDを' + hs.length + '件コピーしました'); }, function () { msg('コピーに失敗しました'); });
    else msg('このブラウザではコピーできません');
  };

  document.querySelector('thead').addEventListener('click', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-k');
    if (!k) return;
    if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = -1; }
    render();
  });
  ['#q', '#minv'].forEach(function (s) { $(s).addEventListener('input', render); });
  ['#onlyx', '#hidef', '#nor18'].forEach(function (s) { $(s).addEventListener('change', render); });

  $('#load').onclick = function () { load($('#paste').value); };
  $('#file').onchange = function () {
    var f = this.files[0]; if (!f) return;
    var rd = new FileReader(); rd.onload = function () { load(String(rd.result)); }; rd.readAsText(f, 'utf-8');
  };
  $('#clear').onclick = function () { if (confirm('フォロー済・リスト追加済の記録を消しますか?')) { st = {}; saveSt(); render(); } };

  try { st = JSON.parse(lsGet('pcv_st') || '{}') || {}; } catch (e) { st = {}; }
  var saved = lsGet('pcv_csv');
  if (saved) load(saved);
})();
