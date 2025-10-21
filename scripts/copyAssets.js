import { mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.resolve(projectRoot, '../breakrush_assets/audio');
const destinationDir = path.resolve(projectRoot, 'public/audio');

const AUDIO_EXTENSIONS = new Set(['.mp3']);

async function exists(dir) {
  try {
    const stats = await stat(dir);
    return stats.isDirectory();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function copyAssets() {
  const hasSource = await exists(sourceDir);
  if (!hasSource) {
    console.warn('[AUDIO] Source directory not found:', sourceDir);
    return;
  }

  await mkdir(destinationDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const copiedFiles = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) {
      continue;
    }

    const srcPath = path.join(sourceDir, entry.name);
    const destPath = path.join(destinationDir, entry.name);

    await copyFile(srcPath, destPath);
    copiedFiles.push(entry.name);
    console.log(`[AUDIO] Copied ${entry.name}`);
  }

  if (copiedFiles.length === 0) {
    console.warn('[AUDIO] No audio files found to copy in:', sourceDir);
  }
}

copyAssets().catch((error) => {
  console.error('[AUDIO] Failed to copy assets:', error);
});
