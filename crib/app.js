/**
 * 中高端实木多功能婴儿床（长沙闲鱼选购指南）- 交互应用逻辑
 */

// 全局应用状态
const state = {
  activeTab: 'waterfall', // 默认首屏瀑布流，支持 #models 切换
  
  // 床型库筛选
  modelFilterTier: 'all',
  modelSearchQuery: '',
  
  // 床源瀑布流筛选
  itemFilterModel: 'all',
  itemFilterDistrict: 'all',
  itemFilterStatus: 'all',
  itemSortBy: 'default',
  itemSearchQuery: ''
};

/**
 * 客户端环境智能识别
 */
const Device = {
  isMobile() {
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
           (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  },
  isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  },
  isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  },
  isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent || '');
  }
};

/**
 * 智能打开闲鱼（移动端优先调起 App，支持 Android Intent 与 iOS Scheme，未安装自动优雅降级）
 */
function openXianyuItem(itemId, fallbackWebUrl, e) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
  }

  const h5Url = fallbackWebUrl || `https://www.goofish.com/item?id=${itemId}`;

  if (!Device.isMobile()) {
    // 桌面端环境：直接打开新标签页访问网页版
    window.open(h5Url, '_blank', 'noopener,noreferrer');
    return;
  }

  // 微信内置浏览器防拦截引导
  if (Device.isWeChat()) {
    showToast('💡 微信已拦截外部跳转，请点击右上角选择【在默认浏览器打开】即可直达闲鱼 App');
    setTimeout(() => {
      window.location.href = h5Url;
    }, 1200);
    return;
  }

  showToast('🚀 正在尝试调起闲鱼 App...');

  // 闲鱼常用协议 Scheme
  const primaryScheme = `fleamarket://itemDetail?itemId=${itemId}`;

  if (Device.isAndroid()) {
    // Android 端：使用 Chrome Intent 协议规范，未安装自动跳转 S.browser_fallback_url
    const androidIntent = `intent://itemDetail?itemId=${itemId}#Intent;scheme=fleamarket;package=com.taobao.idlefish;S.browser_fallback_url=${encodeURIComponent(h5Url)};end`;
    const start = Date.now();
    window.location.href = androidIntent;

    setTimeout(() => {
      if (Date.now() - start < 2000 && !document.hidden) {
        window.location.href = h5Url;
      }
    }, 1500);
  } else if (Device.isIOS()) {
    // iOS 端（如 iPhone 11）：通过 fleamarket:// 协议直接唤起闲鱼 App
    const start = Date.now();
    window.location.href = primaryScheme;

    // 兜底定时器：若 1.6 秒后仍在当前前台页面（说明未安装或用户取消），自动用浏览器打开网页版
    setTimeout(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 2200 && !document.hidden) {
        window.location.href = h5Url;
      }
    }, 1600);
  } else {
    window.location.href = h5Url;
  }
}

// DOM 初始化入口
document.addEventListener('DOMContentLoaded', () => {
  initUrlHash();
  bindGlobalEvents();
  renderModels();
  renderWaterfallItems();
  updateStats();
});

/**
 * URL Hash 路由同步
 */
function initUrlHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'models' || hash === 'waterfall') {
    switchTab(hash);
  } else {
    switchTab('waterfall');
  }
}

/**
 * 绑定全局事件
 */
