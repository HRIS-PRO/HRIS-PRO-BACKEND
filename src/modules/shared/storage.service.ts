import sharp from 'sharp';
import { env } from '../../config/env';

const BUCKET = 'MsgScaleBulk';
const STORAGE_URL = `${env.SUPABASE_URL}/storage/v1`;
const AUTH_HEADER = `Bearer ${env.SUPABASE_KEY}`;

export class StorageService {

    static async uploadFile(file: { buffer: Buffer; mimetype: string }, path: string): Promise<{ url: string; path: string; mimeType: string; size: number }> {
        let buffer = file.buffer;
        let contentType = file.mimetype;
        let finalPath = path;

        // Compress Images to WebP
        if (file.mimetype.startsWith('image/')) {
            try {
                buffer = await sharp(file.buffer)
                    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                contentType = 'image/webp';
                finalPath = path.replace(/\.[^/.]+$/, '') + '.webp';
            } catch (error) {
                console.error('Image compression failed, using original', error);
            }
        }

        // Upload via direct HTTP POST to Supabase Storage REST API
        const uploadUrl = `${STORAGE_URL}/object/${BUCKET}/${finalPath}`;
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': contentType,
                'x-upsert': 'true',
            },
            body: new Uint8Array(buffer),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Storage upload failed (${response.status}): ${text}`);
        }

        const publicUrl = `${STORAGE_URL}/object/public/${BUCKET}/${finalPath}`;

        return {
            url: publicUrl,
            path: finalPath,
            mimeType: contentType,
            size: buffer.length,
        };
    }

    static async deleteFile(path: string): Promise<void> {
        const deleteUrl = `${STORAGE_URL}/object/${BUCKET}`;
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prefixes: [path] }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Storage delete failed (${response.status}): ${text}`);
        }
    }
}
