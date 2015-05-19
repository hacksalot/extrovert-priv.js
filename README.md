# Extrovert.js #

*Because JavaScript be all like, "yo, where my 3D at??"*

**Extrovert.js transforms your data into textured 3D geometry**. It supports physics, animations, cross-browser rendering, mouse and keyboard controls, and a five-minute install. It's intended for 3Dification of anything from on-page HTML to JSON responses fetched over AJAX to custom data formats specific to you or your project.

![](../gh-pages/gh-pages/extrovert_photo3d_thumb.jpg)
![](../gh-pages/gh-pages/extrovert_art_of_war_thumb.png)
![](../gh-pages/gh-pages/extrovert_xkcd_thumb.png)

## License ##

Extrovert.js 0.1.0 is permissively licensed under the MIT License. See [license.md](LICENSE.md) for details.

## Features ##

Extrovert is actively developed and maintained from our underground jungle laboratory.

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

## Quick Start ##

The quickest way to get started with Extrovert is to link to the sources directly. Extrovert also supports AMD and CommonJS setups.

1. Download the Extrovert sources manually or via Bower or NPM:

    ```bash
    bower install extrovert
    ```

2. Link to the sources in your HTML.

    ```html
    <script src="/path/to/extrovert.min.js" type="text/javascript"></script>
    ```

3. Initialize the Extrovert library:

    ```javascript
    extro.init({ /* options */ });
    ```

4. Voila. Insta-3D.

## Generators ##

Extrovert.js is built around the concept of generators. A *generator* is a piece of self-contained JavaScript code that generates 3D geometry according to a creative scheme or blueprint. Extrovert exposes the following built-in generators and you can build your own with just a few lines of code:

- **extrude**. A generator that positions 3D objects based on their 2D screen positions.
- **tile**. A generator that tiles 3D objects in space (like a brick wall).
- **stack**. A generator that stacks 3D objects in space (like a deck of cards).
- **box**. A generator that renders its data to the six sides of a cube.
- **river**. A generators that positions 3D objects in a constrained channel and gives them velocity.
- **custom**. You can create custom generators for Extrovert with just a few lines of code.

You can mix and match multiple generators within a single Extrovert scene. For example, here we're using the `extrude` generator to extrude any on-page images, and a `box` generator to turn a background div into a flat plane.

```javascript
extro.init({
  transforms: [
    { type: 'extrude' src: 'img' },
    { type: 'box' src: '#background' }
  ]
});
```

If a particular generator doesn't have the functionality you need, you can wire together multiple generators, create your own new generators, or modify the behavior of any existing generator.

## Rasterizers ##

A rasterizer is a self-contained piece of JavaScript code that renders arbitrary data to a 2D texture. Where generators create the 3D geometry that fills your scene, rasterizers create the textures, colors, and patterns that 3D geometry is decorated with.

As with generators, Extrovert ships with multiple built-in rasterizers, and you can write your own. As of v1.0 the predefined rasterizers include:

- **img**. A rasterizer specifically for image resources.
- **elem**. A rasterizer for arbitrary HTML elements (`<div>`, `<span>`, `<p>`, whatever).
- **plain text**. A rasterizer for plain unadorned text.
- **html**. A full-fledged HTML rasterizer. Experimental.
- **custom**. You can define new rasterizers with just a few lines of code.

Short of writing a full-fledged rasterizer, you can also provide a rendering callback function that will allow you to perform the rasterization through simple canvas-style paint calls.

[1]: http://google.com
