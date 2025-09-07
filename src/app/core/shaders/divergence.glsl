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
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;

  vec2 C = texture(uVelocity, vUv).xy;
  if(vL.x < 0.0f) {
    L = -C.x;
  }
  if(vR.x > 1.0f) {
    R = -C.x;
  }
  if(vT.y > 1.0f) {
    T = -C.y;
  }
  if(vB.y < 0.0f) {
    B = -C.y;
  }

  float div = 0.5f * (R - L + T - B);
  outColor = vec4(div, 0.0f, 0.0f, 1.0f);
}