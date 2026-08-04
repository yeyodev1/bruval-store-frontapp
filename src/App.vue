<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <RouterView />
  </div>
</template>

<style lang="scss">
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Preserve existing accessible links while rendering the official wordmark everywhere. */
.brand {
  display: inline-block;
  width: 142px;
  height: 29px;
  background: url('/logo-bruval.png') center / contain no-repeat;
  font-size: 0 !important;
  letter-spacing: 0 !important;
  vertical-align: middle;
}

.brand span {
  display: none;
}

.brand img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.editor-page header::before {
  width: 142px;
  height: 29px;
  display: block;
  background: url('/logo-bruval.png') center / contain no-repeat;
  content: '';
}
</style>
