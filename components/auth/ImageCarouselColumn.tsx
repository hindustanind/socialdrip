import React, { useMemo } from 'react';
import { ALL_IMAGES } from '../../constants';

const ImageColumn: React.FC<{ images: string[], duration: string, direction: 'up' | 'down' }> = ({ images, duration, direction }) => (
    <div className="flex-1 h-full overflow-hidden">
        <div 
            className={`flex flex-col gap-y-4 ${direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'}`}
            style={{ animationDuration: duration }}
        >
            {/* Duplicate images for seamless loop */}
            {[...images, ...images].map((src, index) => (
                <img
                    key={index}
                    src={src}
                    alt=""
                    className="w-full h-auto object-cover rounded-lg aspect-[3/4] flex-shrink-0"
                    draggable="false"
                    loading="lazy"
                />
            ))}
        </div>
    </div>
);


const ImageCarouselColumn: React.FC = () => {
    const columns = useMemo(() => {
        const col1: string[] = [];
        const col2: string[] = [];
        const col3: string[] = [];
        // Ensure we have enough images to avoid errors if ALL_IMAGES is small
        const extendedImages = [...ALL_IMAGES, ...ALL_IMAGES, ...ALL_IMAGES];

        extendedImages.forEach((img, i) => {
            if (i % 3 === 0) col1.push(img);
            else if (i % 3 === 1) col2.push(img);
            else col3.push(img);
        });
        return [col1, col2, col3];
    }, []);

    return (
        <div className="relative h-full w-full flex gap-4 p-4 [transform:rotateX(15deg)_rotateY(-20deg)_scale(1.1)] opacity-100">
            <ImageColumn images={columns[0]} duration="80s" direction="up" />
            <ImageColumn images={columns[1]} duration="120s" direction="down" />
            <ImageColumn images={columns[2]} duration="90s" direction="up" />

            {/* Top Gradient Overlay */}
            <div className="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-[#0a0118] to-transparent z-10 pointer-events-none" />
            
            {/* Bottom Gradient Overlay */}
            <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-[#0a0118] to-transparent z-10 pointer-events-none" />
        </div>
    );
};

export default ImageCarouselColumn;