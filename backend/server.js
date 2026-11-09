import app from "./src/app.js";
import config from "./src/config/env.js";
import { connectDatabase } from "./src/config/db.js";
import { ensureAdmin } from "./src/scripts/seedAdmin.js";

async function start() {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB");
    const result = await ensureAdmin({ silent: true });
    if (result.created) {
      console.log(`Created administrator account: ${config.admin.email}`);
    }
  } catch (error) {
    console.error("Failed to start server:");
    console.error(error.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Tuition Manager API listening on http://localhost:${config.port}`);
    console.log(`Environment: ${config.env}`);
  });
}

start();
