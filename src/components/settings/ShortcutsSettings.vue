<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings } from '../../composables/useSettings'
import {
  SHORTCUT_ACTIONS,
  formatKeyLabel,
  isModifierKey,
  isReservedKey,
  normalizeKey,
  type ShortcutAction,
} from '../../lib/settings'

const { t, tm } = useI18n()
const { settings, setShortcut, resetShortcuts } = useSettings()

const actionLabels = computed(
  () => tm('settings.shortcuts.actionLabels') as unknown as Record<ShortcutAction, string>,
)
const keyLabels = computed(() => tm('settings.shortcuts.keyLabels') as unknown as Record<string, string>)

function keyLabelFor(key: string | null): string {
  return formatKeyLabel(key, keyLabels.value, t('settings.shortcuts.unassigned'))
}

const capturing = ref<ShortcutAction | null>(null)
const notice = ref('')
const noticeIsError = ref(false)

function onCapture(event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.repeat) return

  const action = capturing.value
  if (!action) return
  if (isModifierKey(event.key)) return

  if (event.key === 'Escape') {
    notice.value = ''
    noticeIsError.value = false
    stopCapture()
    return
  }

  const label = keyLabelFor(normalizeKey(event.key))

  if (isReservedKey(event.key)) {
    notice.value = t('settings.shortcuts.reservedKeyNotice', { key: label })
    noticeIsError.value = true
    return
  }

  const evicted = setShortcut(action, event.key)
  notice.value = evicted
    ? t('settings.shortcuts.evictedNotice', { key: label, action: actionLabels.value[evicted] })
    : ''
  noticeIsError.value = false
  stopCapture()
}

function startCapture(action: ShortcutAction) {
  if (capturing.value) stopCapture()
  capturing.value = action
  notice.value = ''
  noticeIsError.value = false
  window.addEventListener('keydown', onCapture, { capture: true })
}

function stopCapture() {
  capturing.value = null
  window.removeEventListener('keydown', onCapture, { capture: true })
}

function reset() {
  stopCapture()
  resetShortcuts()
  notice.value = t('settings.shortcuts.resetNotice')
  noticeIsError.value = false
}

onUnmounted(stopCapture)
</script>

<template>
  <div class="shortcuts">
    <p class="text-muted shortcuts-hint">{{ t('settings.shortcuts.hint') }}</p>

    <ul class="shortcuts-list">
      <li v-for="action in SHORTCUT_ACTIONS" :key="action" class="shortcuts-row">
        <span class="shortcuts-label">{{ actionLabels[action] }}</span>
        <button
          type="button"
          class="btn btn-secondary shortcuts-key"
          :class="{ 'shortcuts-key-capturing': capturing === action }"
          :aria-label="
            t('settings.shortcuts.keyAriaLabel', {
              action: actionLabels[action],
              key: keyLabelFor(settings.shortcuts[action]),
            })
          "
          @click="capturing === action ? stopCapture() : startCapture(action)"
        >
          <template v-if="capturing === action">{{ t('settings.shortcuts.pressKey') }}</template>
          <template v-else>{{ keyLabelFor(settings.shortcuts[action]) }}</template>
        </button>
      </li>
    </ul>

    <p
      class="shortcuts-notice"
      :class="{ 'shortcuts-notice-error': noticeIsError && !!notice, 'text-muted': !notice }"
      aria-live="polite"
    >
      {{ notice || (capturing ? t('settings.shortcuts.escToCancel') : '') }}
    </p>

    <div class="shortcuts-actions">
      <button type="button" class="btn btn-secondary" @click="reset">
        {{ t('settings.shortcuts.reset') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.shortcuts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.shortcuts-hint {
  margin: 0;
  font-size: 13px;
  max-width: 56ch;
}

.shortcuts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 460px;
}

.shortcuts-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.shortcuts-label {
  flex: 1;
  font-size: 14px;
}

.shortcuts-key {
  flex: none;
  min-width: 160px;
  font-family: var(--font-mono);
  font-size: 13px;
}

.shortcuts-key-capturing {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.shortcuts-notice {
  margin: 0;
  font-size: 13px;
  min-height: 18px;
}

.shortcuts-notice-error {
  color: var(--color-danger);
}

.shortcuts-actions {
  display: flex;
  margin-top: var(--space-2);
}
</style>
