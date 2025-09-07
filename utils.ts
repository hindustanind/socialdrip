export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read file as data URL'));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

export const compressImage = (base64Str: string, quality: number = 0.75, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:image/png;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = img.width / img.height;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                width = maxWidth;
                height = width / ratio;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64.split(',')[1]);
        };
        img.onerror = (err) => {
            reject(err);
        };
    });
};