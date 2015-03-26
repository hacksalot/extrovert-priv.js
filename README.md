# Extrovert.js #

3Dify your websites, blogs, RSS feeds, and image galleries.

>Because websites, blogs, RSS feed, and image galleries be all like, yo, where my 3D at?

Extrovert.js is a prototype JavaScript library that supports on-the-fly generation of 3D geometry from HTML pages or other arbitrary markup (RSS, JSON, xkcd comics, etc.).

## Usage ##

1. Download the Extrovert sources manually or via Bower:

        bower install extrovert

2. Link to the sources in your HTML.

        <script src="/path/to/extrovert.min.js" type="text/javascript">

3. Initialize the Extrovert library:

````javascript
var opts = {
   generator: {
      name: 'gallery',
      lookat: [0,0,3200]
   },
   container: 'section',
   src: { selector: 'img' },
   use_bin_packing: true,
   physics: {
      physijs: {
         worker: '../js/physijs_worker.js',
         ammo: 'ammo.js'
      }
   },
   click_force: 60000
};

EXTROVERT.init( opts );
````

## Development Roadmap ##

Extrovert.js is in active development. Stuff we're currently focusing on:

- Remove hard jQuery dependency.
- Remove hard Three.js dependency.
- Better IE / Safari and Linux support.
- jQuery plugin version
- More generators!
- More rasterizers!
- More controllers!
- Implement [bin packing](http://codeincomplete.com/posts/2011/5/7/bin_packing/) in the engine.
- HTML-to-SVG texture rasterization.
- Additional physics libraries.
- Additional samples and docs.
