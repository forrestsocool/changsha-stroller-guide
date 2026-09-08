# 长沙二手母婴大件指南

[项目首页](https://forrestsocool.github.io/changsha-stroller-guide/) · [婴儿车指南](https://forrestsocool.github.io/changsha-stroller-guide/stroller/) · [婴儿床指南](https://forrestsocool.github.io/changsha-stroller-guide/crib/)

## 婴儿车

`stroller/` 保留现有车型参考、闲鱼车源、筛选及验车清单。

## 婴儿床：先采集商品，再汇总床型

`crib/` 不套用推车品牌榜单，不限定实木、铝合金或其他材质，也不按品牌、原价设置准入门槛。

1. 从长沙闲鱼实际商品详情采集标题、链接、挂牌价、区域、观察时间、结构、材质和配件信息。
2. 核对实拍与商品 ID 的对应关系，按 ID 去重；未知参数保留“待核实”。
3. 根据已核验商品的床型和材质自动汇总参考库，提供样本数量、挂牌价范围及原始记录入口。
4. 区分卖家自述、观察记录和待核实事项。样本挂牌价不是成交价或市场估价。

**当前状态：重新采集待完成。** 旧版床源缺少可信链接与图片对应关系，且复用了推车照片，已从展示中撤下。当前不展示未经核验的床源或预设品牌参考库。图片缺失或加载失败时显示文字占位，不替换为其他商品图片。

维护格式及采集步骤见 [婴儿床采集说明](crib/SOURCING.md)。

## 目录

- `index.html`：两类指南入口。
- `stroller/`：原婴儿车模块。
- `crib/data.js`：采集状态和原始商品观察记录。
- `crib/app.js`：记录校验、去重、床型汇总、筛选、排序及详情。
- `crib/index.html`、`crib/style.css`：婴儿床页面与样式。
- `tests/crib.test.cjs`：来源、图片绑定和汇总逻辑回归检查。

## 本地运行

纯静态 HTML/CSS/JavaScript，无构建依赖：

```bash
python -m http.server 8765
```

访问 http://localhost:8765 。可以直接部署至 GitHub Pages 或其他静态服务器。

运行回归检查（Node.js 18+）：

```bash
node --test tests/crib.test.cjs
```

本站为独立整理，非品牌或闲鱼官方站点。记录不自动同步价格和库存；实际状态以原商品页面与现场核验为准。
