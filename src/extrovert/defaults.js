/**
Default Extrovert options.
@author James Devlin | james@indevious.com
@version 0.1.0
@module defaults
*/

define({
    renderer: 'Any',
    gravity: [0,0,0],
    camera: {
      fov: 35,
      near: 1,
      far: 10000,
      position: [0,0,200]
      //positionScreen: [4000,4000,200]
    },
    controls: {
      type: 'universal',
      enabled: true,
      allow_drag: false
    },
    physics: {
      enabled: true,
      physijs: {
        worker: '/js/pjsworker.js',
        ammo: 'ammo.js'
      }
    },
    block: { depth: 1 },
    move_with_physics: true,
    clickForce: 900000,
    onload: null,
    onerror: null,
    created: null,
    clicked: null,
    lights: [
      { type: 'ambient', color: 0xffffff }
    ]
});
