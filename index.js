var Shell = require('gl-now')
var createMesh = require('gl-mesh')
var Geometry = require('gl-geometry')
var getNormals  = require('normals')
var glslify  = require('glslify')
var glShader = require('gl-shader')
var attachCamera = require('game-shell-fps-cam')
var glm = require('gl-matrix')
var bunny = require('bunny')
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
var projection = mat4.create()
var view       = mat4.create()

shell.on('gl-init', function() {
  gl = shell.gl

  // gl settings
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  // initialize shaders
  shaders.normals = glShader(gl,
    glslify('./shaders/bunny.vert'),
    glslify('./shaders/bunny.frag')
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

  // // bind all shaders
  // valuesFor(shaders).forEach(function(shader){
  //   shader.bind()
  // })
  scene.forEach(renderObj)

})

function renderObj(obj) {
  var shader = shaders.normals
  var geometry = obj.geometry
  var matrix = obj.matrix

  // bind shader
  shader.bind()
  geometry.bind(shader)

  // set uniforms
  shader.uniforms.uProjection = projection
  shader.uniforms.uView = view
  shader.uniforms.uModel = matrix

  // draw object
  geometry.draw(gl.TRIANGLES)
  geometry.unbind()
}


function createBunny(gl){
  geometry = Geometry(gl)
  geometry.attr('aPosition', bunny.positions)
  var normals = getNormals.vertexNormals(bunny.cells, bunny.positions)
  geometry.attr('aNormal', normals)
  geometry.faces(bunny.cells)
  var matrix      = mat4.create()
  // position
  mat4.translate(matrix, matrix, randomVec3([0,0,0],[100,0,100]))
  // scale
  mat4.scale(matrix, matrix, vec3.fromValues(0.1,0.1,0.1))
  return {
    geometry: geometry,
    matrix: matrix,
  }
}

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}

function randomVec3(start, end){
  var xyz = [0,1,2].map(function(d){
    return Math.random()*(start[d]-end[d])+start[d]
  })
  return vec3.fromValues(xyz[0],xyz[1],xyz[2])
}

