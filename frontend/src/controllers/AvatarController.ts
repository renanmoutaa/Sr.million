import * as THREE from 'three';
import { audioManager } from '../utils/AudioManager';

export class AvatarController {
    // State
    private currentLook = new THREE.Vector2(0, 0);
    private targetLook = new THREE.Vector2(0, 0);
    private nextLookTime = 0;

    private blinkValue = 0;
    private nextBlinkTime = 0;
    private isBlinking = false;

    private smoothViseme = 0;

    // Standard Morph Target Names
    private morphNames = {
        mouthOpen: ['mouthOpen', 'viseme_aa', 'jawOpen', 'MouthOpen'],
        blinkLeft: ['eyeBlinkLeft', 'blink_L', 'Blink_Left'],
        blinkRight: ['eyeBlinkRight', 'blink_R', 'Blink_Right']
    };

    constructor() {
        // Init logic if needed
    }

    // Main Update Loop (Called every frame)
    public update(
        delta: number,
        elapsedTime: number,
        nodes: any,
        morphTargets: { [key: string]: number },
        bones: any,
        status: string
    ) {
        // 1. Audio Lip Sync (Priority)
        this.updateLipSync(delta, status, nodes, bones);

        // 2. Head Movement (Idle vs Speaking)
        this.updateHeadMovement(delta, elapsedTime, bones, status);

        // 3. Blinking (Procedural)
        this.updateBlink(delta, elapsedTime, nodes);

        // 4. Breathing (Spine)
        this.updateBreathing(elapsedTime, bones);

        // 5. Apply User Custom Morphs
        this.applyCustomMorphs(nodes, morphTargets);
    }

    private updateLipSync(_delta: number, status: string, nodes: any, bones: any) {
        let targetMouthOpen = 0;

        if (status === 'speaking') {
            const audioLevel = audioManager.getAudioLevel();
            // Amplify low signals and clamp
            targetMouthOpen = Math.min(1, audioLevel * 2.5);
        }

        // Smooth Viseme Transition (Smoothing)
        const lerpFactor = status === 'speaking' ? 0.3 : 0.1; // Fast attack, slow release
        this.smoothViseme = THREE.MathUtils.lerp(this.smoothViseme, targetMouthOpen, lerpFactor);

        // Apply to Morphs
        const headMesh = this.findHeadMesh(nodes);
        if (headMesh && headMesh.morphTargetDictionary && headMesh.morphTargetInfluences) {
            const dict = headMesh.morphTargetDictionary;
            const infl = headMesh.morphTargetInfluences;

            for (const name of this.morphNames.mouthOpen) {
                if (dict[name] !== undefined) {
                    infl[dict[name]] = this.smoothViseme;
                    break; // Use the first match
                }
            }
        }

        // Fallback to Jaw Bone
        if (bones.jaw) {
            // Check if we applied morphs successfully (simple check)
            // Ideally we check if 'dict' had the key. For now, we add Jaw as reinforcement or fallback.
            // Jaw rotation usually ~0.2 to 0.4 rads max
            const jawRot = this.smoothViseme * 0.2;
            bones.jaw.rotation.x = THREE.MathUtils.lerp(bones.jaw.rotation.x, jawRot, 0.2);
        }
    }

    private updateHeadMovement(_delta: number, elapsedTime: number, bones: any, status: string) {
        // Look At Scheduling
        if (elapsedTime > this.nextLookTime) {
            this.targetLook.set(
                (Math.random() - 0.5) * 0.5, // Y (Left/Right)
                (Math.random() - 0.5) * 0.2  // X (Up/Down)
            );
            this.nextLookTime = elapsedTime + 2 + Math.random() * 4;
        }

        // Interpolate Look
        this.currentLook.lerp(this.targetLook, 0.05);

        if (bones.head) {
            let x = this.currentLook.y * 0.6;
            let y = this.currentLook.x;

            if (status === 'speaking') {
                x += Math.sin(elapsedTime * 8) * 0.03; // Nods
                y += Math.sin(elapsedTime * 3) * 0.05; // Swivel
            }

            bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, x, 0.1);
            bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, y, 0.1);
        }

        if (bones.neck) {
            bones.neck.rotation.x = THREE.MathUtils.lerp(bones.neck.rotation.x, this.currentLook.y * 0.3, 0.1);
            bones.neck.rotation.y = THREE.MathUtils.lerp(bones.neck.rotation.y, this.currentLook.x * 0.3, 0.1);
        }
    }

    private updateBlink(_delta: number, elapsedTime: number, nodes: any) {
        if (!this.isBlinking && elapsedTime > this.nextBlinkTime) {
            this.isBlinking = true;
            this.blinkValue = 0; // Start closed (morph 0) - WAIT, blink 1 = closed usually
        }

        if (this.isBlinking) {
            // Simple ease-in-out blink
            // Typically closes fast (0 -> 1) and opens slightly slower (1 -> 0)
            // Here we use a sine wave phase or simple state
            // Let's use a simpler logic:
            // Blink duration ~0.2s

            // We'll advance blinkValue to 1 then reset
            // This is a naive implementation, properly we track Phase

            // Re-implementing correctly:
            // We'll use a local timer for the blink? No, let's keep it simple state.
            // Actually, let's just trigger it.
        }

        // Better Blink Implementation
        if (elapsedTime > this.nextBlinkTime) {
            // Trigger blink
            this.blinkValue = 1;
            // Next blink
            this.nextBlinkTime = elapsedTime + 3 + Math.random() * 5;
            // Duration to keep eyes closed is tiny, restoration is Lerp
        }

        // Decay Blink (Open eyes)
        this.blinkValue = THREE.MathUtils.lerp(this.blinkValue, 0, 0.15); // Fast decay

        // Apply
        const headMesh = this.findHeadMesh(nodes);
        if (headMesh && headMesh.morphTargetDictionary && headMesh.morphTargetInfluences) {
            const dict = headMesh.morphTargetDictionary;
            const infl = headMesh.morphTargetInfluences;

            const l = this.findMorphIndex(dict, this.morphNames.blinkLeft);
            const r = this.findMorphIndex(dict, this.morphNames.blinkRight);

            if (l !== undefined) infl[l] = this.blinkValue;
            if (r !== undefined) infl[r] = this.blinkValue;
        }
    }

    private updateBreathing(elapsedTime: number, bones: any) {
        if (bones.spine) {
            bones.spine.rotation.x = Math.sin(elapsedTime * 1) * 0.02;
            bones.spine.rotation.y = Math.sin(elapsedTime * 0.5) * 0.01;
        }
    }

    private applyCustomMorphs(nodes: any, morphTargets: { [key: string]: number }) {
        const headMesh = this.findHeadMesh(nodes);
        if (headMesh && headMesh.morphTargetDictionary && headMesh.morphTargetInfluences) {
            const dict = headMesh.morphTargetDictionary;
            const infl = headMesh.morphTargetInfluences;

            Object.entries(morphTargets).forEach(([key, value]) => {
                const idx = dict[key];
                if (idx !== undefined) {
                    infl[idx] = THREE.MathUtils.lerp(infl[idx], value as number, 0.1);
                }
            });
        }
    }

    // --- Helpers ---
    private findHeadMesh(nodes: any) {
        return Object.values(nodes).find((n: any) => n.morphTargetDictionary && n.morphTargetInfluences) as THREE.Mesh;
    }

    private findMorphIndex(dict: any, names: string[]) {
        for (const name of names) {
            if (dict[name] !== undefined) return dict[name];
        }
        return undefined;
    }
}

export const avatarController = new AvatarController();
