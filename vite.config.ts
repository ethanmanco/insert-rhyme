import { defineConfig } from "vitest/config";

// GitHub Pages serves the site from /insert-rhyme/, local dev serves from /.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/insert-rhyme/" : "/",
  test: {
    include: ["tests/**/*.test.ts"],
  },
}));
