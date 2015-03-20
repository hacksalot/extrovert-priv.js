/**
An Extrovert.js generator for a 3D city scene.
@module gen-city.js
@copyright Copyright (c) 2015 by James M. Devlin
@author James M. Devlin | james@indevious.com
@license MIT
@version 1.0
*/

(function (window, $, THREE, EXTROVERT) {



   /**
   Module object.
   */
   //var my = {};


   

   /**
   Default options for this generator. Set defaults here. These will be merged
   in with any user-specified or engine-level options.
   */
   var _def_opts = {
      gravity: [0,-50,0],
      camera: {
         position: [0,300,400],
         lookat: [0,0,0],
         up: [0,0,-1],
         rotation: [-(Math.PI / 8.0), 0, 0]
      },
      generator: {
         name: 'city',
         background: 'default_background.png',
         material: { color: 0xABABAB, friction: 0.2, restitution: 1.0 }
      }
   };



   /**
   Initial camera state. Regardless of how the user decides to orient the 
   camera, it needs to be created in this initial configuration so object
   placements work.
   */
   var _init_cam_opts = {
         position: [0,400,0],
         lookat: [0,0,0],
         up: [0,0,-1]
   };

   

   /**
   @class The built-in 'city' generator.
   */
   EXTROVERT.city = function() {
      return {
         generate: function( options, eng ) {
            if( !options.generator || typeof options.generator == 'string' )
               options.generator = _def_opts.generator;
            init_objects( options, eng );
         },
         options: _def_opts
      };
   };


   /**
   Initialize scene props and objects.
   @method init_objects
   */
   function init_objects( opts, eng ) {

      EXTROVERT.create_scene( opts );
      EXTROVERT.create_camera( $.extend(true, {}, opts.camera, _init_cam_opts) );
      EXTROVERT.fiat_lux( opts.lights );

      init_ground( opts, eng );
      init_placement_plane( opts, eng );
      init_elements( opts, eng );

      // Now that objects have been placed in-frustum, we can set the camera
      // position and rotation to whatever the client specified.
      var oc = opts.camera;
      eng.camera.rotation.set( oc.rotation[0], oc.rotation[1], oc.rotation[2] );
      eng.camera.position.set( oc.position[0], oc.position[1], oc.position[2] );
   }



   function init_ground( opts, eng ) {
      // Create the ground. Place it on the camera's back frustum plane so
      // it always fills the viewport?
      var frustum_planes = EXTROVERT.Utils.calc_frustum( eng.camera );
      var planeWidth = frustum_planes.farPlane.topRight.x - frustum_planes.farPlane.topLeft.x;
      var planeHeight = frustum_planes.farPlane.topRight.y - frustum_planes.farPlane.botRight.y;
      var plane_tex = opts.generator.background ?
         THREE.ImageUtils.loadTexture( opts.generator.background ) : null;
         
      plane_tex.wrapS = plane_tex.wrapT = THREE.RepeatWrapping;
      plane_tex.repeat.set( 100, 100 );

      var ground = opts.physics.enabled ?
         new Physijs.BoxMesh(
            new THREE.BoxGeometry(planeWidth, 10, planeHeight),
            new THREE.MeshLambertMaterial( { color: 0xFFFFFF, map: plane_tex } ), 0 )
         :
         new THREE.Mesh(
            new THREE.BoxGeometry(planeWidth, 10, planeHeight),
            new THREE.MeshLambertMaterial( { color: 0x333333, map: plane_tex, opacity: 1.0, transparent: false } )
         );
      ground.position.y = 150; //frustum_planes.farPlane.topRight.z;
      ground.receiveShadow = false; // TODO: not working
      ground.updateMatrix();
      ground.updateMatrixWorld();
      eng.scene.add( ground );
      eng.log.msg("Building ground plane: %o", ground);
      return ground;
   }


   function init_placement_plane( opts, eng ) {
      // Create a hidden plane for object placement.
      // TODO: Replace with unproject at specified Z.
      eng.placement_plane = opts.physics.enabled ?
            new Physijs.BoxMesh(
               new THREE.BoxGeometry(200000,1,200000),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } ),
               0 ) :
            new THREE.Mesh(
               new THREE.BoxGeometry(200000,1,200000),
               new THREE.MeshBasicMaterial( { color: 0xAB2323, opacity: 1.0, transparent: false } )
            );
      eng.placement_plane.visible = false;
      eng.placement_plane.position.y = 200;
      // TODO: Figure out which update calls are necessary
      eng.scene.updateMatrix();
      eng.placement_plane.updateMatrix();
      eng.placement_plane.updateMatrixWorld();
      eng.log.msg("Building placement plane: %o", eng.placement_plane);
   }


   /**
   Initialize all card objects.
   @method init_cards
   */
   function init_elements( opts, eng ) {
      var mat = new THREE.MeshLambertMaterial({ color: opts.generator.material.color });
      eng.side_mat = Physijs.createMaterial( mat, opts.generator.material.friction, opts.generator.material.restitution );
      $( opts.src.selector ).each( function( idx, val ) {
         init_image( idx, val, opts, eng );
      });
   }



   /**
   Initialize a single image object. TODO: Clean up material/geo handling.
   @method init_card
   */
   function init_image( idx, val, opts, eng ) {

      // Position
      var pos_info = get_position( val, opts, eng );

      // Texture
      var texture = eng.rasterizer.paint( $(val), opts );
      var material = (!opts.physics.enabled || !opts.physics.materials) ?
         texture.mat : Physijs.createMaterial( texture.mat, 0.2, 1.0 );
      eng.side_mat.color = 0x00FF00;
      var materials = new THREE.MeshFaceMaterial([
         eng.side_mat, eng.side_mat, eng.side_mat, eng.side_mat,
         material, material
      ]);

      // Mesh
      var cube_geo = new THREE.BoxGeometry( pos_info.width, pos_info.height, pos_info.depth );
      var mesh = opts.physics.enabled ?
         new Physijs.BoxMesh( cube_geo, materials, 1000 ) :
         new THREE.Mesh( cube_geo, materials );
      mesh.position.copy( pos_info.pos );
      mesh.castShadow = mesh.receiveShadow = false;
      if( opts.generator.lookat )
         mesh.lookAt( new THREE.Vector3(opts.generator.lookat[0], opts.generator.lookat[1], opts.generator.lookat[2]) );
      mesh.elem = $(val);

      opts.creating && opts.creating( val, mesh );
      eng.scene.add( mesh );
      eng.card_coll.push( mesh );
      eng.log.msg("Created element %d (%f, %f, %f) (size=%f x %f x %f): %o.", idx, pos_info.pos.x, pos_info.pos.y, pos_info.pos.z, pos_info.width, pos_info.height, pos_info.depth, mesh);
      eng.log.msg("Texture = %o", texture);
      opts.created && opts.created( val, mesh );

      return mesh;
   }



   /**
   Retrieve the position, in 3D space, of a recruited HTML element.
   @method init_card
   */
   function get_position( val, opts, eng ) {

      // Get the position of the HTML element [1]
      var parent_pos = $( opts.container ).offset();
      var child_pos = $( val ).offset();
      var pos = { left: child_pos.left - parent_pos.left, top: child_pos.top - parent_pos.top };

      // From that, compute the position of the top-left and bottom-right corner
      // of the element as they would exist in 3D-land.
      var topLeft = EXTROVERT.calc_position( pos.left, pos.top, eng.placement_plane );
      var botRight = EXTROVERT.calc_position( pos.left + $(val).width(), pos.top + $(val).height(), eng.placement_plane );
      // These return the topLeft and bottomRight coordinates of the MAIN FACE of the thing in WORLD coords

      var block_width = Math.abs( botRight.x - topLeft.x );
      var block_depth = Math.abs( topLeft.z - botRight.z );
      var block_height = block_depth;

      // Offset by the half-height/width so the corners line up
      return {
         pos: new THREE.Vector3(
            topLeft.x + (block_width / 2),
            topLeft.y - (block_height / 2),
            topLeft.z + (block_depth / 2)),
         width: block_width,
         depth: block_depth,
         height: block_height
      };
   }



   /**
   Module return.
   */
   //return my;



}(window, $, THREE, EXTROVERT));

// [1] Don't rely exclusively on .offset() or .position()
//     See: http://bugs.jquery.com/ticket/11606
//     var pos = $(val).offset();
//     var pos = $(val).position();
