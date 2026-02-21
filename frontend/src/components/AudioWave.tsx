import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useChatStore } from '../store/useChatStore';
import { audioManager } from '../utils/AudioManager';

import { useAccessibilityStore } from '../store/useAccessibilityStore';

// Vertex Shader
const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uFrequency;

    void main() {
        vUv = uv;
        vNormal = normal;
        
        // Slight breathing
        vec3 pos = position + normal * (sin(uTime * 2.0) * 0.02 + uFrequency * 0.1);
        vPosition = pos;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

// Fragment Shader: 2 Orbiting Metaballs + Ink Trail Noise
const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uFrequency;
    uniform vec3 uColorA;
    uniform vec3 uColorB;

    // Smin for metaballs
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    void main() {
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 normal = normalize(vNormal);
        float fresnel = pow(1.0 - dot(viewDir, normal), 2.0);

        // Define 2 Orbiting Spheres (Metaballs in 3D space relative to surface)
        float t = uTime * 2.0;
        
        // Sphere 1 (Fast, erratic)
        vec3 p1 = vec3(sin(t), cos(t * 1.3), sin(t * 0.7)) * 0.4;
        
        // Sphere 2 (Chasing)
        vec3 p2 = vec3(cos(t * 0.9), sin(t), cos(t * 1.5)) * 0.4;
        
        // Distances from surface point to internal points
        float d1 = length(vPosition - p1);
        float d2 = length(vPosition - p2);
        
        // Create "Blob" influence
        float blob = smin(d1, d2, 0.3); // Smooth union
        
        // Invert: we want close to be 1.0
        float intensity = smoothstep(0.6, 0.1, blob);
        
        // Ink Trail Effect: Add noise based on angle
        float noise = sin(vPosition.x * 20.0 + uTime * 5.0) * sin(vPosition.y * 20.0);
        
        // Mix Colors
        float colorMix = smoothstep(d1, d2, 0.0);
        vec3 inkColor = mix(uColorA, uColorB, colorMix);
        
        // Core Visuals
        vec3 color = inkColor * intensity * 2.0;
        
        // Add variations/trails
        if (intensity > 0.1) {
            color += noise * 0.1 * uColorB;
        }

        // Fresnel Rim
        color += fresnel * mix(uColorA, uColorB, 0.5) * 1.5;
        
        // Audio React
        color += uFrequency * 0.5;

        // Alpha
        float alpha = 0.2 + intensity * 0.8 + fresnel * 0.5;
        
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    }
`;

export const AudioWave = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { status } = useChatStore();

    // Palettes
    const palettes: Record<string, [THREE.Color, THREE.Color]> = useMemo(() => ({
        idle: [new THREE.Color('#4c1d95'), new THREE.Color('#22d3ee')],
        listening: [new THREE.Color('#059669'), new THREE.Color('#34d399')],
        thinking: [new THREE.Color('#d97706'), new THREE.Color('#fbbf24')],
        speaking: [new THREE.Color('#7e22ce'), new THREE.Color('#e879f9')],
    }), []);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uFrequency: { value: 0 },
        uColorA: { value: new THREE.Color('#4c1d95') },
        uColorB: { value: new THREE.Color('#22d3ee') }
    }), []);

    const { reducedMotion } = useAccessibilityStore();

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const material = meshRef.current.material as THREE.ShaderMaterial;

        // Time
        material.uniforms.uTime.value += delta * 0.5;

        // Rotation - Disable if Reduced Motion
        if (!reducedMotion) {
            meshRef.current.rotation.y += delta * 0.1;
            meshRef.current.rotation.z += delta * 0.05;
        }

        let targetFreq = 0.0;
        if (status === 'speaking' || status === 'listening') {
            const level = audioManager.getAudioLevel();
            targetFreq = level;
        } else if (status === 'thinking') {
            targetFreq = (Math.sin(state.clock.elapsedTime * 8) + 1) * 0.2;
        }

        material.uniforms.uFrequency.value = THREE.MathUtils.lerp(
            material.uniforms.uFrequency.value, targetFreq, 0.1
        );

        const [targetA, targetB] = palettes[status] || palettes.idle;
        material.uniforms.uColorA.value.lerp(targetA, 0.05);
        material.uniforms.uColorB.value.lerp(targetB, 0.05);
    });

    return (
        <group scale={0.9}>
            <mesh ref={meshRef} position={[0, 0, 0]}>
                <sphereGeometry args={[1, 128, 128]} />
                <shaderMaterial
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                    transparent={true}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            <Sparkles
                count={80}
                scale={2.2}
                size={4}
                speed={0.4}
                opacity={0.6}
                color={palettes[status]?.[1] ? "#" + palettes[status][1].getHexString() : "#ffffff"}
            />
        </group>
    );
};
