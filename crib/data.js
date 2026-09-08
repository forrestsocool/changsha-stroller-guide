/* 只录入有原商品链接、观察时间和采集依据的闲鱼记录，见 SOURCING.md。 */
const cribData = {
  collection: {
    status: 'pending',
    checkedAt: null,
    message: '床源正在重新核验。旧版链接和图片缺少可信对应关系，已撤下；尚未完成新的闲鱼采集。'
  },
  listings: []
};
if (typeof module !== 'undefined') module.exports = cribData;
