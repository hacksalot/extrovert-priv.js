//https://github.com/jrburke/almond#exporting-a-public-api
(function (root, factory) {
  if (typeof define === 'function') {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    // Use the library's global name here: Extrovert
    root.extrovert = factory();
  }
}(this, function () {
