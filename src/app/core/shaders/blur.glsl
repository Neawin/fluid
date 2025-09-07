#version 300 es
precision mediump float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
  vec4 sum = texture(uTexture, vUv) * 0.29411764f;
  sum += texture(uTexture, vL) * 0.35294117f;
  sum += texture(uTexture, vR) * 0.35294117f;
  outColor = sum;
}