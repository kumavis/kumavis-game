var createTileMap = require('gl-tile-map')
var ndarray = require('ndarray')
var terrain = require('isabella-texture-pack')
// var createWireShader = require('./lib/wireShader.js')
var createAOShader = require('ao-shader')
// var examples = require('./lib/examples.js')
// var createVoxelMesh = require('./lib/createMesh.js')
var glm = require('gl-matrix')
var mat4 = glm.mat4

module.exports = {
  init: init,
  render: render,
  create: createMesh,
}

//Tile size parameters
var TILE_COUNT = 16
var TILE_SIZE = Math.floor(terrain.shape[0] / TILE_COUNT)|0

//Config variables
var texture, shader

function createMesh(gl) {
  return createVoxelMesh(gl, 'sphere', makeSphere([32,32,32]))
}


function init(gl) {

  //Create shaders
  shader = createAOShader(gl)
  
  //Create texture atlas
  var tiles = ndarray(
    terrain.data,
    [16,16,terrain.shape[0]>>4,terrain.shape[1]>>4,4],
    [terrain.stride[0]*16, terrain.stride[1]*16, terrain.stride[0], terrain.stride[1], terrain.stride[2]],
    0
  )
  texture = createTileMap(gl, tiles, 2)
  // none
  texture.magFilter = gl.NEAREST
  texture.minFilter = gl.NEAREST
  texture.mipSamples = 1
  // // linear
  // texture.magFilter = gl.LINEAR
  // texture.minFilter = gl.LINEAR_MIPMAP_LINEAR
  // texture.mipSamples = 1
  // // aniso
  // texture.magFilter = gl.LINEAR
  // texture.minFilter = gl.LINEAR_MIPMAP_LINEAR
  // texture.mipSamples = 4
}

var initialized = false

function render(gl, projection, view, obj) {
  
  if (!initialized) {
    initialized = true
    init(gl)
  }
 
  //Calculation projection matrix
  var model = obj.matrix
  var mesh = obj.blob
  
  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  //Bind the shader
  shader.bind()
  shader.attributes.attrib0.location = 0
  shader.attributes.attrib1.location = 1
  shader.uniforms.projection = projection
  shader.uniforms.view = view
  shader.uniforms.model = model
  shader.uniforms.tileSize = TILE_SIZE
  shader.uniforms.tileCount = TILE_COUNT
  shader.uniforms.tileMap = texture.bind()
  
  mesh.triangleVAO.bind()
  gl.drawArrays(gl.TRIANGLES, 0, mesh.triangleVertexCount)
  mesh.triangleVAO.unbind()
}

// createVoxelMesh

var ndarray = require('ndarray')
var createBuffer = require('gl-buffer')
var createVAO = require('gl-vao')
var createAOMesh = require('ao-mesher')
// var ops = require('ndarray-ops')

var cached = {}

//Creates a mesh from a set of voxels
function createVoxelMesh(gl, name, voxels) {
  if(name in cached) {
    return cached[name]
  }
  
  //Create mesh
  var vert_data = createAOMesh(voxels)
  
  //Upload triangle mesh to WebGL
  var triangleVertexCount = Math.floor(vert_data.length/8)
  var vert_buf = createBuffer(gl, vert_data)
  var triangleVAO = createVAO(gl, [{
    buffer: vert_buf,
    type: gl.UNSIGNED_BYTE,
    size: 4,
    offset: 0,
    stride: 8,
    normalized: false,
  },{
    buffer: vert_buf,
    type: gl.UNSIGNED_BYTE,
    size: 4,
    offset: 4,
    stride: 8,
    normalized: false,
  }])
  
  //Bundle result and return
  var result = {
    triangleVertexCount: triangleVertexCount,
    triangleVAO: triangleVAO,
    // wireVertexCount: wireVertexCount,
    // wireVAO: wireVAO,
    center: [voxels.shape[0]>>1, voxels.shape[1]>>1, voxels.shape[2]>>1],
    radius: voxels.shape[2]
  }
  cached[name] = result
  return result
}

// voxel shapes

// var ndarray = require('ndarray')
var fill = require('ndarray-fill')
// var ops = require('ndarray-ops')
// var voxelize = require('voxelize')


//Fill ndarray with function
function makeSphere(size) {
  var result = ndarray(new Int32Array(size[0]*size[1]*size[2]), size)
  fill(result, function(i,j,k) {
    var x = i - 16
    var y = j - 16
    var z = k - 16
    return (x*x + y*y + z*z) < 30 ? (1<<15) + 0x18 : 0
  })
  return result
}