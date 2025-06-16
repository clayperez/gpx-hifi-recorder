export default defineNuxtConfig({
  modules: ["@unocss/nuxt", "@pinia/nuxt", "@vueuse/nuxt", "@nuxtjs/color-mode"],

  colorMode: {
    classSuffix: "",
  },

  css: ["@unocss/reset/tailwind.css"],

  unocss: {
    // UnoCSS options
    uno: true,
    icons: true,
    attributify: true,
    preflight: true,
    shortcuts: [],
    rules: [],
  },
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
