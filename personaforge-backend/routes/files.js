import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { ensureSafeFileDirectory, MAX_FILE_SIZE_BYTES, SAFE_FILE_DIR } from '../services/readFileTool.js';

const router = Router();

const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
    '.txt',
    '.json',
    '.md',
    '.markdown',
    '.csv',
    '.tsv',
    '.log',
    '.yaml',
    '.yml',
    '.xml',
    '.html',
    '.css',
    '.js',
    '.ts'
]);

function safeFileName(fileName) {
    const parsed = path.parse(fileName || 'upload.txt');
    const base = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'upload';
    const ext = parsed.ext.toLowerCase() || '.txt';
    return `${base}${ext}`;
}

router.post('/upload', async (req, res) => {
    try {
        const { fileName, content, contentBase64 } = req.body || {};

        if (!fileName || typeof fileName !== 'string') {
            return res.status(400).json({ error: 'fileName is required.' });
        }

        const storedFileName = safeFileName(fileName);
        const extension = path.extname(storedFileName).toLowerCase();

        if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
            return res.status(400).json({
                error: `Unsupported file format "${extension || 'unknown'}". Upload a text-based file.`
            });
        }

        if (typeof content !== 'string' && typeof contentBase64 !== 'string') {
            return res.status(400).json({ error: 'content or contentBase64 is required.' });
        }

        const fileBuffer = typeof contentBase64 === 'string'
            ? Buffer.from(contentBase64, 'base64')
            : Buffer.from(content, 'utf8');

        if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
            return res.status(413).json({
                error: `File is too large. Maximum size is ${MAX_FILE_SIZE_BYTES} bytes.`
            });
        }

        await ensureSafeFileDirectory();

        const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${storedFileName}`;
        const absolutePath = path.join(SAFE_FILE_DIR, uniqueName);
        await fs.writeFile(absolutePath, fileBuffer);

        console.log('[files] upload success', {
            fileName,
            storedFileName: uniqueName,
            size_bytes: fileBuffer.length
        });

        return res.status(201).json({
            ok: true,
            file_path: uniqueName,
            size_bytes: fileBuffer.length
        });
    } catch (error) {
        console.error('[files] upload failed', error);
        return res.status(500).json({ error: 'Failed to upload file.' });
    }
});

export default router;

