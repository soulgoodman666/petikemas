import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // WAJIB UNTUK DEV MODE
      "Content-Security-Policy":
        "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src *;"
    }
  }
});
