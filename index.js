var Shell = require('gl-now')
var createMesh = require('gl-mesh')
var Geometry = require('gl-geometry')
var getNormals  = require('normals')
var glslify  = require('glslify')
var glShader = require('gl-shader')
var attachCamera = require('game-shell-fps-cam')
var pick = require('camera-picking-ray')
var glm = require('gl-matrix')
var getBounds = require('bound-points')
var bunny = require('bunny')
var createCube = require('primitive-cube')
var intersectSphere = require('ray-sphere-intersection')
var intersectAABB = require('ray-aabb-intersection')
var wireframe = require('gl-wireframe')
var mat4 = glm.mat4
var vec3 = glm.vec3

var shell = Shell({
  pointerLock: true,
})
var gl

var shaders = {}
var scene = []

// camera
var camera = attachCamera(shell)
camera.position[1] = -2
var projection = mat4.create()
var view       = mat4.create()

shell.on('gl-init', function() {
  gl = shell.gl

  // gl settings
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
  // gl.enable(gl.BLEND)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  // initialize shaders
  shaders.normals = glShader(gl,
    glslify('./shaders/bunny.vert'),
    glslify('./shaders/bunny.frag')
  )

  shaders.wireframe = glShader(gl, 
    glslify('gl-wireframe/wire.vert'),
    glslify('gl-wireframe/wire.frag')
  )

  // set camera parameters
  var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
  var fieldOfView = Math.PI / 4
  var near = 0.01
  var far  = 10000
  mat4.perspective(projection
    , fieldOfView
    , aspectRatio
    , near
    , far
  )

  // create scene objects
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))
  scene.push(createBunny(gl))

})

shell.on('gl-render', function(t) {
  camera.view(view)

  // clear hover
  var target = calculateHover()

  // render objects
  scene.forEach(renderObj)

  // render helpers
  if (target) {
    updateSelectionHelper(target)
    renderSelectionHelper(selectionHelper)
  }

})

var ray = {
  ro: new Float32Array([0, 0, 0]),
  rd: new Float32Array([0, 0, 0]),
}

function calculateHover(){
  var projView = mat4.multiply([], projection, view)
  var invProjView = mat4.invert([], projView)

  var screenX = gl.drawingBufferWidth/2
  var screenY = gl.drawingBufferHeight/2
  var screenWidth = gl.drawingBufferWidth
  var screenHeight = gl.drawingBufferHeight
  var mouse = [ screenX, screenHeight - screenY ]
  var viewport = [ 0, 0, screenWidth, screenHeight ]

  //store result in ray (origin, direction)
  pick(ray.ro, ray.rd, mouse, viewport, invProjView)

  //let's see if the mouse hit a 3D sphere...
  var target = scene.find(hitTest)

  return target

  function hitTest(obj){
    var center = obj.position, radius = 2
    // var hit = intersectAABB(new Float32Array(3), ray.ro, ray.rd, obj.bounds)
    var hit = intersectSphere([], ray.ro, ray.rd, center, radius)

    if (hit) {
      return true
    }
  }

}

function renderObj(obj) {
  var shader = shaders.normals
  var geometry = obj.geometry
  var model = obj.matrix

  // bind shader
  shader.bind()
  geometry.bind(shader)

  // set uniforms
  shader.uniforms.uProjection = projection
  shader.uniforms.uView = view
  shader.uniforms.uModel = model

  // draw object
  geometry.draw(gl.TRIANGLES)
  geometry.unbind()
}

// bunny model manip
bunny.positions.forEach(function(pos){
  pos[0] *= 0.1
  pos[1] *= 0.1
  pos[2] *= 0.1
})

function createBunny(gl){
  var geometry = Geometry(gl)
  geometry.attr('aPosition', bunny.positions)
  var normals = getNormals.vertexNormals(bunny.cells, bunny.positions)
  geometry.attr('aNormal', normals)
  geometry.faces(bunny.cells)
  var matrix      = mat4.create()
  // position
  var position = randomVec3([0,0,0],[100,0,100])
  mat4.translate(matrix, matrix, position)
  // scale
  // mat4.scale(matrix, matrix, vec3.fromValues(0.1,0.1,0.1))
  return {
    geometry: geometry,
    matrix: matrix,
    position: position,
    bounds: getBounds(bunny.positions),
  }
}

var selectionHelper = null

function updateSelectionHelper(target){
  if (selectionHelper && selectionHelper.target === target) return
  var matrix = mat4.create()
  var position = vec3.clone(target.position)
  mat4.translate(matrix, matrix, position)
  var bounds = target.bounds
  var deltas = xyzDeltas(bounds[0], bounds[1])
  // mat4.scale(matrix, matrix, vec3.fromValues(deltas[0]*0.01,deltas[1]*0.01,deltas[2]*0.01))
  selectionHelper = {
    geometry: createBoundsGeometry(bounds),
    matrix: matrix,
    position: position,
    bounds: target.bounds.map(vec3.clone),
  }
}

function renderSelectionHelper(obj) {
  var shader = shaders.wireframe
  var geometry = obj.geometry
  var model = obj.matrix

  // bind shader
  shader.bind()
  geometry.bind(shader)

  // set uniforms
  shader.uniforms.proj = projection
  shader.uniforms.view = view
  shader.uniforms.model = model

  // draw object
  geometry.draw(gl.LINES)
}

function createBoundsGeometry(bounds) {
  var deltas = xyzDeltas(bounds[0], bounds[1])
  var cube = createCube.apply(null, deltas)
  // fix height
  cube.positions.forEach(function(pos){ pos[1] += deltas[1]/2 })
  var geometry = Geometry(gl)
  geometry.attr('aPosition', cube.positions)
  geometry.attr('aNormal', cube.normals)
  geometry.faces(wireframe(cube.cells))
  return geometry
}

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}

function randomVec3(posA, posB){
  var xyz = [0,1,2].map(function(d){
    return Math.random()*(posA[d]-posB[d])+posA[d]
  })
  return vec3.fromValues(xyz[0],xyz[1],xyz[2])
}

function xyzDeltas(posA, posB) {
  return [0,1,2].map(function(d){
    return posB[d]-posA[d]
  })
}

