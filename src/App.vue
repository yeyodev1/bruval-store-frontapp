<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </div>
</template>

<style lang="scss">
/* Solo opacidad: un transform en la página rompería los elementos fijos (carrito, barra de compra). */
.page-enter-active {
  transition: opacity 0.28s ease;
}
.page-leave-active {
  transition: opacity 0.16s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 0.7s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  transition-delay: var(--reveal-delay, 0ms);
}
.reveal.is-visible {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}

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
