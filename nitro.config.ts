import { defineConfig } from "nitro";
import { fileURLToPath } from "node:url";

const procurementDispatchTask = fileURLToPath(
  new URL("./tasks/procurement/dispatch.ts", import.meta.url),
);

export default defineConfig({
  experimental: {
    tasks: true,
  },
  tasks: {
    "procurement:dispatch": {
      handler: procurementDispatchTask,
      description:
        "Close expired proposals, warn approaching deadlines and dispatch due collateral requests.",
    },
  },
  scheduledTasks: {
    "*/15 * * * *": "procurement:dispatch",
  },
});
