"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const env_1 = require("../../config/env");
const BUCKET = 'MsgScaleBulk';
const STORAGE_URL = `${env_1.env.SUPABASE_URL}/storage/v1`;
const AUTH_HEADER = `Bearer ${env_1.env.SUPABASE_KEY}`;
class StorageService {
    static async uploadFile(file, path) {
        let buffer = file.buffer;
        let contentType = file.mimetype;
        let finalPath = path;
        // Compress Images to WebP
        if (file.mimetype.startsWith('image/')) {
            try {
                buffer = await (0, sharp_1.default)(file.buffer)
                    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                contentType = 'image/webp';
                finalPath = path.replace(/\.[^/.]+$/, '') + '.webp';
            }
            catch (error) {
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
    static async deleteFile(path) {
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
exports.StorageService = StorageService;
