#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
  vec3 c = texture(uTexture, vUv).rgb;
  float a = max(c.r, max(c.g, c.b));
  outColor = vec4(c, a);
}