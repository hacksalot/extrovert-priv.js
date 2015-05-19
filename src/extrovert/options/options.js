/**
The Extrovert options model.
@module options.js
@license Copyright (c) 2015 | James M. Devlin
*/

define(['defaults', '../utilities/utils'], function( defaults, utils ) {

  var ret = {
    init: _init,
    defaults: defaults,
    user: null,
    merged: null
  };

  function _init( userOpts ) {
    ret.user = userOpts;
    ret.merged = utils.extend(true, { }, defaults, userOpts );
    return ret.merged;
  }

  return ret;

});
