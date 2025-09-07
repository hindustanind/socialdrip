// FIX: Removed circular self-import of 'OutfitCategory'.

export enum OutfitCategory {
  FAVORITES = 'FAVORITES',
  ALL = 'ALL',
  PARTY = 'PARTY',
  CASUAL = 'CASUAL',
  FORMAL = 'FORMAL',
  ETHNIC = 'ETHNIC',
  UNKNOWN = 'UNKNOWN',
}

export interface Outfit {
  id: string;
  name?: string;
  tags?: string[];
  images: string[]; // Array of base64 image strings (compressed for display)
  originalImages?: string[]; // Array of original high-quality base64 image strings
  category: OutfitCategory;
  createdAt: number;
  description?: string;
  isMock?: boolean;
  isFavorite?: boolean;
  isUploading?: boolean;
  progress?: number;
  uploadError?: string;
}

export interface Avatar {
  images: string[]; // Array of base64 image strings for 360 view
  videoUrl?: string; // URL for the looping avatar video
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

// FIX: Add missing MusicTrack type for the MusicPlayer component.
export interface MusicTrack {
  name: string;
  url: string;
}

// FIX: Add missing PresetOutfit interface.
export interface PresetOutfit {
  id: string;
  name: string;
  category: OutfitCategory;
  image: string;
}

export interface PresetPose {
  id: string;
  name: string;
  image: string;
}

export enum AvaTone {
  CASUAL = 'Casual',
  PROFESSIONAL = 'Professional',
  BESTIE = 'Bestie',
}
// FIX: Add missing Task-related types to resolve import errors.
export enum TaskType {
  OUTFIT_GENERATION = 'OUTFIT_GENERATION',
  AVATAR_CREATION = 'AVATAR_CREATION',
  GENERATE_360 = 'GENERATE_360',
}

export interface OutfitGenerationPayload {
  imageBase64: string;
  imageType: string;
  userName: string | null;
}

export interface AvatarCreationPayload {
  faceImage: string;
  outfitImage: string;
}

export interface Task {
  id: string;
  type: TaskType;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  statusText: string;
  payload: any;
  createdAt: number;
  result?: any;
  error?: string;
}

// FIX: Add OutfitPost to resolve an import error in `OutfitGrid.tsx`. This type was likely removed with other social features but is still referenced.
export interface OutfitPost {
  id: string;
  imageUrl: string;
}

export interface User {
    id: string;
    // FIX: Add missing 'username' property to resolve usage in ProfileHeader.
    username: string;
    displayName: string | null;
    profilePicture: string | null; // URL or base64
    styleSignature: string | null;
}
// FIX: Add missing UploadTask interface to resolve an import error in `BulkUploadModal.tsx`.
export interface UploadTask {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  stage: string;
  error?: string;
}