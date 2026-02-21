import { ContactShadows } from '@react-three/drei';
import { Avatar } from './Avatar';

export function Experience() {
    return (
        <>
            <ambientLight intensity={1.5} />
            <directionalLight position={[0, 2, 5]} intensity={2} />
            {/* Posicionamento para enquadramento da cintura para cima */}
            <Avatar position={[0, -1.2, 0]} scale={1.5} />
            <ContactShadows
                opacity={0.4}
                scale={10}
                blur={2.4}
                far={10}
                resolution={256}
                color="#000000"
            />
        </>
    );
}
