<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
  // Global app configuration
  useHead({
    title: "GPS Tracker - Columbus P-7 Pro",
    meta: [
      { name: "description", content: "Professional GPS tracking application for Columbus P-7 Pro GNSS Receiver" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
  });

  // Set up global error handling
  onErrorCaptured((error) => {
    console.error("Global error caught:", error);
    return false;
  });
</script>
