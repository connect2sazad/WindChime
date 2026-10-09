import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite setup for the React frontend and its development/production builds.
export default defineConfig({
    plugins: [react()],
});
