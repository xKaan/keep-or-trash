<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import GeneralSettings from './settings/GeneralSettings.vue'
import ShortcutsSettings from './settings/ShortcutsSettings.vue'

const emit = defineEmits<{ back: [] }>()

const { t } = useI18n()

type Tab = 'general' | 'shortcuts'

const TABS = computed<{ id: Tab; label: string }[]>(() => [
  { id: 'general', label: t('settings.tabs.general') },
  { id: 'shortcuts', label: t('settings.tabs.shortcuts') },
])

const tab = ref<Tab>('general')
</script>

<template>
  <main class="settings">
    <header class="settings-header">
      <button type="button" class="btn btn-secondary" @click="emit('back')">
        <AppIcon name="chevronLeft" :size="15" />
        {{ t('settings.back') }}
      </button>
      <div class="settings-sep"></div>
      <div class="settings-title">{{ t('settings.title') }}</div>
    </header>

    <div class="settings-body">
      <nav class="settings-tabs" :aria-label="t('settings.tabsLabel')">
        <button
          v-for="entry in TABS"
          :key="entry.id"
          type="button"
          class="settings-tab"
          :class="{ 'settings-tab-active': tab === entry.id }"
          :aria-current="tab === entry.id"
          @click="tab = entry.id"
        >
          {{ entry.label }}
        </button>
      </nav>

      <section class="settings-panel">
        <GeneralSettings v-if="tab === 'general'" />
        <ShortcutsSettings v-else />
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex: none;
}

.settings-sep {
  width: 1px;
  height: 16px;
  background: var(--color-divider);
}

.settings-title {
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 15px;
}

.settings-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.settings-tabs {
  width: 200px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4) var(--space-3);
  border-right: 1px solid var(--color-divider);
}

.settings-tab {
  text-align: left;
  cursor: pointer;
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 14px;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}

.settings-tab:hover {
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
  color: var(--color-text);
}

.settings-tab-active {
  background: var(--tint-accent);
  color: var(--tint-accent-text);
}

.settings-tab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.settings-panel {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  min-width: 0;
}
</style>
