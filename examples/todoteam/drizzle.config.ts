import type { Config } from "drizzle-kit";

export default {
  // POINT TO THE GENERATED JS, NOT THE COFFEE FILE
  schema: "./schema.gen.js", 
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
} satisfies Config;
