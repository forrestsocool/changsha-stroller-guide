'use strict';

function validListing(item) {
  if (!item || !/^\d+$/.test(item.id) || !item.title?.trim() ||
      !item.bedType?.trim() || !item.material?.trim() || !item.district?.trim()) return false;
  if (!['observed', 'unavailable'].includes(item.status) ||
      !item.observedAt || !Number.isFinite(Date.parse(item.observedAt)) ||
      !item.evidence?.trim()) return false;
  if (item.price !== null && (!Number.isFinite(item.price) || item.price < 0)) return false;
  try {
    const url = new URL(item.url);
    return url.origin === 'https://www.goofish.com' && url.pathname === '/item' &&
      url.searchParams.get('id') === item.id;
  } catch { return false; }
}
function normalizeListings(rows) {
  const byId = new Map();
  for (const row of rows.filter(validListing)) {
    if (!byId.has(row.id) || Date.parse(row.observedAt) > Date.parse(byId.get(row.id).observedAt)) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}
function verifiedPhoto(item) {
  const photo = item.photo;
  if (!photo || photo.itemId !== item.id || photo.sourceUrl !== item.url ||
      photo.verified !== true) return null;
  try {
    const url = new URL(photo.url);
    if (url.protocol !== 'https:' ||
        !(url.hostname === 'alicdn.com' || url.hostname.endsWith('.alicdn.com'))) return null;
    return photo.url;
  } catch { return null; }
}
// Reference groups are derived from source observations, never pre-filled brands.
function buildReferences(rows) {
  const groups = new Map();
  for (const item of normalizeListings(rows).filter(i => i.status === 'observed')) {
    const key = JSON.stringify([item.bedType, item.material]);
    if (!groups.has(key)) groups.set(key, { key, bedType: item.bedType, material: item.material, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()].map(group => {
    const prices = group.items.map(i => i.price).filter(Number.isFinite);
    return { ...group, minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null };
  });
}
function filterListings(rows, filters = {}) {
  const query = (filters.query || '').trim().toLocaleLowerCase();
  const result = normalizeListings(rows).filter(item =>
    (!filters.type || item.bedType === filters.type) &&
    (!filters.material || item.material === filters.material) &&
    (!filters.district || item.district === filters.district) &&
    (!filters.status || item.status === filters.status) &&
    (!query || [item.title, item.brand, item.bedType, item.material, item.district, item.description]
      .join(' ').toLocaleLowerCase().includes(query)));
  return result.sort((a, b) => {
    if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
      if (a.price === null) return b.price === null ? 0 : 1;
      if (b.price === null) return -1;
      return (a.price - b.price) * (filters.sort === 'price-asc' ? 1 : -1);
    }
    return Date.parse(b.observedAt) - Date.parse(a.observedAt);
  });
}
if (typeof module !== 'undefined') {
  module.exports = { validListing, normalizeListings, verifiedPhoto, buildReferences, filterListings };
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  const rows = normalizeListings(cribData.listings);
  const references = buildReferences(rows);
  const $ = id => document.getElementById(id);
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const link = (text, url) => {
    const element = make('a', text, 'btn-secondary');
    element.href = url;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    return element;
  };
  const money = value => value === null ? '价格待核实' : '¥' + value;
  const photo = item => {
    const box = make('div', undefined, 'listing-photo');
    const fallback = () => box.replaceChildren(make('span', '暂无已核实实拍 · 请查看原商品'));
    const url = verifiedPhoto(item);
    if (!url) fallback();
    else {
      const img = make('img');
      img.alt = item.title;
      img.loading = 'lazy';
      img.addEventListener('error', fallback, { once: true });
      img.src = url;
      box.append(img);
    }
    return box;
  };
  const fillOptions = (id, values) => {
    for (const value of [...new Set(values)].sort()) {
      const option = make('option', value);
      option.value = value;
      $(id).append(option);
    }
  };
  fillOptions('type-filter', rows.map(i => i.bedType));
  fillOptions('material-filter', rows.map(i => i.material));
  fillOptions('district-filter', rows.map(i => i.district));
  $('collection-status').textContent = cribData.collection.message;
  $('items-total').textContent = rows.filter(i => i.status === 'observed').length;
  $('types-total').textContent = references.length;
  $('last-checked').textContent = cribData.collection.checkedAt || '尚未完成';
  let returnFocus;
  const dialog = $('detail-dialog');
  const showItem = item => {
    returnFocus = document.activeElement;
    $('detail-title').textContent = item.title;
    const body = $('detail-body');
    body.replaceChildren(photo(item));
    for (const [name, value] of [
      ['挂牌价格', money(item.price)], ['床型', item.bedType], ['材质（卖家自述）', item.material],
      ['品牌（可未知）', item.brand || '未知'], ['区域', item.district],
      ['尺寸（卖家自述）', item.dimensions || '待核实'], ['配件（卖家自述）', item.accessories || '待核实'],
      ['商品描述摘录', item.description || '未记录'], ['采集依据', item.evidence],
      ['观察时间', item.observedAt], ['页面状态', item.status === 'observed' ? '采集时可见，不代表当前在售' : '已失效'],
      ['待核实事项', item.questions || '实际成色、配件、尺寸及提货条件']
    ]) body.append(make('p', name + '：' + value));
    body.append(link('查看闲鱼原商品 ↗', item.url));
    dialog.showModal();
  };
  $('close-detail').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => returnFocus?.focus());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  function renderItems() {
    const filtered = filterListings(rows, {
      query: $('item-search').value, type: $('type-filter').value,
      material: $('material-filter').value, district: $('district-filter').value,
      status: $('status-filter').value, sort: $('sort-filter').value
    });
    $('result-count').textContent = filtered.length;
    const container = $('listings');
    container.replaceChildren();
    if (!filtered.length) container.append(make('div', rows.length ? '没有符合条件的记录，请调整筛选。' :
      '暂无已核验床源。真实商品采集完成后，这里将展示商品实拍、价格、区域和来源链接。', 'empty-state'));
    for (const item of filtered) {
      const card = make('article', undefined, 'listing-card');
      card.append(photo(item), make('h3', item.title), make('strong', money(item.price), 'price'),
        make('p', item.bedType + ' · ' + item.material), make('p', item.district),
        make('p', (item.status === 'observed' ? '采集时可见' : '已失效') + ' · ' + item.observedAt));
      const button = make('button', '查看记录与待核实事项', 'btn-secondary');
      button.addEventListener('click', () => showItem(item));
      card.append(button);
      container.append(card);
    }
  }
  function renderReferences() {
    const query = $('reference-search').value.trim().toLocaleLowerCase();
    const filtered = references.filter(group => (group.bedType + ' ' + group.material).toLocaleLowerCase().includes(query));
    $('reference-count').textContent = filtered.length;
    const container = $('references');
    container.replaceChildren();
    if (!filtered.length) container.append(make('div', references.length ? '没有匹配的床型。' :
      '尚无可汇总的真实样本。床型参考库将在床源采集后自动生成。', 'empty-state'));
    for (const group of filtered) {
      const card = make('article', undefined, 'listing-card reference-card');
      card.append(make('h3', group.bedType), make('p', '材质（卖家自述）：' + group.material),
        make('p', '样本：' + group.items.length + ' 条'),
        make('strong', group.minPrice === null ? '暂无价格样本' :
          '观察挂牌价：¥' + group.minPrice + '–' + group.maxPrice, 'price'),
        make('p', '仅描述采集样本，不是成交价、市场估价或安全评级。'));
      for (const item of group.items) {
        const button = make('button', '来源：' + item.title, 'source-button');
        button.addEventListener('click', () => showItem(item));
        card.append(button);
      }
      container.append(card);
    }
  }
  function switchTab() {
    const selected = location.hash === '#models' ? 'models' : 'waterfall';
    document.querySelectorAll('[data-tab]').forEach(button => {
      const active = button.dataset.tab === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('waterfall-panel').hidden = selected !== 'waterfall';
    $('models-panel').hidden = selected !== 'models';
  }
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    location.hash = button.dataset.tab;
  }));
  window.addEventListener('hashchange', switchTab);
  $('item-search').addEventListener('input', renderItems);
  for (const id of ['type-filter', 'material-filter', 'district-filter', 'status-filter', 'sort-filter']) {
    $(id).addEventListener('change', renderItems);
  }
  $('reset-filters').addEventListener('click', () => {
    for (const id of ['item-search', 'type-filter', 'material-filter', 'district-filter']) $(id).value = '';
    $('status-filter').value = 'observed';
    $('sort-filter').value = 'recent';
    renderItems();
  });
  $('reference-search').addEventListener('input', renderReferences);
  renderItems();
  renderReferences();
  switchTab();
});
