import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['egov.mycses.ca'],
  },
  preview: {
    allowedHosts: ['egov.mycses.ca'],
  }
})