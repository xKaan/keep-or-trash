<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme'
import { useSettings } from '../../composables/useSettings'
import { THEMES, LOCALES, THEME_ICONS, type Locale } from '../../lib/settings'
import AppIcon from '../AppIcon.vue'

const { t } = useI18n()
const { theme, setTheme } = useTheme()
const { settings, setLocale } = useSettings()
</script>

<template>
  <div class="general">
    <section class="general-section">
      <h3 class="general-title">{{ t('settings.general.themeTitle') }}</h3>
      <p class="text-muted general-hint">{{ t('settings.general.themeHint') }}</p>
      <div class="segmented" role="group" :aria-label="t('settings.general.themeTitle')">
        <button
          v-for="value in THEMES"
          :key="value"
          type="button"
          class="segmented-item"
          :class="{ 'segmented-item-active': theme === value }"
          :aria-pressed="theme === value"
          @click="setTheme(value)"
        >
          <AppIcon :name="THEME_ICONS[value]" :size="15" />
          {{ t(`settings.general.themeLabels.${value}`) }}
        </button>
      </div>
    </section>

    <div class="hr"></div>

    <section class="general-section">
      <h3 class="general-title">{{ t('settings.general.languageTitle') }}</h3>
      <p class="text-muted general-hint">{{ t('settings.general.languageHint') }}</p>
      <div class="segmented" role="group" :aria-label="t('settings.general.languageTitle')">
        <button
          v-for="value in LOCALES"
          :key="value"
          type="button"
          class="segmented-item"
          :class="{ 'segmented-item-active': settings.locale === value }"
          :aria-pressed="settings.locale === value"
          @click="setLocale(value as Locale)"
        >
          {{ t(`settings.general.languageLabels.${value}`) }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.general {
  display: flex;
  flex-direction: column;
}

.general-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.general-title {
  margin: 0;
  font-size: 15px;
}

.general-hint {
  margin: 0;
  font-size: 13px;
  max-width: 52ch;
}

.segmented {
  display: inline-flex;
  align-self: flex-start;
  gap: 2px;
  margin-top: var(--space-2);
  padding: 3px;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.segmented-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 13px;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
}

.segmented-item:hover {
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
  color: var(--color-text);
}

.segmented-item-active {
  background: var(--tint-accent);
  color: var(--tint-accent-text);
}

.segmented-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
</style>
