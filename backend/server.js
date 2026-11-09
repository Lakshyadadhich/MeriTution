import app from "./src/app.js";
import config from "./src/config/env.js";
import { ensureReady } from "./src/config/ready.js";

async function start() {
  try {
    const result = await ensureReady();
    console.log("Connected to MongoDB");
    if (result.created) {
      console.log(`Created administrator account: ${config.admin.email}`);
    }
  } catch (error) {
    console.error("Failed to start server:");
    console.error(error.message);
    if (!process.env.VERCEL) process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Tuition Manager API listening on http://localhost:${config.port}`);
    console.log(`Environment: ${config.env}`);
  });
}

start();

export default app;
