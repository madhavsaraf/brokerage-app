import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/brokerage-app/", // use '/<repo-name>/' if hosting on github.com/<user>/<repo>
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        entry: "entry-index.html",
      },
    },
  },
});
