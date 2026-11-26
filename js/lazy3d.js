/* 3D 场景按需加载：Three.js 与三个重场景只在点开对应卡片时下载。 */
const LOADERS = {
  oec: function () { return import('./oecusse.js?v=exifv20261126'); },
  rtu: function () { return import('./rtu.js?v=exifv20261126'); },
  stepper: function () { return import('./stepper.js?v=exifv20261126'); }
};
const pending = {};

window.with3D = function (name, done) {
  if (!LOADERS[name]) return Promise.resolve().then(function () { if (done) done(); });
  if (!pending[name]) {
    pending[name] = LOADERS[name]().catch(function (e) {
      delete pending[name];
      throw e;
    });
  }
  return pending[name].then(function () { if (done) done(); });
};
