<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    title: string
    body: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  { confirmLabel: undefined, cancelLabel: undefined },
)

const resolvedConfirmLabel = computed(() => props.confirmLabel ?? t('confirm.delete'))
const resolvedCancelLabel = computed(() => props.cancelLabel ?? t('confirm.cancel'))

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
          {{ resolvedCancelLabel }}
        </button>
        <button class="btn btn-danger" @click="emit('confirm')">{{ resolvedConfirmLabel }}</button>
      </div>
    </div>
  </div>
</template>
