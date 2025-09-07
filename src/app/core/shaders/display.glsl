#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;

uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform sampler2D uSunrays;
uniform sampler2D uDithering;
uniform vec2 ditherScale;
uniform vec2 texelSize;

out vec4 outColor;

vec3 linearToGamma(vec3 color) {
  color = max(color, vec3(0.0f));
  return max(1.055f * pow(color, vec3(0.416666667f)) - 0.055f, vec3(0.0f));
}

void main() {
  vec3 c = texture(uTexture, vUv).rgb;

#ifdef SHADING
  vec3 lc = texture(uTexture, vL).rgb;
  vec3 rc = texture(uTexture, vR).rgb;
  vec3 tc = texture(uTexture, vT).rgb;
  vec3 bc = texture(uTexture, vB).rgb;

  float dx = length(rc) - length(lc);
  float dy = length(tc) - length(bc);

  vec3 n = normalize(vec3(dx, dy, length(texelSize)));
  vec3 l = vec3(0.0f, 0.0f, 1.0f);

  float diffuse = clamp(dot(n, l) + 0.7f, 0.7f, 1.0f);
  c *= diffuse;
#endif

#ifdef BLOOM
  vec3 bloom = texture(uBloom, vUv).rgb;
#endif

#ifdef SUNRAYS
  float sunrays = texture(uSunrays, vUv).r;
  c *= sunrays;
    #ifdef BLOOM
  bloom *= sunrays;
    #endif
#endif

#ifdef BLOOM
  float noise = texture(uDithering, vUv * ditherScale).r;
  noise = noise * 2.0f - 1.0f;
  bloom += noise / 255.0f;
  bloom = linearToGamma(bloom);
  c += bloom;
#endif

  float a = max(c.r, max(c.g, c.b));
  outColor = vec4(c, a);
}