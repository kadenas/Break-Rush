import { generateIcons } from './make-icons';
import { rewriteManifest } from './rewrite-manifest';

const run = async () => {
  await generateIcons();
  await rewriteManifest();
  console.log('Post-build complete: icons generated and manifest updated.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
