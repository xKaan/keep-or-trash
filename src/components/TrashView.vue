<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTrashSession } from '../stores/trashSession'
import AppIcon from './AppIcon.vue'
import PhotoThumb from './PhotoThumb.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import ThemeButton from './ThemeButton.vue'

const props = defineProps<{ folder: string }>()
const emit = defineEmits<{ back: []; settings: [] }>()

const { t } = useI18n()
const trash = useTrashSession()

type Pending = { names: string[]; scope: 'one' | 'selection' | 'all' }

const pending = ref<Pending | null>(null)

const sizeText = computed(() => {
  const mo = trash.totalSize / 1_000_000
  return mo >= 1
    ? t('common.sizeMb', { size: mo.toFixed(1).replace('.', ',') })
    : t('common.sizeKb', { size: Math.round(trash.totalSize / 1000) })
})

const confirmTitle = computed(() => {
  if (!pending.value) return ''
  return pending.value.scope === 'one'
    ? t('trash.confirmDeleteOneTitle')
    : t('trash.confirmDeleteManyTitle', pending.value.names.length)
})

const confirmBody = computed(() => {
  if (!pending.value) return ''
  const { names, scope } = pending.value
  if (scope === 'one') {
    return t('trash.confirmDeleteOneBody', { name: names[0] })
  }
  const target =
    scope === 'all' ? t('trash.confirmDeleteAllTarget') : t('trash.selectionTarget', names.length)
  return t('trash.confirmDeleteManyBody', { target })
})

const confirmLabel = computed(() => {
  if (!pending.value) return ''
  return pending.value.scope === 'one'
    ? t('confirm.delete')
    : t('trash.confirmDeleteLabelMany', pending.value.names.length)
})

function askDeleteOne(name: string) {
  pending.value = { names: [name], scope: 'one' }
}

function askDeleteSelected() {
  if (!trash.selected.length) return
  pending.value = { names: [...trash.selected], scope: 'selection' }
}

function askDeleteAll() {
  if (trash.isEmpty) return
  pending.value = { names: trash.photos.map((p) => p.name), scope: 'all' }
}

async function confirm() {
  const target = pending.value
  pending.value = null
  if (!target) return
  if (target.scope === 'one') await trash.deleteOne(target.names[0])
  else if (target.scope === 'all') await trash.deleteAll()
  else await trash.deleteSelected()
}

onMounted(() => trash.load(props.folder))
</script>

<template>
  <main class="trash">
    <header class="trash-header">
      <button class="btn btn-secondary" @click="emit('back')">
        <AppIcon name="chevronLeft" :size="15" />
        {{ t('trash.backToSort') }}
      </button>
      <div class="trash-sep"></div>
      <div class="trash-title">{{ t('trash.title') }}</div>
      <div class="text-muted text-mono trash-path" :title="folder">{{ folder }}</div>
      <div class="trash-header-end">
        <span v-if="!trash.isEmpty" class="tag tag-neutral">
          {{ t('trash.countTag', { count: trash.total, size: sizeText }, trash.total) }}
        </span>
        <button
          class="btn btn-round"
          :title="t('common.settings')"
          :aria-label="t('common.settings')"
          @click="emit('settings')"
        >
          <AppIcon name="settings" />
        </button>
        <ThemeButton />
      </div>
    </header>

    <p v-if="trash.loading" class="trash-state text-muted">{{ t('common.loading') }}</p>
    <p v-else-if="trash.error" class="trash-state trash-error">{{ trash.error }}</p>

    <div v-else-if="trash.isEmpty" class="trash-state trash-empty">
      <div class="trash-empty-badge">
        <AppIcon name="trash" :size="26" :stroke-width="1.6" />
      </div>
      <h3>{{ t('trash.emptyTitle') }}</h3>
      <p class="text-muted">{{ t('trash.emptyHint') }}</p>
    </div>

    <template v-else>
      <div class="trash-toolbar">
        <button
          class="btn btn-secondary"
          @click="trash.allSelected ? trash.clearSelection() : trash.selectAll()"
        >
          {{ trash.allSelected ? t('trash.deselectAll') : t('trash.selectAll') }}
        </button>
        <span class="text-muted trash-count">
          {{ t('trash.selectedCount', { count: trash.selected.length }, trash.selected.length) }}
        </span>
        <div class="trash-toolbar-end">
          <button class="btn btn-danger" :disabled="!trash.selected.length" @click="askDeleteSelected">
            <AppIcon name="trash" :size="15" />
            {{ t('trash.deleteSelection') }}
          </button>
          <button class="btn btn-danger" @click="askDeleteAll">{{ t('trash.emptyTrash') }}</button>
        </div>
      </div>

      <div class="trash-grid">
        <article v-for="photo in trash.photos" :key="photo.name" class="trash-item">
          <PhotoThumb
            :name="photo.name"
            :src="trash.thumbnails[photo.name] || undefined"
            :decision="null"
            :active="trash.selected.includes(photo.name)"
            @select="trash.toggle(photo.name)"
            @visible="trash.loadThumbnail(photo.name)"
          />
          <div class="trash-item-actions">
            <button class="btn btn-secondary trash-item-btn" @click="trash.restore(photo.name)">
              {{ t('trash.restore') }}
            </button>
            <button class="btn btn-danger trash-item-btn" @click="askDeleteOne(photo.name)">
              {{ t('trash.delete') }}
            </button>
          </div>
        </article>
      </div>
    </template>

    <ConfirmDialog
      v-if="pending"
      :title="confirmTitle"
      :body="confirmBody"
      :confirm-label="confirmLabel"
      @confirm="confirm"
      @cancel="pending = null"
    />
  </main>
</template>

<style scoped>
.trash {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.trash-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex: none;
}

.trash-sep {
  width: 1px;
  height: 16px;
  background: var(--color-divider);
}

.trash-title {
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 15px;
  white-space: nowrap;
}

.trash-path {
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-header-end {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.trash-state {
  margin: auto;
  font-size: 14px;
}

.trash-error {
  color: var(--color-danger);
}

.trash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  animation: fadeIn 0.3s ease;
}

.trash-empty-badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--tint-accent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.trash-empty h3 {
  margin: 0;
}

.trash-empty p {
  margin: 0;
  font-size: 13.5px;
  max-width: 34ch;
}

.trash-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex: none;
}

.trash-count {
  font-size: 13px;
}

.trash-toolbar-end {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}

.trash-grid {
  --thumb-intrinsic-height: var(--thumb-grid-intrinsic);
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--thumb-grid-min), 1fr));
  gap: var(--space-4);
  align-content: start;
}

.trash-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.trash-item-actions {
  display: flex;
  gap: var(--space-2);
}

.trash-item-btn {
  flex: 1;
  font-size: 13px;
}
</style>