function bindGlobalEvents() {
  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // 床型库筛选 Chips
  document.querySelectorAll('#models-filter-chips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#models-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.modelFilterTier = chip.getAttribute('data-tier');
      renderModels();
    });
  });

  // 床型库搜索框
  const modelSearchInput = document.getElementById('model-search-input');
  if (modelSearchInput) {
    modelSearchInput.addEventListener('input', debounce((e) => {
      state.modelSearchQuery = e.target.value.trim().toLowerCase();
      renderModels();
    }, 200));
  }

  // 床源瀑布流品牌/系列筛选器
  document.querySelectorAll('#waterfall-model-chips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#waterfall-model-chips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.itemFilterModel = chip.getAttribute('data-model');
      renderWaterfallItems();
    });
  });

  // 床源瀑布流优先级筛选
  document.querySelectorAll('#waterfall-status-chips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#waterfall-status-chips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.itemFilterStatus = chip.getAttribute('data-status');
      renderWaterfallItems();
    });
  });

  // 区域下拉筛选
  const districtSelect = document.getElementById('district-select');
  if (districtSelect) {
    districtSelect.addEventListener('change', (e) => {
      state.itemFilterDistrict = e.target.value;
      renderWaterfallItems();
    });
  }

  // 排序下拉
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.itemSortBy = e.target.value;
      renderWaterfallItems();
    });
  }

  // 床源搜索框
  const itemSearchInput = document.getElementById('item-search-input');
  if (itemSearchInput) {
    itemSearchInput.addEventListener('input', debounce((e) => {
      state.itemSearchQuery = e.target.value.trim().toLowerCase();
      renderWaterfallItems();
    }, 200));
  }

  // 避坑黑榜与验床清单按钮
  const btnExcluded = document.getElementById('btn-show-excluded');
  if (btnExcluded) {
    btnExcluded.addEventListener('click', showExcludedModal);
  }

  const btnChecklist = document.getElementById('btn-show-checklist');
  if (btnChecklist) {
    btnChecklist.addEventListener('click', showChecklistModal);
  }

  // 弹窗通用遮罩关闭与 ESC 键盘支持
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  document.querySelectorAll('.modal-close-btn, .btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

/**
 * 切换主标签页
 */
function switchTab(tabName) {
  state.activeTab = tabName;
  window.location.hash = tabName;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-pane-${tabName}`);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 更新顶部统计数据
 */
function updateStats() {
  const modelsCountEl = document.getElementById('stat-models-count');
  const itemsCountEl = document.getElementById('stat-items-count');
  if (modelsCountEl) modelsCountEl.textContent = models.length;
  if (itemsCountEl) itemsCountEl.textContent = items.length;

  const tabModelCount = document.getElementById('tab-count-models');
  const tabItemCount = document.getElementById('tab-count-items');
  if (tabModelCount) tabModelCount.textContent = models.length;
  if (tabItemCount) tabItemCount.textContent = items.length;
}

/**
 * 渲染 Tab 1: 床型参考库
 */
function renderModels() {
  const container = document.getElementById('models-grid-container');
  if (!container) return;

  const filtered = models.filter(m => {
    // 档位筛选
    if (state.modelFilterTier === 'tier1' && m.tier !== 'tier1') return false;
    if (state.modelFilterTier === 'tier2' && m.tier !== 'tier2') return false;
    if (state.modelFilterTier === 'tier3' && m.tier !== 'tier3') return false;
    if (state.modelFilterTier === 'beech' && !m.frame.includes('榉木')) return false;
    if (state.modelFilterTier === 'join' && !m.recline.includes('拼接') && !m.headline.includes('拼大床')) return false;
    if (state.modelFilterTier === 'desk' && !m.recline.includes('书桌') && !m.tags.some(t => t.includes('书桌'))) return false;

    // 搜索词过滤
    if (state.modelSearchQuery) {
      const q = state.modelSearchQuery;
      const match = m.name.toLowerCase().includes(q) ||
                    m.code.toLowerCase().includes(q) ||
                    m.headline.toLowerCase().includes(q) ||
                    m.frame.toLowerCase().includes(q) ||
                    m.tags.some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const countEl = document.getElementById('models-count-display');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: #94a3b8;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <p>未找到符合条件的婴儿床型，请尝试清空搜索词或切换档位。</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const photoUrl = photos[m.imageItem] || photos['crib_gb_mc828'];
    const stars = '★'.repeat(m.rating) + '☆'.repeat(5 - m.rating);

    // 计算当前长沙关联床源数量
    const matchedItems = items.filter(item => item.model === m.id);

    return `
      <article class="model-card" onclick="openModelModal('${m.id}')" title="点击查看 ${m.name} 详情与卖点">
        <div class="model-card-header">
          <img class="model-card-img" src="${photoUrl}" alt="${m.name} ${m.code}" loading="lazy" onerror="this.src='${photos['crib_gb_mc828']}'" />
          <span class="model-tier-badge tier-${m.tier}">
            ${m.tier === 'tier1' ? '🥇 强烈推荐蹲' : m.tier === 'tier2' ? '🥈 价格合适可入' : '🥉 极低价才考虑'}
          </span>
          <span class="model-rating-badge" title="二手推荐度 ${m.rating}星">
            ${stars}
          </span>
        </div>
        <div class="model-card-body">
          <div class="model-card-title-group">
            <h3 class="model-name">${m.name}</h3>
            <span class="model-code">${m.code}</span>
          </div>

          <div class="model-headline">“${m.headline}”</div>

          <div class="model-price-box">
            <div class="price-col">
              <span class="price-col-lbl">当年新床参考</span>
              <span class="price-col-val">${m.price}</span>
            </div>
            <div class="price-col">
              <span class="price-col-lbl">闲鱼建议入手价</span>
              <span class="price-col-val target-price">${m.fairPrice}</span>
            </div>
          </div>

          <div class="model-specs-grid">
            <div class="spec-item" title="整床自重: ${m.weight}">
              <span class="icon">⚖️</span> <strong>${m.weight}</strong>
            </div>
            <div class="spec-item" title="实木材质: ${m.frame}">
              <span class="icon">🪵</span> <span>${m.frame.split(' ')[0]}</span>
            </div>
            <div class="spec-item" title="功能模式: ${m.recline}">
              <span class="icon">🛏️</span> <span>${m.recline.split(' · ')[0]}</span>
            </div>
            <div class="spec-item" title="脚轮移动: ${m.direction}">
              <span class="icon">🛞</span> <span>${m.direction.split('，')[0]}</span>
            </div>
          </div>

          <div class="model-card-tags">
            ${m.tags.slice(0, 3).map(tag => `<span class="model-tag-pill">${tag}</span>`).join('')}
          </div>

          <div class="model-card-footer">
            <span class="btn-text-action">查看宣传文案与全参数 →</span>
            <span class="model-source-count">${matchedItems.length > 0 ? `长沙在售 <strong>${matchedItems.length}</strong> 张` : '暂无现货'}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * 渲染 Tab 2: 闲鱼床源瀑布流
 */
function renderWaterfallItems() {
  const container = document.getElementById('waterfall-container');
  if (!container) return;

  let filtered = items.filter(item => {
    // 品牌/床型筛选
    if (state.itemFilterModel !== 'all') {
      if (state.itemFilterModel === 'stokke' && item.model !== 'stokke_sleepi') return false;
      if (state.itemFilterModel === 'boori' && item.model !== 'boori_classic') return false;
      if (state.itemFilterModel === 'gb' && item.model !== 'gb_mc828' && item.model !== 'xiaolong_lmy') return false;
      if (state.itemFilterModel === 'diidee' && item.model !== 'diidee_beech') return false;
      if (state.itemFilterModel === 'ikea' && item.model !== 'ikea_gulliver') return false;
      if (state.itemFilterModel === 'others' && (item.model === 'stokke_sleepi' || item.model === 'boori_classic' || item.model === 'gb_mc828' || item.model === 'xiaolong_lmy' || item.model === 'diidee_beech' || item.model === 'ikea_gulliver')) return false;
    }

    // 区域筛选
    if (state.itemFilterDistrict !== 'all') {
      if (!item.district.includes(state.itemFilterDistrict) && !item.location.includes(state.itemFilterDistrict)) {
        return false;
      }
    }

    // 状态优先级筛选
    if (state.itemFilterStatus !== 'all') {
      if (item.status !== state.itemFilterStatus) return false;
    }

    // 搜索词检索
    if (state.itemSearchQuery) {
      const q = state.itemSearchQuery;
      const match = item.title.toLowerCase().includes(q) ||
                    item.district.toLowerCase().includes(q) ||
                    item.location.toLowerCase().includes(q) ||
                    item.body.toLowerCase().includes(q) ||
                    item.advice.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // 排序逻辑
  filtered.sort((a, b) => {
    if (state.itemSortBy === 'price-asc') {
      return a.price - b.price;
    } else if (state.itemSortBy === 'price-desc') {
      return b.price - a.price;
    } else {
      const priorityOrder = { '优先看': 1, '可考虑': 2, '待核实': 3, '议价备选': 4, '不优先': 5 };
      const diff = (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99);
      if (diff !== 0) return diff;
      return a.price - b.price;
    }
  });

  const countEl = document.getElementById('waterfall-count-display');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="column-span: all; text-align: center; padding: 4rem 1rem; color: #94a3b8;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🧺</div>
        <p style="font-size: 1.1rem; color: var(--text-main); font-weight: 600;">未找到符合条件的床源</p>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">建议清空搜索词，或重置品牌与区域筛选条件重试。</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const matchedModel = models.find(m => m.id === item.model) || null;
    const modelName = matchedModel ? matchedModel.name : '中高端实木婴儿床';

    return `
      <article class="waterfall-card" onclick="openItemModal('${item.id}')" title="点击查看这套床源详情">
        <div class="item-img-wrapper">
          <img class="item-img" src="${item.photoUrl}" alt="${item.title}" loading="lazy" onerror="this.src='${photos['crib_gb_mc828']}'" />
          <span class="item-status-badge status-${item.status}">
            ${item.status === '优先看' ? '🌟 优先看' : item.status === '可考虑' ? '👍 可考虑' : item.status === '待核实' ? '🔍 待核实' : item.status === '议价备选' ? '💬 议价备选' : '⚠️ 不优先'}
          </span>
          <span class="item-location-badge">📍 ${item.district}</span>
        </div>

        <div class="item-body">
          <div class="item-price-row">
            <div class="item-price">
              <span class="currency">¥</span>${item.price}
            </div>
            <span class="item-original-note">${item.original.split('；')[0]}</span>
          </div>

          <h3 class="item-title">${item.title}</h3>

          <p class="item-desc-snippet">${item.body}</p>

          <div class="item-advice-box">
            <strong>💡 验床建议：</strong>${item.advice}
          </div>

          <div class="item-card-footer">
            <span class="item-model-pill">${modelName}</span>
            <span class="btn-item-link" onclick="openXianyuItem('${item.id}', '${item.url}', event)" title="直接前往闲鱼查看">
              ${Device.isMobile() ? '调起闲鱼 ↗' : '闲鱼直达 ↗'}
            </span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * 打开床型详情弹窗
 */
function openModelModal(modelId) {
  const m = models.find(x => x.id === modelId);
  if (!m) return;

  const photoUrl = photos[m.imageItem] || photos['crib_gb_mc828'];
  const stars = '★'.repeat(m.rating) + '☆'.repeat(5 - m.rating);

  const matchedItems = items.filter(item => item.model === m.id);

  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <span class="model-tier-badge tier-${m.tier}" style="position: static; display: inline-flex; margin-bottom: 0.35rem;">
            ${m.tier === 'tier1' ? '🥇 第一档·强烈推荐蹲' : m.tier === 'tier2' ? '🥈 第二档·价格合适可买' : '🥉 第三档·极低价才考虑'}
          </span>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${m.name} <span style="font-size: 0.95rem; font-weight: 600; color: var(--primary);">(${m.code})</span></h2>
        </div>
        <button class="modal-close-btn" onclick="closeAllModals()" aria-label="关闭">&times;</button>
      </div>

      <div class="modal-body">
        <div class="modal-img-box">
          <img class="modal-img" src="${photoUrl}" alt="${m.name}" onerror="this.src='${photos['crib_gb_mc828']}'" />
        </div>

        <div class="modal-section">
          <div class="modal-section-title">✨ 核心卖点宣传文案与设计哲学</div>
          <div class="modal-callout highlight">
            <p style="font-weight: 700; font-size: 1rem; margin-bottom: 0.4rem; color: #065f46;">“${m.headline}”</p>
            <p style="color: #1e3a8a; line-height: 1.6;">${m.copy}</p>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">📊 完整产品技术与安全参数</div>
          <table class="modal-table">
            <tbody>
              <tr>
                <th>当年新床参考</th>
                <td><strong>${m.price}</strong> <span style="color: #64748b; font-size: 0.75rem;">(${m.priceNote})</span></td>
              </tr>
              <tr>
                <th>闲鱼建议入手价</th>
                <td><strong style="color: #059669; font-size: 0.95rem;">${m.fairPrice}</strong> <span style="color: #dc2626; font-size: 0.75rem; margin-left: 6px;">(${m.maxPrice})</span></td>
              </tr>
              <tr>
                <th>实木材质用料</th>
                <td><strong>${m.frame}</strong></td>
              </tr>
              <tr>
                <th>整床结构重量</th>
                <td>${m.weight}</td>
              </tr>
              <tr>
                <th>功能模式调节</th>
                <td>${m.recline}</td>
              </tr>
              <tr>
                <th>脚轮移动设计</th>
                <td>${m.direction}</td>
              </tr>
              <tr>
                <th>外径尺寸</th>
                <td>${m.size}</td>
              </tr>
              <tr>
                <th>安全工艺细节</th>
                <td>${m.suspension}</td>
              </tr>
              <tr>
                <th>变形与拓展能力</th>
                <td>${m.fold}</td>
              </tr>
              <tr>
                <th>二手推荐度</th>
                <td style="color: #f59e0b; font-weight: 700;">${stars}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">⚠️ 淘二手避坑与实地验床要诀</div>
          <div class="modal-callout warning">
            ${m.caution}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary btn-close-modal">关闭</button>
        ${matchedItems.length > 0 ? `
          <button class="btn-primary" onclick="jumpToWaterfallForModel('${m.id}')">
            在长沙床源中查看该型号 (${matchedItems.length}张) →
          </button>
        ` : `
          <button class="btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
            当前长沙暂无该型号挂牌
          </button>
        `}
      </div>
    </div>
  `;

  document.getElementById('generic-modal-overlay').classList.add('active');
}

/**
 * 联动跳转
 */
function jumpToWaterfallForModel(modelId) {
  closeAllModals();
  switchTab('waterfall');

  state.itemFilterModel = modelId;
  document.querySelectorAll('#waterfall-model-chips .filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-model') === modelId);
  });

  renderWaterfallItems();
  showToast(`已为您筛选出对应床型的长沙在售床源`);
}

/**
 * 打开闲鱼单床详情弹窗
 */
function openItemModal(itemId) {
  const item = items.find(x => x.id === itemId);
  if (!item) return;

  const matchedModel = models.find(m => m.id === item.model);
  const modelName = matchedModel ? matchedModel.name : '中高端婴儿床';

  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <span class="item-status-badge status-${item.status}" style="position: static; display: inline-flex; margin-bottom: 0.35rem;">
            ${item.status} · 推荐度
          </span>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${item.title}</h2>
          <div style="font-size: 0.8rem; color: var(--text-sub); margin-top: 0.2rem;">
            <span>📍 ${item.location}</span> · <span>款型：${modelName}</span>
          </div>
        </div>
        <button class="modal-close-btn" onclick="closeAllModals()" aria-label="关闭">&times;</button>
      </div>

      <div class="modal-body">
        <div class="modal-img-box" style="height: 300px;">
          <img class="modal-img" src="${item.photoUrl}" alt="${item.title}" onerror="this.src='${photos['crib_gb_mc828']}'" />
        </div>

        <div class="modal-section">
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-size: 0.8rem; color: #9f1239; font-weight: 600;">闲鱼挂牌售价</span>
              <div style="font-size: 1.85rem; font-weight: 900; color: #e11d48; line-height: 1;">¥${item.price}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.75rem; color: #475569;">专柜原购/参考价</span>
              <div style="font-size: 0.95rem; font-weight: 700; color: #334155;">${item.original}</div>
            </div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">🗣️ 闲鱼卖家实车描述</div>
          <div class="modal-callout" style="white-space: pre-wrap;">${item.body}</div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">🕵️ 现场验床与砍价建议</div>
          <div class="modal-callout highlight">
            <p style="font-weight: 600; color: #166534; margin-bottom: 0.3rem;">实战选购建议：</p>
            <p style="line-height: 1.55;">${item.advice}</p>
          </div>
        </div>

        ${matchedModel ? `
          <div class="modal-section">
            <div class="modal-section-title">🛏️ 原床型官方配置亮点 (${matchedModel.name})</div>
            <table class="modal-table">
              <tr>
                <th>木材与净重</th>
                <td>${matchedModel.frame} · ${matchedModel.weight}</td>
              </tr>
              <tr>
                <th>拼床与升降</th>
                <td>${matchedModel.recline}</td>
              </tr>
              <tr>
                <th>闲鱼合理区间</th>
                <td><strong style="color: #059669;">${matchedModel.fairPrice}</strong> (超过 ${matchedModel.maxPrice} 建议放弃)</td>
              </tr>
            </table>
          </div>
        ` : ''}

        <div class="modal-section">
          <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4;">
            * 提货提示：实木婴儿床自重通常在 20–40kg 之间，建议开 SUV 或小货车并携带工具上门拆装自提。
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="copyItemLink('${item.url}')">复制链接 📋</button>
        <button class="btn-secondary" onclick="window.open('${item.url}', '_blank', 'noopener,noreferrer')">浏览器打开 🌐</button>
        <button class="btn-primary" onclick="openXianyuItem('${item.id}', '${item.url}', event)">
          ${Device.isMobile() ? '🚀 调起闲鱼 App' : '前往闲鱼查看 / 购买 ↗'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('generic-modal-overlay').classList.add('active');
}

/**
 * 复制商品链接
 */
function copyItemLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('闲鱼链接已成功复制到剪贴板！');
  }).catch(() => {
    showToast(`链接：${url}`);
  });
}

