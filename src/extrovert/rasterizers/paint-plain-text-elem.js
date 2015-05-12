/**
A simple Extrovert HTML rasterizer.
@module paint-plain-text-elem.js
@license Copyright (c) 2015 | James M. Devlin
*/

define(['extrovert/core'], function( extrovert ) {

  'use strict';

  return {
    paint: function( val, opts ) {

      var _utils = extrovert.Utils;

      // Get the element content
      var title_elem = val.querySelector( opts.src.title );
      var title = title_elem.innerHTML;//.text();//.trim();
      var content_elem = val.querySelector( opts.src.content );
      var content = content_elem.innerHTML;//text();//.trim();

      // Create a canvas element. TODO: Reuse a single canvas.
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = val.offsetWidth;
      canvas.height = val.offsetHeight;

      // Fill the canvas with the background color
      //var bkColor = $val.css('background-color');
      var bkColor = _utils.getComputedStyle(val, 'background-color');
      if(bkColor === 'rgba(0, 0, 0, 0)')
        bkColor = 'rgb(0,0,0)';
      context.fillStyle = bkColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Compute the size of the title text
      context.font = _utils.getComputedStyle( title_elem, 'font');

      context.fillStyle = _utils.getComputedStyle( title_elem, 'color');
      //context.textBaseline = 'top';
      var title_line_height = 24;
      var num_lines = _utils.wrapText( context, title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, true );

      // Paint the title's background panel
      context.fillStyle = _utils.shadeBlend( -0.25, bkColor );
      context.fillRect(0,0, canvas.width, 20 + num_lines * title_line_height);

      // Paint the title text
      context.fillStyle = _utils.getComputedStyle( title_elem, 'color');
      _utils.wrapText( context, title, 10, 10 + title_line_height, canvas.width - 20, title_line_height, false );

      // Paint the content text
      context.font = _utils.getComputedStyle( content_elem, 'font');

      var shim = '<div id="_fetchSize" style="display: none;">Sample text</div>';
      _utils.$( opts.src.container ).insertAdjacentHTML('beforeend', shim);
      //$( opts.src.container ).append( shim );
      //line_height = shim.text("x").height();
      shim = extro.Utils.$('#_fetchSize');
      shim.innerHTML = 'x';
      var line_height = shim.offsetHeight;

      //var TestDivLineHeight = $("#TestDiv").css("font-size", "12px").css("line-height", "1.25").text("x").height();
      var massaged_content = content.replace('\n',' ');

      _utils.wrapText( context, massaged_content, 10, 20 + (num_lines * title_line_height) + line_height, canvas.width - 20, line_height, false );

      return extro.provider.createMaterialFromCanvas( canvas, true );
    }
  };
});

