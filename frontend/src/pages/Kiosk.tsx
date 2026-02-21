import { Sphere } from '../components/Sphere';
import { UI } from '../components/UI';

const Kiosk = () => {
    return (
        <div className="w-full h-screen relative overflow-hidden bg-black">
            {/* Background gradient — matches Figma TotemPage */}
            <div
                className="absolute inset-0 -z-10"
                style={{
                    background: 'radial-gradient(ellipse at 50% 30%, #0a1628 0%, #050d1a 45%, #000000 100%)',
                }}
            />
            {/* Cyan top glow */}
            <div
                className="absolute top-0 left-0 w-full h-1/2 -z-10 opacity-60"
                style={{ background: 'linear-gradient(to bottom, rgba(8,145,178,0.08) 0%, transparent 100%)' }}
            />

            {/* Figma Sphere */}
            <Sphere />

            {/* UI Overlay */}
            <UI />
        </div>
    );
};

export default Kiosk;
