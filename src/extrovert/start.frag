//https://github.com/jrburke/almond#exporting-a-public-api
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      // AMD.
      define(['three'], factory);
  } else {
      // Browser globals
      root.extrovert = factory( root.THREE );
  }
}(this, function ( THREE ) {
