<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { VIEW_MODES, type ViewMode } from '../lib/settings'
import AppIcon, { type IconName } from './AppIcon.vue'

defineProps<{ current: ViewMode }>()
const emit = defineEmits<{ select: [ViewMode] }>()

const { t } = useI18n()

const ICONS: Record<ViewMode, IconName> = {
  cards: 'viewCards',
  list: 'viewList',
  dense: 'viewDense',
}
</script>

<template>
  <div class="view-toggle" role="group" :aria-label="t('display.modeLabel')">
    <button
      v-for="mode in VIEW_MODES"
      :key="mode"
      type="button"
      class="btn btn-icon view-toggle-btn"
      :class="{ 'view-toggle-btn-active': current === mode }"
      :title="t(`display.modes.${mode}`)"
      :aria-label="t(`display.modes.${mode}`)"
      :aria-pressed="current === mode"
      @click="emit('select', mode)"
    >
      <AppIcon :name="ICONS[mode]" :size="15" />
    </button>
  </div>
</template>

<style scoped>
.view-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.view-toggle-btn {
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
  border-radius: var(--radius-sm);
}

.view-toggle-btn:hover {
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.view-toggle-btn-active {
  background: var(--tint-accent);
  color: var(--tint-accent-text);
}
</style>
