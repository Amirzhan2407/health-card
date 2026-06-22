import { supabase } from "../config/supabaseClient.js";

/**
 * Service to interact with Supabase Private Storage Buckets
 */
export async function uploadFile(bucketName, filePath, fileBuffer, mimeType) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Ошибка загрузки файла в хранилище: ${error.message}`);
  }

  return data;
}

export async function getSignedUrl(bucketName, filePath, expiresInSeconds = 900) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Ошибка генерации временной ссылки: ${error ? error.message : "данные отсутствуют"}`);
  }

  return data.signedUrl;
}

export async function deleteFile(bucketName, filePath) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    throw new Error(`Ошибка удаления файла из хранилища: ${error.message}`);
  }

  return data;
}
