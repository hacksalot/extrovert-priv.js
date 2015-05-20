/**
Simple selector replacement. TODO: remove.
@module offset.js
@license Copyright (c) 2015 by James M. Devlin. All rights reserved.
*/

define(function() {

  return function( selector ) {
    return document.querySelectorAll( selector );
  };

});
