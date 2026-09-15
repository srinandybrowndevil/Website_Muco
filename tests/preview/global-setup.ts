export default async function waitForWorkspaces() {
  // The public server starts before Next finishes booting all four apps.
  // Do not start browser tests simply because port 8123 is already answering.
  await Promise.all([3101, 3102, 3103, 3104].map(async port => {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/login`, { signal: AbortSignal.timeout(15_000) });
        if (response.ok) return;
      } catch { /* Next is still starting. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Local preview on port ${port} did not become ready.`);
  }));
}
