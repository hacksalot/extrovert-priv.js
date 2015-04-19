# Extrovert.js #

*Because JavaScript be all like, yo, where my 3D at??*

**Extrovert.js transforms arbitrary source data into textured 3D geometry** with support for physics, animations, cross-browser rendering, mouse and keyboard controls, and anything else we decide to put in it. It's intended for 3Dification of anything from on-page HTML to JSON responses fetched over AJAX to custom data formats specific to you or your project.

## Features ##

- **3Dify your HTML markup** using Extrovert's built-in extrusion generator.
- **3Dify arbitrary data** using Extrovert's system of customizable generators and rasterizers. XML, JSON, RSS, or any other format.
- **Create virtually any 3D scene** using our built-in generators&mdash;or build your own.
- **Physics support** with collisions, gravity, constraints, etc.
- **Mouse and keyboard controls** mappable to translation or rotation around the major axes.
- **Perspective and orthographic camera** support.
- **Cross-browser compatible** with Chrome, Firefox, Internet Explorer, Safari, and other WebGL-capable browsers.
- **Multiple loader formats** including AMD, CommonJS, and browser-global.
- **Annotated sources** for custom Extrovert development.
- **Automated tests** through QUnit and Mocha.
- **No jQuery dependency**. Extrovert is jQuery-compatible, but doesn't require jQuery.

## Usage ##

1. Download the Extrovert sources manually or via Bower:

        bower install extrovert

2. Link to the sources in your HTML.

        <script src="/path/to/extrovert.min.js" type="text/javascript">

3. Initialize the Extrovert library:

    ````javascript
   extro.init({ /* options */ });
   ````
4. Voila. Insta-3D.



