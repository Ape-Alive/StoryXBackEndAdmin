<template>
  <router-view v-if="$route.name === 'ProviderApiKeys'" />
  <Provider v-else />
</template>

<script setup>
import { useRoute } from 'vue-router'
import Provider from './Provider.vue'

const route = useRoute()
</script>
