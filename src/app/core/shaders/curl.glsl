#version 300 es
precision mediump float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;

uniform sampler2D uVelocity;

out vec4 outColor;

void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  outColor = vec4(0.5f * vorticity, 0.0f, 0.0f, 1.0f);
}