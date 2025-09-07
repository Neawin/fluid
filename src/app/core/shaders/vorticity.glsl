#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;

out vec4 outColor;

void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;

  vec2 force = 0.5f * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001f;
  force *= curl * C;
  force.y *= -1.0f;

  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = clamp(velocity, vec2(-1000.0f), vec2(1000.0f));

  outColor = vec4(velocity, 0.0f, 1.0f);
}
