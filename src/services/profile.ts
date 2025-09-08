import { supabase } from "./supabaseClient";
import { User } from '../types';
import { type User as AuthUser } from "@supabase/supabase-js";

function extFromName(name?: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "png";
}

async function getUserOrThrow(): Promise<AuthUser> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`auth.getUser error: ${error.message}`);
  const user = data?.user;
  if (!user?.id) throw new Error("No authenticated user.");
  return user;
}

export async function uploadProfileAvatar(file: File): Promise<{ publicUrl: string }> {
  if (!file) throw new Error("No file provided.");
  if (!file.type?.startsWith("image/")) {
    throw new Error(`Invalid content type: ${file.type || "unknown"}`);
  }

  const user = await getUserOrThrow();
  const objectKey = `${user.id}/avatar-${Date.now()}.${extFromName(file.name)}`;

  console.log("[AVATAR] Uploading:", { userId: user.id, path: objectKey, type: file.type });

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(objectKey, file, {
      cacheControl: "3600",
      upsert: false, // Per request, fails if object exists. Path includes timestamp to prevent this.
      contentType: file.type,
    });

  if (uploadErr) {
    console.error("[AVATAR][UPLOAD_ERR]", uploadErr);
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }
  
  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, avatar_path: objectKey, updated_at: new Date().toISOString() });

  if (upsertErr) {
    console.error("[AVATAR][UPSERT_ERR]", upsertErr);
    await supabase.storage.from("avatars").remove([objectKey]); // Clean up orphaned storage object
    throw new Error(`Profile update after upload failed: ${upsertErr.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(objectKey);
  
  if (!publicUrl) {
      throw new Error("Could not get public URL for avatar after upload.");
  }
  
  console.log("[AVATAR][SUCCESS]", { publicUrl });
  return { publicUrl };
}

export async function loadProfile(): Promise<User | null> {
  const user = await getUserOrThrow();

  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_path, style_signature")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[PROFILE][SELECT_ERR]", error);
    throw new Error(`Profile select failed: ${error.message}`);
  }
  
  if (!data) {
      console.warn("[PROFILE] No profile found for user. This should not happen after signup.", { userId: user.id });
      return null;
  }

  let avatarUrl: string | null = null;
  if (data.avatar_path) {
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(data.avatar_path);
    avatarUrl = pub?.publicUrl || null;
  }
  
  const profile: User = {
    id: user.id,
    username: data.username,
    displayName: data.display_name,
    profilePicture: avatarUrl,
    styleSignature: data.style_signature,
  };
  
  return profile;
}

export async function updateProfileData(updates: {
  displayName?: string;
  styleSignature?: string;
}) {
  const user = await getUserOrThrow();
  const payload: { id: string; display_name?: string; style_signature?: string, updated_at: string } = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (updates.displayName !== undefined) payload.display_name = updates.displayName;
  if (updates.styleSignature !== undefined) payload.style_signature = updates.styleSignature;
  
  if (Object.keys(payload).length <= 2) return; // Nothing to update

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) {
    console.error("[PROFILE][UPDATE_ERR]", error);
    throw new Error(`Profile update failed: ${error.message}`);
  }
}
