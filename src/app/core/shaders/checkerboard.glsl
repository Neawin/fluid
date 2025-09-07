#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uTexture;
uniform float aspectRatio;

out vec4 outColor;

#define SCALE 25.0

void main() {
  vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0f));
  float v = mod(uv.x + uv.y, 2.0f);
  v = v * 0.1f + 0.8f;
  outColor = vec4(vec3(v), 1.0f);
}