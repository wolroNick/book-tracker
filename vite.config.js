import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Adres GitHub Pages: https://<użytkownik>.github.io/book-tracker/
export default defineConfig({
  plugins: [react()],
  base: '/book-tracker/',
});
