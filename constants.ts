
import { OutfitCategory } from './types';

export const OUTFIT_CATEGORIES: OutfitCategory[] = [
  OutfitCategory.FAVORITES,
  OutfitCategory.ALL,
  OutfitCategory.CASUAL,
  OutfitCategory.FORMAL,
  OutfitCategory.PARTY,
  OutfitCategory.ETHNIC,
];

export const VIEW_ANGLES: string[] = [
  'Front',
  'Right',
  'Back',
  'Left',
];

// --- Carousel Images ---
export const FEMALE_IMAGES = [
  'https://drive.google.com/thumbnail?id=17E6CavrK2j9h7DPlTG_wB9PFOkpLEEqD&sz=w1000',
  'https://drive.google.com/thumbnail?id=1761byymEKax47rwttnP3UGbIkC1erb1c&sz=w1000',
  'https://drive.google.com/thumbnail?id=16jyN4f6xgE4tolLSysaN7KUFxXJfNNpp&sz=w1000',
  'https://drive.google.com/thumbnail?id=16V9YWGCtRhxEtpbJXXMa5S9AmqHfjtbM&sz=w1000',
  'https://drive.google.com/thumbnail?id=17JZAs4CxgFAi6wRXjOLAo_kVnz4ge5uH&sz=w1000',
  'https://drive.google.com/thumbnail?id=16fMdIQGbKYK6rdx_jg3khtfr3pFgTErE&sz=w1000',
  'https://drive.google.com/thumbnail?id=16cFfL8Ou8_LRzWG9Z3COSrGNsDi-Sh8y&sz=w1000',
  'https://drive.google.com/thumbnail?id=16IOdQnPHDA2rj1dRUxAq9KnaLljffjdC&sz=w1000',
];

export const MALE_IMAGES = [
  'https://drive.google.com/thumbnail?id=17PTX68HZJYJRa6_EKqnsHhTzgU-4bEPs&sz=w1000',
  'https://drive.google.com/thumbnail?id=17QjXOoKDCOU4RN0G_GIIrqMm0YHKummd&sz=w1000',
  'https://drive.google.com/thumbnail?id=17CzwmI4cPC2bonStEgkKLNAhmVI_9FIw&sz=w1000',
  'https://drive.google.com/thumbnail?id=17DQ_LHrGlL-ybPphOjSRAQEkmlR_pSmc&sz=w1000',
  'https://drive.google.com/thumbnail?id=16kETuaDF2JvPaCBHWuj0LtY_eXO8fW-I&sz=w1000',
  'https://drive.google.com/thumbnail?id=16izYHnvhRbe08EXqJI685aD4C31aWZR9&sz=w1000',
  'https://drive.google.com/thumbnail?id=16YbeW0DpngoT3ag_DZqVwxs3r6ro4Loq&sz=w1000',
];

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const ALL_IMAGES = shuffleArray([...FEMALE_IMAGES, ...MALE_IMAGES]);
