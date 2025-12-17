"use client";
import React, { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Indian theme inspired colors
// Farmer: Saffron orange to deep green (crops/earth)
// Buyer: Deep saffron to warm marigold yellow
const farmerFragmentShaderSource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    for(float i = 1.0; i < 8.0; i++) {
        uv.y += i * 0.1 / i * 
            sin(uv.x * i * i + iTime * 1.4) * sin(uv.y * i * i + iTime * 1.4);
    }

    // Indian Farmer Theme: Deep Forest Green to Earthy Saffron
    vec3 col;
    col.r = uv.y * 0.15 + 0.08;   // Deep green undertone
    col.g = uv.y * 0.35 + 0.18;   // Rich forest green
    col.b = uv.y * 0.08 + 0.05;   // Minimal blue for earthy feel

    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

const buyerFragmentShaderSource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    for(float i = 1.0; i < 8.0; i++) {
        uv.y += i * 0.1 / i * 
            sin(uv.x * i * i + iTime * 1.4) * sin(uv.y * i * i + iTime * 1.4);
    }

    // Indian Buyer Theme: Deep Saffron/Orange to Warm Marigold
    vec3 col;
    col.r = uv.y * 0.4 + 0.25;    // Rich saffron/orange
    col.g = uv.y * 0.18 + 0.10;   // Warm undertone
    col.b = uv.y * 0.05 + 0.03;   // Deep warm base

    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export type BlurSize = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type ThemeMode = "farmer" | "buyer";

interface WaveBackgroundProps {
  backdropBlurAmount?: BlurSize;
  className?: string;
  theme?: ThemeMode;
}

const blurClassMap: Record<BlurSize, string> = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};

function WaveBackground({
  backdropBlurAmount = "sm",
  className = "",
  theme = "farmer",
}: WaveBackgroundProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }
    glRef.current = gl;

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const fragmentSource = theme === "farmer" ? farmerFragmentShaderSource : buyerFragmentShaderSource;

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");

    let startTime = Date.now();
    let animationId: number;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);

      const currentTime = (Date.now() - startTime) / 1000;

      gl.uniform2f(iResolutionLocation, width, height);
      gl.uniform1f(iTimeLocation, currentTime);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [theme]);

  const finalBlurClass = blurClassMap[backdropBlurAmount] || blurClassMap["sm"];

  return (
    <div className={`fixed inset-0 w-full h-full overflow-hidden -z-20 ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      <div className={`absolute inset-0 ${finalBlurClass}`} />
      {/* Overlay for better text readability - strengthened for WCAG contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
    </div>
  );
}

export default WaveBackground;
