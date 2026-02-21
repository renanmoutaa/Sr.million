import { useGLTF, useFBX } from '@react-three/drei';
import { useGraph, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useEffect } from 'react';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { useChatStore } from '../store/useChatStore';
import { avatarController } from '../controllers/AvatarController';

const DEFAULT_AVATAR = "https://models.readyplayer.me/69961da73781699417e09098.glb";

// --- Helper: Find Bone Recursively ---
const findBone = (nodes: any, patterns: string[]) => {
    return Object.values(nodes).find((node: any) => {
        if (!node.isBone || !node.name) return false;
        const lowerName = node.name.toLowerCase();
        return patterns.some(p => lowerName.includes(p.toLowerCase()));
    });
};

import { useControls } from 'leva';

const AvatarLogic = ({ scene, nodes, status, currentViseme, morphTargets }: any) => {
    const group = useRef<THREE.Group>(null);
    const bonesRef = useRef<any>({});

    // DEBUG CONTROLS
    const {
        leftArmX, leftArmY, leftArmZ,
        rightArmX, rightArmY, rightArmZ,
        leftForeArmX, leftForeArmY, leftForeArmZ,
        rightForeArmX, rightForeArmY, rightForeArmZ,
        shoulderLeftZ, shoulderRightZ
    } = useControls('Arm Pose Debug', {
        leftArmX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
        leftArmY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
        leftArmZ: { value: 1.4, min: -Math.PI, max: Math.PI, step: 0.1 },
        rightArmX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
        rightArmY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
        rightArmZ: { value: -1.4, min: -Math.PI, max: Math.PI, step: 0.1 },
        leftForeArmX: { value: 0.2, min: -Math.PI, max: Math.PI, step: 0.1 },
        leftForeArmY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
        leftForeArmZ: { value: 0.2, min: -Math.PI, max: Math.PI, step: 0.1 },
        rightForeArmX: { value: 0.2, min: -Math.PI, max: Math.PI, step: 0.1 },
        rightForeArmY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
        rightForeArmZ: { value: -0.2, min: -Math.PI, max: Math.PI, step: 0.1 },
        shoulderLeftZ: { value: 0.1, min: -1, max: 1, step: 0.1 },
        shoulderRightZ: { value: -0.1, min: -1, max: 1, step: 0.1 }
    });

    // 1. Auto-Rigging on Load
    useEffect(() => {
        if (!nodes) return;

        // DEBUG: Print all bone names to find the correct ones
        console.log('=== ALL BONES IN MODEL ===');
        Object.values(nodes).forEach((node: any) => {
            if (node.isBone) {
                console.log(`Bone: "${node.name}" | rot: x=${node.rotation.x.toFixed(2)} y=${node.rotation.y.toFixed(2)} z=${node.rotation.z.toFixed(2)}`);
            }
            if (node.morphTargetDictionary) {
                console.log(`Mesh with Morphs: "${node.name}"`, Object.keys(node.morphTargetDictionary));
            }
        });

        // Map common bone names to our internal structure
        bonesRef.current = {
            head: findBone(nodes, ['Head', 'Bip01_Head', 'mixamorig:Head', 'CC_Base_Head']),
            neck: findBone(nodes, ['Neck', 'Bip01_Neck', 'mixamorig:Neck', 'CC_Base_Neck']),
            spine: findBone(nodes, ['Spine', 'Bip01_Spine', 'mixamorig:Spine', 'Bip01_Spine1', 'CC_Base_Spine02']),
            hips: findBone(nodes, ['Hips', 'Bip01_Pelvis', 'mixamorig:Hips', 'Root', 'CC_Base_Hip']),
            leftArm: findBone(nodes, ['LeftArm', 'L_Arm', 'mixamorig:LeftArm', 'Bip01_L_UpperArm', 'Arm_L', 'CC_Base_L_Upperarm']),
            rightArm: findBone(nodes, ['RightArm', 'R_Arm', 'mixamorig:RightArm', 'Bip01_R_UpperArm', 'Arm_R', 'CC_Base_R_Upperarm']),
            leftForeArm: findBone(nodes, ['LeftForeArm', 'L_Elbow', 'mixamorig:LeftForeArm', 'Bip01_L_Forearm', 'ForeArm_L', 'CC_Base_L_Forearm']),
            rightForeArm: findBone(nodes, ['RightForeArm', 'R_Elbow', 'mixamorig:RightForeArm', 'Bip01_R_Forearm', 'ForeArm_R', 'CC_Base_R_Forearm']),
            leftShoulder: findBone(nodes, ['LeftShoulder', 'L_Clavicle', 'mixamorig:LeftShoulder', 'Bip01_L_Clavicle', 'Shoulder_L', 'CC_Base_L_Clavicle']),
            rightShoulder: findBone(nodes, ['RightShoulder', 'R_Clavicle', 'mixamorig:RightShoulder', 'Bip01_R_Clavicle', 'Shoulder_R', 'CC_Base_R_Clavicle']),
            jaw: findBone(nodes, ['Jaw', 'Teeth', 'Mandible', 'CC_Base_JawRoot']),
        };

        console.log('=== MAPPED BONES ===', Object.entries(bonesRef.current).map(([k, v]: any) => `${k}: ${v?.name || 'NOT FOUND'}`));

    }, [nodes]);

    useFrame((state, delta) => {
        if (!group.current || !nodes) return;

        const { leftArm, rightArm, leftForeArm, rightForeArm, leftShoulder, rightShoulder } = bonesRef.current;

        // Apply DEBUG Controls
        if (leftShoulder) leftShoulder.rotation.z = shoulderLeftZ;
        if (rightShoulder) rightShoulder.rotation.z = shoulderRightZ;

        if (leftArm) leftArm.rotation.set(leftArmX, leftArmY, leftArmZ);
        if (rightArm) rightArm.rotation.set(rightArmX, rightArmY, rightArmZ);

        if (leftForeArm) leftForeArm.rotation.set(leftForeArmX, leftForeArmY, leftForeArmZ);
        if (rightForeArm) rightForeArm.rotation.set(rightForeArmX, rightForeArmY, rightForeArmZ);

        // Delegate all animation logic to the Controller
        avatarController.update(
            delta,
            state.clock.elapsedTime,
            nodes,
            morphTargets,
            bonesRef.current,
            status
        );
    });

    return (
        <group ref={group} dispose={null}>
            <primitive object={scene} />
        </group>
    );
};

const GlbAvatar = ({ url, ...props }: any) => {
    const { scene } = useGLTF(url);
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes } = useGraph(clone);
    return <AvatarLogic scene={clone} nodes={nodes} {...props} />;
};

const FbxAvatar = ({ url, ...props }: any) => {
    const fbx = useFBX(url);
    const clone = useMemo(() => SkeletonUtils.clone(fbx), [fbx]);
    const { nodes } = useGraph(clone);
    return <AvatarLogic scene={clone} nodes={nodes} {...props} />;
};

export function Avatar(props: any) {
    const { settings, fetchSettings, currentViseme, status, morphTargets } = useChatStore();

    useEffect(() => {
        if (!settings) fetchSettings();
    }, [settings, fetchSettings]);

    const avatarUrl = settings?.avatar_url || DEFAULT_AVATAR;
    const isFBX = avatarUrl.toLowerCase().endsWith('.fbx');

    if (isFBX) {
        return <FbxAvatar url={avatarUrl} status={status} currentViseme={currentViseme} morphTargets={morphTargets} />;
    }
    return <GlbAvatar url={avatarUrl} status={status} currentViseme={currentViseme} morphTargets={morphTargets} />;
}
