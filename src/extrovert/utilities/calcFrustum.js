define( ['three'], function( THREE ) {

  /**
  Calculate the vertices of the near and far planes. Don't use THREE.Frustum
  here. http://stackoverflow.com/a/12022005 http://stackoverflow.com/a/23002688
  @method calcFrustum
  */
  return function( camera ) {
    // Near Plane dimensions
    var hNear = 2 * Math.tan(camera.fov * Math.PI / 180 / 2) * camera.near; // height
    var wNear = hNear * camera.aspect; // width
    // Far Plane dimensions
    var hFar = 2 * Math.tan(camera.fov * Math.PI / 180 / 2) * camera.far; // height
    var wFar = hFar * camera.aspect; // width

    var cam_near = camera.position.z - camera.near; // -camera.near
    var cam_far  = camera.position.z - camera.far;  // -camera.far

    return {
      nearPlane: {
        topLeft: new THREE.Vector3( -(wNear / 2), hNear / 2, cam_near ),
        topRight: new THREE.Vector3( wNear / 2, hNear / 2, cam_near ),
        botRight: new THREE.Vector3( wNear / 2, -(hNear / 2), cam_near ),
        botLeft: new THREE.Vector3( -(wNear / 2), -(hNear / 2), cam_near )
      },
      farPlane: {
        topLeft: new THREE.Vector3( -(wFar / 2), hFar / 2, cam_far ),
        topRight: new THREE.Vector3( wFar / 2, hFar / 2, cam_far ),
        botRight: new THREE.Vector3( wFar / 2, -(hFar / 2), cam_far ),
        botLeft: new THREE.Vector3( -(wFar / 2), -(hFar / 2), cam_far )
      }
    };
  };
});