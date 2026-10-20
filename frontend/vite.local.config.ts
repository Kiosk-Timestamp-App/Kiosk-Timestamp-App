import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Build lokal (pa Frappe-Bench): pa proxy, rezultati në ./dist
export default defineConfig({
	plugins: [react(), tailwindcss(),],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		target: 'es2015',
	},
});
