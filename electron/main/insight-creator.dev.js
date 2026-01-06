import fs from 'node:fs';

(async () => {
    const stamp = new Date().toISOString();
    const out = `/tmp/recordr.nightly.dev.last_run.json`;
    fs.writeFileSync(out, JSON.stringify({ ok: true, ranAt: stamp}, null, 2));
    process.exit(0);
  })().catch((err) => {
    console.error("error: ", err)
    try {
      fs.writeFileSync(
        `/tmp/recordr.nightly.dev.error.json`,
        JSON.stringify({ ok: false, error: String(err?.stack || err) }, null, 2)
      );
    } catch {}
    process.exit(1);
  });
  
