import { GoogleGenAI, GenerateContentResponse, Modality, Type } from '@google/genai';
import { VIEW_ANGLES } from '../constants';
import { OutfitCategory, AvaTone } from '../types';

// FIX: Per coding guidelines, use process.env.API_KEY to get the API key. This resolves the 'import.meta.env' TypeScript error.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// New Custom Error for Quota Limits
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

// Helper to check for quota-related errors from the Gemini API
const handleApiError = (error: any): never => {
    const errorMessage = (error?.message || '').toLowerCase();
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        throw new QuotaExceededError('API quota exceeded.');
    }
    throw error; // Re-throw other errors
};


// New constants for poses based on user-provided images
const MALE_POSE_DESCRIPTION = "standing facing directly forward, with arms crossed confidently over their chest";
const FEMALE_POSE_DESCRIPTION = "standing facing directly forward, with hands gently clasped together in front of them";

const base64ToGenerativePart = (base64: string, mimeType: string = 'image/jpeg') => {
    return {
        inlineData: { data: base64, mimeType }
    };
};

export interface ModerationResult {
    isValid: boolean;
    reason: string;
}

export const moderateImage = async (base64Image: string): Promise<ModerationResult> => {
    if (!ai) throw new Error("API key not configured.");
    try {
        const imagePart = base64ToGenerativePart(base64Image);
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    imagePart,
                    { text: `Analyze the image for a fashion app. The image is valid if it meets two main criteria: 1. It must feature a person. 2. The person must not be completely nude. Modern swimwear, like bikinis, and other revealing but common clothing are perfectly acceptable. The presence of any text or logos on clothing is irrelevant and should be ignored for moderation purposes. Images of only objects, animals, or landscapes are invalid. Provide a JSON response based on these rules.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        is_valid_fashion_image: {
                            type: Type.BOOLEAN,
                            description: "True if the image contains a person who is not completely nude. Modern swimwear is acceptable. False only if the image does not contain a person or if it contains explicit nudity."
                        },
                        rejection_reason: {
                            type: Type.STRING,
                            description: "If the image is not valid, provide a brief, user-friendly reason (e.g., 'Please upload a photo of a person.' or 'The image contains explicit nudity.'). If valid, this should be an empty string."
                        }
                    },
                    required: ["is_valid_fashion_image", "rejection_reason"]
                }
            }
        });

        const jsonStr = result.text.trim();
        const parsed: { is_valid_fashion_image: boolean; rejection_reason: string } = JSON.parse(jsonStr);
        
        return { 
            isValid: parsed.is_valid_fashion_image, 
            reason: parsed.rejection_reason || "The image is not suitable. Please try another."
        };

    } catch (e: any) {
        if (e instanceof QuotaExceededError) throw e; // Don't re-wrap
        try {
            const jsonStr = e.text.trim();
            const parsed: { is_valid_fashion_image: boolean; rejection_reason: string } = JSON.parse(jsonStr);
             return { 
                isValid: parsed.is_valid_fashion_image, 
                reason: parsed.rejection_reason || "The image is not suitable. Please try another."
            };
        } catch (parseError) {
             console.error("Failed to parse moderation response:", e, "Raw response:", e.text);
             handleApiError(e); // Will throw if it's a quota error or rethrow original
        }
        // Fallback return that should not be reached if handleApiError works correctly
        return { isValid: false, reason: "Could not analyze the image." };
    }
};

// New function to detect gender from an image
export const detectGender = async (base64Image: string): Promise<'Male' | 'Female' | 'Unknown'> => {
    if (!ai) throw new Error("API key not configured.");
    try {
        const imagePart = base64ToGenerativePart(base64Image);
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    imagePart,
                    { text: "Analyze the person in the image. Is the person male or female? Respond with only the word 'Male' or 'Female'." }
                ]
            }
        });
        const genderText = result.text.trim().toLowerCase();
        if (genderText === 'male') return 'Male';
        if (genderText === 'female') return 'Female';
        return 'Unknown';
    } catch (error) {
        console.error("Gender detection failed:", error);
        handleApiError(error);
        return 'Unknown'; // Fallback
    }
};

export const generateCleanFrontView = async (base64Image: string, mimeType: string): Promise<string> => {
    if (!ai) throw new Error("API key not configured.");
    try {
        const gender = await detectGender(base64Image);
        const pose = gender === 'Male' ? MALE_POSE_DESCRIPTION : 'Female' ? FEMALE_POSE_DESCRIPTION : "standing facing directly forward";

        const imagePart = {
          inlineData: { data: base64Image, mimeType: mimeType },
        };
        
        const prompt = `Analyze the input image. If the person is cropped or only partially visible (e.g., half-body), you MUST generate a complete, photorealistic, full-body figure by seamlessly extrapolating the missing parts, including legs and feet.

**Primary Task:** Create a photorealistic, full-body studio photograph of the person.

**Key Instructions:**
1.  **Full Body Generation:** Complete any partial images into a full-body view.
2.  **Standard Pose:** Re-pose the person to be ${pose}.
3.  **Studio Background:** Place the person against a clean, minimalist, off-white studio background.
4.  **No Alterations:** Do NOT change the person's clothing, accessories, hairstyle, or physical appearance. Preserve their identity and style exactly as shown. This is critically important: any text, logos, or graphics on the clothing must be preserved without any changes or objections.
5.  **Output:** Return only the final image. No text, descriptions, or commentary.`;
        
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const imagePartResponse = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePartResponse?.inlineData?.data) {
            return imagePartResponse.inlineData.data;
        }
        
        throw new Error("Failed to generate the front view image from the AI.");
    } catch (error) {
        handleApiError(error);
        // This line will not be reached if handleApiError throws, which it always does.
        // It's here for TypeScript's benefit to ensure all paths return a value.
        throw new Error("Unhandled error in front view generation.");
    }
};

export const generateSingleAngleView = async (frontViewBase64: string, angle: 'Right' | 'Back' | 'Left'): Promise<string> => {
    if (!ai) throw new Error("API key not configured.");
    try {
        const frontViewPart = base64ToGenerativePart(frontViewBase64);
        
        let viewDescription;
        if (angle === 'Back') {
            viewDescription = "the person's back, as if they have turned 180 degrees away from the camera.";
        } else if (angle === 'Right') {
            viewDescription = "the person's right side. Imagine the person in the image turns 90 degrees to THEIR right. Show their right profile.";
        } else { // Left
            viewDescription = "the person's left side. Imagine the person in the image turns 90 degrees to THEIR left. Show their left profile.";
        }

        const prompt = `From the provided front-view image, generate a new image showing ${viewDescription}

**Critical Rules:**
1.  **Correct Angle:** The generated view MUST be the correct angle as described above. The person's left and right sides are distinct and must be rendered correctly. For example, if the person has a watch on their left wrist, it should only be visible in the 'Front' and 'Left' views, and not in the 'Right' view.
2.  **Identity Preservation:** DO NOT CHANGE the person's appearance, clothing, accessories, or hairstyle. Everything must be identical, just viewed from a different angle. This includes text and logos on clothing.
3.  **Consistent Background:** Use the same clean, minimalist, off-white studio background.
4.  **Image Only:** Output ONLY the image. No text or other content.`;

        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [frontViewPart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePartResponse = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePartResponse?.inlineData?.data) {
            return imagePartResponse.inlineData.data;
        }
        throw new Error(`Failed to generate the ${angle} view image from the AI.`);
    } catch(error) {
        handleApiError(error);
        throw new Error(`Unhandled error in ${angle} view generation.`);
    }
};

export const findDuplicateImage = async (newImageBase64: string, existingImages: {id: string, base64: string}[]): Promise<string | null> => {
    if (!ai) throw new Error("API key not configured.");
    if (existingImages.length === 0) return null;

    try {
        const imageParts = [
            base64ToGenerativePart(newImageBase64), // New image is always first
            ...existingImages.map(img => base64ToGenerativePart(img.base64))
        ];

        const prompt = `Analyze the set of images. The first image is the 'new image'. All subsequent images are the 'existing images'. Compare the 'new image' to each of the 'existing images'. Determine if the 'new image' is a visual duplicate of any of the 'existing images'. A duplicate is defined as the same person wearing the exact same clothing.

Return a JSON response. If a duplicate is found, provide the 0-based index of the FIRST matching image in the 'existing images' list. If no duplicates are found, the index should be null.`;

        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        match_index: {
                            type: Type.INTEGER,
                            description: "The 0-based index of the matching image in the 'existing images' list. Should be null if no match is found.",
                            nullable: true,
                        },
                    },
                    required: ['match_index'],
                },
            },
        });

        const jsonStr = result.text.trim();
        const parsed: { match_index: number | null } = JSON.parse(jsonStr);

        if (parsed.match_index !== null && parsed.match_index >= 0 && parsed.match_index < existingImages.length) {
            return existingImages[parsed.match_index].id;
        }
        return null;

    } catch (e) {
        console.error("Failed to parse duplicate check response:", e);
        handleApiError(e);
        return null; // Fail open if non-quota error
    }
};

export const categorizeOutfit = async (frontViewBase64: string): Promise<OutfitCategory> => {
    if (!ai) return OutfitCategory.UNKNOWN;
    try {
        const imagePart = base64ToGenerativePart(frontViewBase64);
        
        const prompt = `Analyze the outfit in the image. Categorize it into one of the following: CASUAL, FORMAL, PARTY, ETHNIC. Respond with only one of these category names.`;
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] }
        });
        
        const categoryText = result.text.trim().toUpperCase();
        if (Object.values(OutfitCategory).includes(categoryText as OutfitCategory)) {
            return categoryText as OutfitCategory;
        }
        return OutfitCategory.UNKNOWN;
    } catch(error) {
        handleApiError(error);
        return OutfitCategory.UNKNOWN;
    }
};

export const generateStylingTips = async (frontViewBase64: string, category: OutfitCategory, styleSignature: string, userName: string): Promise<string> => {
    if (!ai) return "Styling tips are currently unavailable.";
    try {
        const imagePart = base64ToGenerativePart(frontViewBase64);
        const prompt = `You are AVA, a friendly and sharp AI stylist. Analyze the provided ${category} outfit. The user's name is ${userName} and their style signature is "${styleSignature}". 
        Provide 1-2 sentences of concise, actionable, and encouraging styling advice.
        For example, suggest accessories, footwear, or occasions where this outfit would be perfect. Your tone should be positive and helpful.`;

        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
        });
        return result.text.trim();
    } catch(error) {
        handleApiError(error);
        return "Styling tips are currently unavailable due to an error.";
    }
};


export const getStylingAdvice = async (history: { role: string, parts: { text: string }[] }[], savedOutfitsSummary: string, userName: string | null): Promise<string> => {
    if (!ai) return "AVA is currently unavailable.";
    try {
        const systemInstruction = `You are AVA, a personal AI fashion stylist. Your personality is friendly, encouraging, and chic. You are talking to ${userName || 'your friend'}. 
        Their virtual closet contains: ${savedOutfitsSummary}.
        Keep your responses concise and helpful. Never mention you are an AI.`;

        const currentPrompt = history.pop()?.parts[0].text || '';

        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: currentPrompt,
            config: {
                systemInstruction
            }
        });

        return result.text.trim();
    } catch(error) {
        handleApiError(error);
        return "AVA is currently unavailable due to an error.";
    }
};


export const dressAvatar = async (avatarBase64: string, outfitBase64: string): Promise<string> => {
    if (!ai) throw new Error("API key not configured.");
    try {
        const avatarPart = base64ToGenerativePart(avatarBase64, 'image/png');
        const outfitPart = base64ToGenerativePart(outfitBase64, 'image/png');
        
        const prompt = `Take the person from the first image (the avatar) and dress them in the complete outfit from the second image. The final output should be a photorealistic image of the avatar wearing the new outfit, maintaining the avatar's face, hair, and pose. The background should be a clean studio white.`;
        
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [avatarPart, outfitPart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePartResponse = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePartResponse?.inlineData?.data) {
            return imagePartResponse.inlineData.data;
        }
        throw new Error("Failed to generate the dressed avatar image.");
    } catch (error) {
        handleApiError(error);
        throw new Error("Unhandled error in dressing avatar.");
    }
};

export const getAvaStyleAdvice = async (
  history: { role: string; parts: { text: string }[] }[],
  savedOutfitsSummary: string,
  userName: string,
  tone: AvaTone
): Promise<{ advice: string; outfitIds: string[] }> => {
  if (!ai) throw new Error("API key not configured.");
  try {
      const toneInstruction = {
        [AvaTone.CASUAL]: "Your tone is like a cool, supportive best friend: casual, using emojis, and fun!",
        [AvaTone.PROFESSIONAL]: "Your tone is like a high-end fashion consultant: chic, professional, and knowledgeable.",
        [AvaTone.BESTIE]: "Your tone is super enthusiastic, bubbly, and friendly, like a hype-girl bestie. Use lots of exclamation points and positive affirmations!",
      }[tone];

      const systemInstruction = `You are AVA, a personal AI fashion stylist for a user named ${userName}. ${toneInstruction}
      The user's virtual closet contains outfits with the following IDs and categories: ${savedOutfitsSummary}.
      When suggesting an outfit, you MUST include its ID in the format [outfit:ID_HERE] within your response. For example, if you suggest a casual outfit with id 'outfit-123', part of your response must be '[outfit:outfit-123]'.
      You can suggest multiple outfits if the user's query calls for it. Keep your text response helpful but concise.`;
      
      const currentPrompt = history.pop()?.parts[0].text || '';

      const result: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: currentPrompt,
          config: {
              systemInstruction,
          },
      });

      const responseText = result.text.trim();
      const outfitIdRegex = /\[outfit:([\w-]+)\]/g;
      const outfitIds = [];
      let match;
      while ((match = outfitIdRegex.exec(responseText)) !== null) {
          outfitIds.push(match[1]);
      }
      
      const advice = responseText.replace(outfitIdRegex, '').replace(/\s+/g, ' ').trim();

      return { advice, outfitIds };
    } catch (error) {
        handleApiError(error);
        throw new Error("Unhandled error getting AVA style advice.");
    }
};

export const generateTryOn = async (headshotBase64: string, poseBase64: string): Promise<string> => {
    if (!ai) throw new Error("API key not configured.");
    try {
        const headshotPart = base64ToGenerativePart(headshotBase64);
        const posePart = base64ToGenerativePart(poseBase64);
        
        const prompt = `Take the face from the first image (the headshot) and place it realistically onto the body in the second image (the pose).
        
        **Key Instructions:**
        1.  **Seamless Integration:** The head must blend perfectly with the body, matching skin tone, lighting, and angle.
        2.  **Preserve Pose and Outfit:** Do not change the body, pose, or clothing from the second image.
        3.  **Photorealistic Output:** The final result must look like a real, unedited photograph.
        4.  **Output:** Return only the final image. No text or commentary.`;
        
        const result: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [headshotPart, posePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePartResponse = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePartResponse?.inlineData?.data) {
            return imagePartResponse.inlineData.data;
        }
        throw new Error("Failed to generate the virtual try-on image.");
    } catch(error) {
        handleApiError(error);
        throw new Error("Unhandled error in virtual try-on generation.");
    }
};

export const isApiKeySet = (): boolean => !!API_KEY;