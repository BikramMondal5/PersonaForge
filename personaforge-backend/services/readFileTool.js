import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SAFE_DIR = path.resolve(__dirname, '..', 'uploads');
export const SAFE_FILE_DIR = path.resolve(process.env.PERSONAFORGE_SAFE_FILE_DIR || DEFAULT_SAFE_DIR);
export const MAX_FILE_SIZE_BYTES = Number(process.env.PERSONAFORGE_MAX_FILE_SIZE_BYTES || 1024 * 1024);

const SUPPORTED_TEXT_EXTENSIONS = new Set([
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

const SUPPORTED_ENCODINGS = new Set(['utf8', 'utf-8', 'ascii', 'latin1', 'base64']);

function normalizeEncoding(encoding = 'utf8') {
    const normalized = encoding.toLowerCase();
    return normalized === 'utf-8' ? 'utf8' : normalized;
}

function createResult(overrides) {
    return JSON.stringify({
        ok: false,
        tool: 'read_file',
        file_path: null,
        file_type: null,
        encoding: null,
        size_bytes: null,
        content: null,
        error: null,
        ...overrides
    });
}

export async function ensureSafeFileDirectory() {
    await fs.mkdir(SAFE_FILE_DIR, { recursive: true });
}

export function resolveSafeFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('file_path is required and must be a string.');
    }

    if (filePath.includes('\0')) {
        throw new Error('Invalid file path.');
    }

    const relativePath = path.isAbsolute(filePath)
        ? path.relative(SAFE_FILE_DIR, filePath)
        : filePath;

    const resolvedPath = path.resolve(SAFE_FILE_DIR, relativePath);
    const safeRootWithSeparator = SAFE_FILE_DIR.endsWith(path.sep)
        ? SAFE_FILE_DIR
        : `${SAFE_FILE_DIR}${path.sep}`;

    if (resolvedPath !== SAFE_FILE_DIR && !resolvedPath.startsWith(safeRootWithSeparator)) {
        throw new Error('Unsafe file path. Access is restricted to the configured safe file directory.');
    }

    return resolvedPath;
}

export async function readFileContent({ file_path, file_type, encoding = 'utf8' }) {
    const requestedEncoding = normalizeEncoding(encoding);
    const requestedPath = file_path;

    console.log('[read_file] access attempt', { file_path: requestedPath, file_type, encoding: requestedEncoding });

    try {
        if (!SUPPORTED_ENCODINGS.has(requestedEncoding)) {
            return createResult({
                file_path: requestedPath,
                encoding: requestedEncoding,
                error: {
                    code: 'UNSUPPORTED_ENCODING',
                    message: `Unsupported encoding "${encoding}".`
                }
            });
        }

        const resolvedPath = resolveSafeFilePath(requestedPath);
        const extension = path.extname(resolvedPath).toLowerCase();
        const inferredFileType = file_type || extension.replace('.', '') || 'text';

        if (!SUPPORTED_TEXT_EXTENSIONS.has(extension)) {
            console.log('[read_file] rejected unsupported format', { file_path: requestedPath, extension });
            return createResult({
                file_path: requestedPath,
                file_type: inferredFileType,
                encoding: requestedEncoding,
                error: {
                    code: 'UNSUPPORTED_FILE_FORMAT',
                    message: `Unsupported file format "${extension || 'unknown'}". Supported text formats include txt, json, md, csv, yaml, html, css, js, and ts.`
                }
            });
        }

        let stats;
        try {
            stats = await fs.stat(resolvedPath);
        } catch (error) {
            const code = error.code === 'ENOENT' ? 'FILE_NOT_FOUND' : 'FILE_STAT_FAILED';
            console.log('[read_file] stat failed', { file_path: requestedPath, code });
            return createResult({
                file_path: requestedPath,
                file_type: inferredFileType,
                encoding: requestedEncoding,
                error: {
                    code,
                    message: code === 'FILE_NOT_FOUND' ? 'File not found.' : 'Unable to inspect the file.'
                }
            });
        }

        if (!stats.isFile()) {
            return createResult({
                file_path: requestedPath,
                file_type: inferredFileType,
                encoding: requestedEncoding,
                size_bytes: stats.size,
                error: {
                    code: 'NOT_A_FILE',
                    message: 'The requested path is not a file.'
                }
            });
        }

        if (stats.size > MAX_FILE_SIZE_BYTES) {
            console.log('[read_file] rejected oversized file', { file_path: requestedPath, size_bytes: stats.size });
            return createResult({
                file_path: requestedPath,
                file_type: inferredFileType,
                encoding: requestedEncoding,
                size_bytes: stats.size,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `File is too large to read safely. Maximum size is ${MAX_FILE_SIZE_BYTES} bytes.`
                }
            });
        }

        let content;
        try {
            content = await fs.readFile(resolvedPath, requestedEncoding);
        } catch (error) {
            const code = error.code === 'EACCES' || error.code === 'EPERM'
                ? 'PERMISSION_DENIED'
                : 'READ_FAILED';
            console.log('[read_file] read failed', { file_path: requestedPath, code });
            return createResult({
                file_path: requestedPath,
                file_type: inferredFileType,
                encoding: requestedEncoding,
                size_bytes: stats.size,
                error: {
                    code,
                    message: code === 'PERMISSION_DENIED' ? 'Permission denied while reading the file.' : 'Unable to read the file.'
                }
            });
        }

        if (content.length === 0) {
            console.log('[read_file] empty file', { file_path: requestedPath });
            return createResult({
                ok: true,
                file_path: requestedPath,
                file_type: inferredFileType,
                encoding: requestedEncoding,
                size_bytes: stats.size,
                content: '',
                error: {
                    code: 'EMPTY_FILE',
                    message: 'The file is empty.'
                }
            });
        }

        console.log('[read_file] success', { file_path: requestedPath, size_bytes: stats.size });
        return createResult({
            ok: true,
            file_path: requestedPath,
            file_type: inferredFileType,
            encoding: requestedEncoding,
            size_bytes: stats.size,
            content,
            error: null
        });
    } catch (error) {
        console.log('[read_file] rejected unsafe request', { file_path: requestedPath, message: error.message });
        return createResult({
            file_path: requestedPath,
            encoding: requestedEncoding,
            error: {
                code: 'UNSAFE_OR_INVALID_PATH',
                message: error.message
            }
        });
    }
}

export const readFileTool = tool(readFileContent, {
    name: 'read_file',
    description: 'This tool reads the content of a file given its path and returns the content as text.',
    schema: z.object({
        file_path: z.string().describe('Path to a file inside the configured safe file directory.'),
        file_type: z.string().optional().describe('Optional hint for the file type, such as txt, json, md, or csv.'),
        encoding: z.string().optional().describe('Optional text encoding. Defaults to utf8.')
    })
});

