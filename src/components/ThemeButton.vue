<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../composables/useTheme'
import { THEME_ICONS } from '../lib/settings'
import AppIcon from './AppIcon.vue'

const { t } = useI18n()
const { theme, cycleTheme } = useTheme()

const icon = computed(() => THEME_ICONS[theme.value])
const label = computed(() =>
  t('settings.general.themeAriaLabel', { theme: t(`settings.general.themeLabels.${theme.value}`) }),
)
</script>

<template>
  <button class="btn btn-round" :title="label" :aria-label="label" @click="cycleTheme">
    <AppIcon :name="icon" />
  </button>
</template>
