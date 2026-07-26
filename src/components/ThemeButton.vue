<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'
import { THEME_LABELS, THEME_ICONS } from '../lib/settings'
import AppIcon from './AppIcon.vue'

const { theme, cycleTheme } = useTheme()

const icon = computed(() => THEME_ICONS[theme.value])
const label = computed(() => `Thème : ${THEME_LABELS[theme.value]}`)
</script>

<template>
  <button class="btn btn-round" :title="label" :aria-label="label" @click="cycleTheme">
    <AppIcon :name="icon" />
  </button>
</template>
