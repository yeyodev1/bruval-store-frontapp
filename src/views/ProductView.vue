<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import StorefrontPage from '@/components/store/StorefrontPage.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
</script>

<template>
  <StorefrontPage :slug="slug" />
</template>
