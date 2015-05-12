/**
The runtime Extrovert options model.
@author James Devlin | james@indevious.com
@version 0.1.0
@module defaults
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
