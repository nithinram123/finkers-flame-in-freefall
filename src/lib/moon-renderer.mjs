const vertexSource = `
attribute vec2 position;
varying vec2 point;
void main() {
  point = position;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// Intersect an orthographic ray with a unit sphere, then look up the rotated
// surface by longitude and latitude. Both maps use NASA's 0°-centered projection.
const fragmentSource = `
precision highp float;
varying vec2 point;
uniform sampler2D albedo;
uniform sampler2D terrain;
uniform vec2 spin;
uniform vec2 pointerLight;

mat3 turnY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
}
mat3 turnX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c);
}

void main() {
  vec2 p = point / 0.967;
  float r = dot(p, p);
  if (r > 1.0) discard;

  vec3 viewNormal = vec3(p, sqrt(1.0 - r));
  vec3 surface = turnY(spin.x) * turnX(spin.y) * viewNormal;
  float longitude = atan(surface.x, surface.z);
  vec2 uv = vec2(0.5 + longitude / 6.2831853, 0.5 - asin(clamp(surface.y, -1.0, 1.0)) / 3.1415927);
  vec3 color = texture2D(albedo, uv).rgb;

  vec2 stepSize = vec2(1.0 / 1024.0, 1.0 / 512.0);
  vec2 slope = vec2(
    texture2D(terrain, uv + vec2(stepSize.x, 0.0)).r - texture2D(terrain, uv - vec2(stepSize.x, 0.0)).r,
    texture2D(terrain, uv - vec2(0.0, stepSize.y)).r - texture2D(terrain, uv + vec2(0.0, stepSize.y)).r
  );
  vec3 east = vec3(cos(longitude), 0.0, -sin(longitude));
  vec3 north = normalize(cross(surface, east));
  vec3 relief = normalize(surface - 2.05 * (slope.x * east + slope.y * north));
  vec3 normal = turnX(-spin.y) * turnY(-spin.x) * relief;

  vec3 key = normalize(vec3(-0.62, 0.52, 0.57));
  vec3 spot = normalize(vec3(pointerLight, 0.88));
  float keyDiffuse = max(dot(normal, key), 0.0);
  float spotDiffuse = pow(max(dot(normal, spot), 0.0), 2.45);
  float limb = smoothstep(0.38, 1.0, 1.0 - viewNormal.z);
  float rim = limb * max(dot(viewNormal, normalize(vec3(0.74, -0.25, 0.32))), 0.0);
  vec3 light = vec3(0.13,0.13,0.18)
    + keyDiffuse * vec3(0.75,0.78,0.90)
    + spotDiffuse * vec3(0.43,0.39,0.51);
  vec3 lit = color * light * 1.18 + rim * vec3(0.045,0.032,0.105);
  float peak = max(lit.r, max(lit.g, lit.b));
  lit /= 1.0 + 0.55 * max(peak - 0.36, 0.0);
  gl_FragColor = vec4(lit, 1.0 - smoothstep(0.991, 1.0, r));
}`;

const initialLight = [-0.48, 0.42];
const initialSpin = [0.09, -0.13];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Moon texture did not load'));
    image.src = src;
  });
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const message = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(message);
}

function buildProgram(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment;
  try {
    fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message);
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

export function createMoonRenderer(canvas, { preserveDrawingBuffer = false } = {}) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer,
  });
  if (!gl) throw new Error('WebGL is unavailable');
  const program = buildProgram(gl);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uLight = gl.getUniformLocation(program, 'pointerLight');
  const uSpin = gl.getUniformLocation(program, 'spin');
  const textures = ['albedo', 'terrain'].map((name, index) => {
    const texture = gl.createTexture();
    gl.uniform1i(gl.getUniformLocation(program, name), index);
    return texture;
  });

  let disposed = false;
  let ready = false;
  function bind(texture, image, index) {
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  return {
    async load() {
      const images = await Promise.all([
        loadImage('/lunar/lroc-color.jpg'),
        loadImage('/lunar/lola-elevation.jpg'),
      ]);
      if (disposed) return false;
      images.forEach((image, index) => bind(textures[index], image, index));
      ready = true;
      return true;
    },
    draw(spin = initialSpin, light = initialLight) {
      if (!ready || disposed) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2fv(uSpin, spin);
      gl.uniform2fv(uLight, light);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      disposed = true;
      textures.forEach((texture) => gl.deleteTexture(texture));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export const moonDefaultPose = { spin: initialSpin, light: initialLight };
