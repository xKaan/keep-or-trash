<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

withDefaults(
  defineProps<{
    title: string
    body: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  { confirmLabel: 'Supprimer', cancelLabel: 'Annuler' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const cancelButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  emit('cancel')
}

onMounted(() => {
  cancelButton.value?.focus()
  window.addEventListener('keydown', onKeydown, true)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('cancel')">
    <div class="dialog elev-lg" role="alertdialog" aria-modal="true" :aria-label="title">
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-body">{{ body }}</div>
      <div class="dialog-actions">
        <button ref="cancelButton" class="btn btn-secondary" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button class="btn btn-danger" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>
