/**
The runtime Extrovert options model.
@module defaults
@license Copyright (c) 2015 by James M. Devlin. All rights reserved.
*/

define(['extrovert/defaults', 'extrovert/utils'], function( defaults, utils ) {

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
