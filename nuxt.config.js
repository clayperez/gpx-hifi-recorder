export default defineNuxtConfig({
  compatibilityDate: "2025-06-15",
  devtools: { enabled: true },
  ssr: false,
  nitro: {
    preset: "static",
  },
  app: {
    baseURL: "./",
    buildAssetsDir: "/assets/",
  },
  vite: {
    base: "./",
  },
});