/**
 * 打开避坑黑榜弹窗
 */
function showExcludedModal() {
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <span style="display: inline-block; background: #fee2e2; color: #b91c1c; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-bottom: 0.3rem;">
            🛡️ 婴儿床安全第一防线
          </span>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">已主动剔除的危险床源（避免重复踩坑）</h2>
        </div>
        <button class="modal-close-btn" onclick="closeAllModals()" aria-label="关闭">&times;</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
          婴儿每天睡眠超 14 小时，劣质婴儿床直接关乎生命呼吸与骨骼发育。我们主动排除了以下<strong>甲醛超标、间距非标卡头、升降侧栏滑脱、发霉受潮</strong>的危险二手床：
        </p>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          ${excludedItems.map(ex => `
            <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: var(--radius-md); padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: #9b2c2c;">${ex.title}</h4>
                <span style="font-size: 0.75rem; background: #feb2b2; color: #742a2a; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${ex.tag}</span>
              </div>
              <div style="font-size: 0.8rem; color: #4a5568;">
                <span>挂价：<strong>${ex.price}</strong></span> · <span>区域：${ex.district}</span>
              </div>
              <p style="font-size: 0.8rem; color: #c53030; line-height: 1.45; margin-top: 0.2rem;">
                <strong>排除隐患：</strong>${ex.reason}
              </p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" onclick="closeAllModals()">了解风险，返回看精选床源</button>
      </div>
    </div>
  `;

  document.getElementById('generic-modal-overlay').classList.add('active');
}

/**
 * 打开现场验床清单弹窗
 */
function showChecklistModal() {
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <span style="display: inline-block; background: #ecfdf5; color: #047857; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-bottom: 0.3rem;">
            🔍 现场面交验床秘籍
          </span>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">实木婴儿床现场验床避坑速查表</h2>
        </div>
        <button class="modal-close-btn" onclick="closeAllModals()" aria-label="关闭">&times;</button>
      </div>

      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
          面交验床是二手实木家具交易最稳妥的步骤。请在自提现场按以下 4 大黄金维度逐项查验，安全无忧再付款：
        </p>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${inspectionChecklist.map((cat, idx) => `
            <div style="background: #f8fafc; border: 1px solid var(--card-border); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
              <h4 style="font-size: 0.925rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
                <span style="background: var(--primary); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">${idx + 1}</span>
                ${cat.category}
              </h4>
              <ul style="padding-left: 1.25rem; font-size: 0.825rem; color: var(--text-muted); line-height: 1.6;">
                ${cat.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" onclick="closeAllModals()">保存并关闭</button>
      </div>
    </div>
  `;

  document.getElementById('generic-modal-overlay').classList.add('active');
}

/**
 * 关闭全部弹窗
 */
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('active'));
}

/**
 * Toast 提示
 */
function showToast(message) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>🔔</span> ${message}`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * 防抖函数
 */
function debounce(fn, wait) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
