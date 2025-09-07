#version 300 es
precision mediump float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;

out vec4 outColor;

void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;

  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B);

  outColor = vec4(velocity, 0.0f, 1.0f);
}