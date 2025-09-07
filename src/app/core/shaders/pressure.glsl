#version 300 es
precision mediump float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;

out vec4 outColor;

void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float C = texture(uPressure, vUv).x;
  float divergence = texture(uDivergence, vUv).x;

  float pressure = (L + R + B + T - divergence) * 0.25f;

  outColor = vec4(pressure, 0.0f, 0.0f, 1.0f);
}