import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

const normalizeBase = (base: string): string => {
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

export const rewriteManifest = async () => {
  const base = normalizeBase(process.env.VITE_BASE ?? '/');
  const path = resolve('dist', 'manifest.webmanifest');
  const raw = await fs.readFile(path, 'utf-8');
  const manifest = JSON.parse(raw);
  manifest.start_url = base;
  manifest.scope = base;
  manifest.icons = [
    {
      src: `${base}icons/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: `${base}icons/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ];
  await fs.writeFile(path, JSON.stringify(manifest, null, 2));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  rewriteManifest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
