#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;

out vec2 vUv;
out vec2 vL;
out vec2 vR;

uniform vec2 texelSize;

void main() {
  vUv = aPosition * 0.5f + 0.5f;
  float offset = 1.33333333f;
  vL = vUv - texelSize * offset;
  vR = vUv + texelSize * offset;
  gl_Position = vec4(aPosition, 0.0f, 1.0f);
}