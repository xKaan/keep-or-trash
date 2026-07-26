<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_LABELS,
  formatKeyLabel,
  isModifierKey,
  isReservedKey,
  normalizeKey,
  type ShortcutAction,
} from '../../lib/settings'

const { settings, setShortcut, resetShortcuts } = useSettings()

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

  const label = formatKeyLabel(normalizeKey(event.key))

  if (isReservedKey(event.key)) {
    notice.value = `« ${label} » est réservée par l'application.`
    noticeIsError.value = true
    return
  }

  const evicted = setShortcut(action, event.key)
  notice.value = evicted
    ? `« ${label} » était assignée à « ${SHORTCUT_LABELS[evicted]} », qui n'a plus de raccourci.`
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
  notice.value = 'Raccourcis réinitialisés.'
  noticeIsError.value = false
}

onUnmounted(stopCapture)
</script>

<template>
  <div class="shortcuts">
    <p class="text-muted shortcuts-hint">
      Une seule touche par action. Le zoom (+ / −) et la navigation (Tab, Échap) ne sont pas
      réassignables.
    </p>

    <ul class="shortcuts-list">
      <li v-for="action in SHORTCUT_ACTIONS" :key="action" class="shortcuts-row">
        <span class="shortcuts-label">{{ SHORTCUT_LABELS[action] }}</span>
        <button
          type="button"
          class="btn btn-secondary shortcuts-key"
          :class="{ 'shortcuts-key-capturing': capturing === action }"
          :aria-label="`${SHORTCUT_LABELS[action]} : ${formatKeyLabel(settings.shortcuts[action])}`"
          @click="capturing === action ? stopCapture() : startCapture(action)"
        >
          <template v-if="capturing === action">Appuyez sur une touche…</template>
          <template v-else>{{ formatKeyLabel(settings.shortcuts[action]) }}</template>
        </button>
      </li>
    </ul>

    <p
      class="shortcuts-notice"
      :class="{ 'shortcuts-notice-error': noticeIsError && !!notice, 'text-muted': !notice }"
      aria-live="polite"
    >
      {{ notice || (capturing ? 'Échap pour annuler.' : '') }}
    </p>

    <div class="shortcuts-actions">
      <button type="button" class="btn btn-secondary" @click="reset">Réinitialiser</button>
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
