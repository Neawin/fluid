#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;

out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;

uniform vec2 texelSize;

void main() {
  vUv = aPosition * 0.5f + 0.5f;
  vL = vUv - vec2(texelSize.x, 0.0f);
  vR = vUv + vec2(texelSize.x, 0.0f);
  vT = vUv + vec2(0.0f, texelSize.y);
  vB = vUv - vec2(0.0f, texelSize.y);
  gl_Position = vec4(aPosition, 0.0f, 1.0f);
}