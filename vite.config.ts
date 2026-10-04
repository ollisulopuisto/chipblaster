import { defineConfig } from 'vite';
// Relative paths work at a repository subpath and at a custom-domain root.
// Workers are built as modules: the libsidplayfp loader imports its engines dynamically.
export default defineConfig({ base: './', worker: { format: 'es' }, json: { stringify: true } });
