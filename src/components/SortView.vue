<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhotoSession } from '../stores/photoSession'
import { useSettings } from '../composables/useSettings'
import { SHORTCUT_ACTIONS, normalizeKey, type ShortcutAction } from '../lib/settings'
import AppIcon from './AppIcon.vue'
import PhotoThumb from './PhotoThumb.vue'
import ThemeButton from './ThemeButton.vue'

const props = defineProps<{ folder: string }>()
const emit = defineEmits<{ back: []; trash: []; settings: [] }>()

const { t } = useI18n()
const session = usePhotoSession()
const { settings } = useSettings()

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.25
const ZOOM_WHEEL_STEP = 0.1

const FRAME_MIN = 0.6
const FRAME_MAX = 1.2
const FRAME_WHEEL_STEP = 0.06

const zoom = ref(1)
const frameScale = ref(1)
const rotation = ref(0)

const zoomText = computed(() => `${Math.round(zoom.value * 100)}%`)
const photoStyle = computed(() => ({ transform: `scale(${zoom.value})` }))
const frameStyle = computed(() => ({ transform: `rotate(${rotation.value}deg)` }))
const quarterTurned = computed(() => rotation.value % 180 !== 0)
const stageStyle = computed(() => ({ '--frame-scale': String(frameScale.value) }))

const sizeText = computed(() => {
  const size = session.currentPhoto?.size
  if (size === undefined) return ''
  const mo = size / 1_000_000
  return mo >= 1
    ? t('common.sizeMb', { size: mo.toFixed(1).replace('.', ',') })
    : t('common.sizeKb', { size: Math.max(1, Math.round(size / 1000)) })
})

watch(
  () => session.currentPhoto?.name,
  () => {
    zoom.value = 1
    rotation.value = 0
  },
)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, +value.toFixed(2)))
}

function zoomIn() {
  zoom.value = clamp(zoom.value + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)
}

function zoomOut() {
  zoom.value = clamp(zoom.value - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)
}

const ZOOM_KEYS: Record<string, () => void> = {
  '+': zoomIn,
  '=': zoomIn,
  '-': zoomOut,
}

function onWheel(event: WheelEvent) {
  if (!event.deltaY) return
  const step = event.deltaY < 0 ? 1 : -1
  const insideCard = event.target instanceof Element && event.target.closest('.sort-frame')
  if (insideCard) {
    zoom.value = clamp(zoom.value + step * ZOOM_WHEEL_STEP, ZOOM_MIN, ZOOM_MAX)
  } else {
    frameScale.value = clamp(frameScale.value + step * FRAME_WHEEL_STEP, FRAME_MIN, FRAME_MAX)
  }
}

function rotateLeft() {
  rotation.value = (rotation.value + 270) % 360
}

function rotateRight() {
  rotation.value = (rotation.value + 90) % 360
}

function onKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const key = normalizeKey(event.key)

  const handlers: Record<ShortcutAction, () => void> = {
    prev: () => session.goPrev(),
    next: () => session.goNext(),
    keep: () => session.decide('keep'),
    trash: () => session.decide('trash'),
    undo: () => session.undo(),
    rotate: () => rotateRight(),
  }

  const action = SHORTCUT_ACTIONS.find((candidate) => settings.value.shortcuts[candidate] === key)
  const run = action ? handlers[action] : ZOOM_KEYS[key]
  if (!run) return
  event.preventDefault()
  run()
}

onMounted(() => {
  session.loadFolder(props.folder)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <main class="sort">
    <header class="sort-header">
      <div class="sort-title">{{ t('sort.title') }}</div>
      <div class="sort-sep"></div>
      <div class="text-muted text-mono sort-path" :title="session.folder">{{ session.folder }}</div>
      <div class="sort-header-end">
        <span v-if="session.total" class="tag tag-neutral">{{ session.progress }}</span>
        <button
          class="btn btn-secondary sort-change"
          :title="t('common.settings')"
          :aria-label="t('common.settings')"
          @click="emit('settings')"
        >
          <AppIcon name="settings" :size="15" />
        </button>
        <button class="btn btn-secondary sort-change" @click="emit('trash')">
          <AppIcon name="trash" :size="15" />
          {{ t('sort.trashButton') }}
          <span v-if="session.trashedCount" class="tag tag-accent sort-trash-count">
            {{ session.trashedCount }}
          </span>
        </button>
        <button class="btn btn-secondary sort-change" @click="emit('back')">
          {{ t('sort.changeFolder') }}
        </button>
      </div>
    </header>

    <p v-if="session.loading" class="sort-state text-muted">{{ t('common.loading') }}</p>
    <p v-else-if="session.error" class="sort-state sort-error">{{ session.error }}</p>
    <p v-else-if="!session.total" class="sort-state text-muted">{{ t('sort.empty') }}</p>

    <div v-else class="sort-body">
      <nav class="sort-rail" :aria-label="t('sort.railLabel')">
        <PhotoThumb
          v-for="(photo, i) in session.photos"
          :key="photo.name"
          :name="photo.name"
          :src="session.thumbnails[photo.name] || undefined"
          :decision="session.decisions[photo.name] ?? null"
          :active="i === session.index"
          @select="session.selectPhoto(i)"
          @visible="session.loadThumbnail(photo.name)"
        />
      </nav>

      <div class="sort-main">
        <div class="sort-stage" :style="stageStyle" @wheel.prevent="onWheel">
          <button
            class="btn btn-round sort-nav"
            :disabled="session.index === 0"
            :aria-label="t('sort.previousPhoto')"
            @click="session.goPrev()"
          >
            <AppIcon name="chevronLeft" :size="18" />
          </button>

          <div
            class="sort-frame"
            :class="{ 'sort-frame-turned': quarterTurned }"
            :style="frameStyle"
          >
            <img
              v-if="session.currentSrc"
              :src="session.currentSrc"
              :alt="session.currentPhoto?.name"
              :style="photoStyle"
              class="sort-photo"
            />
            <div v-else class="sort-photo-loading text-muted">{{ t('sort.loadingImage') }}</div>
          </div>

          <button
            class="btn btn-round sort-nav"
            :disabled="session.index >= session.total - 1"
            :aria-label="t('sort.nextPhoto')"
            @click="session.goNext()"
          >
            <AppIcon name="chevronRight" :size="18" />
          </button>

          <div class="sort-meta text-muted">
            <span class="sort-meta-name text-mono">{{ session.currentPhoto?.name }}</span>
            <span>{{ sizeText }}</span>
            <span v-if="session.currentDecision === 'keep'" class="tag tag-accent">{{ t('sort.kept') }}</span>
            <span v-else-if="session.currentDecision === 'trash'" class="tag sort-tag-trashed">
              {{ t('sort.trashed') }}
            </span>
          </div>

          <div class="sort-zoom">
            <button class="btn btn-icon sort-zoom-btn" :aria-label="t('sort.zoomOut')" @click="zoomOut">
              <AppIcon name="zoomOut" :size="15" />
            </button>
            <span class="text-muted sort-zoom-text">{{ zoomText }}</span>
            <button class="btn btn-icon sort-zoom-btn" :aria-label="t('sort.zoomIn')" @click="zoomIn">
              <AppIcon name="zoomIn" :size="15" />
            </button>
          </div>
        </div>

        <footer class="sort-actions">
          <div class="sort-rotate">
            <button class="btn btn-secondary" :title="t('sort.rotateLeft')" @click="rotateLeft">
              <AppIcon name="rotateLeft" />
            </button>
            <button class="btn btn-secondary" :title="t('sort.rotateRight')" @click="rotateRight">
              <AppIcon name="rotateRight" />
            </button>
          </div>

          <div class="sort-sep-v"></div>

          <button
            class="btn btn-primary sort-decide"
            :disabled="!!session.currentDecision"
            @click="session.decide('keep')"
          >
            <AppIcon name="check" :size="17" :stroke-width="2" />
            {{ t('sort.keep') }}
          </button>
          <button
            class="btn btn-danger sort-decide"
            :disabled="!!session.currentDecision"
            @click="session.decide('trash')"
          >
            <AppIcon name="trash" :size="17" />
            {{ t('sort.sendToTrash') }}
          </button>
          <button class="btn btn-secondary" :disabled="!session.canUndo" @click="session.undo()">
            {{ t('sort.undo') }}
          </button>

          <ThemeButton class="sort-theme" />
        </footer>
      </div>
    </div>
  </main>
</template>

<style scoped>
.sort {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.sort-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex: none;
}

.sort-title {
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 15px;
  white-space: nowrap;
}

.sort-sep {
  width: 1px;
  height: 16px;
  background: var(--color-divider);
}

.sort-path {
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-header-end {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.sort-change {
  font-size: 13px;
}

.sort-trash-count {
  padding: 1px 6px;
  font-size: 10px;
}

.sort-state {
  margin: auto;
  font-size: 14px;
}

.sort-error {
  color: var(--color-danger);
}

.sort-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sort-rail {
  --thumb-intrinsic-height: var(--thumb-rail-intrinsic);
  width: var(--thumb-rail-width);
  flex: none;
  overflow-y: auto;
  padding: var(--space-4) var(--space-3);
  display: grid;
  grid-template-columns: repeat(var(--thumb-rail-columns), minmax(0, 1fr));
  gap: var(--space-2);
  align-content: start;
  border-right: 1px solid var(--color-divider);
}

.sort-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sort-stage {
  --meta-strip: 46px;
  --nav-lane: 100px;
  --stage-w: calc(70vw - var(--nav-lane));
  --stage-h: calc(60vh - var(--meta-strip));
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  position: relative;
  padding: var(--space-6);
  padding-bottom: var(--meta-strip);
  min-height: 0;
}

.sort-nav {
  flex: none;
  z-index: 1;
}

.sort-frame {
  --frame-w: calc(var(--stage-w) * var(--frame-scale, 1));
  --frame-h: calc(var(--stage-h) * var(--frame-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: var(--frame-w);
  min-width: 0;
  min-height: 0;
  transition: transform 0.2s ease;
}

.sort-frame-turned {
  --frame-w: calc(min(var(--stage-w), var(--stage-h)) * var(--frame-scale, 1));
  --frame-h: var(--frame-w);
}

.sort-photo {
  max-width: var(--frame-w);
  max-height: var(--frame-h);
  object-fit: contain;
  transition: transform 0.15s ease;
}

.sort-photo-loading {
  display: grid;
  place-items: center;
  width: calc(40vw * var(--frame-scale, 1));
  height: calc(40vh * var(--frame-scale, 1));
  font-size: 13px;
  background: var(--color-surface);
}

.sort-meta {
  position: absolute;
  bottom: var(--space-3);
  left: var(--space-6);
  right: var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 13px;
  flex-wrap: wrap;
  justify-content: center;
}

.sort-meta-name {
  color: var(--color-text);
}

.sort-tag-trashed {
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.sort-zoom {
  position: absolute;
  top: 16px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  padding: 4px;
}

.sort-zoom-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
}

.sort-zoom-btn:hover {
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.sort-zoom-text {
  font-size: 11.5px;
  width: 38px;
  text-align: center;
}

.sort-actions {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-top: 1px solid var(--color-divider);
  position: relative;
}

.sort-rotate {
  display: flex;
  gap: var(--space-2);
}

.sort-sep-v {
  width: 1px;
  height: 28px;
  background: var(--color-divider);
}

.sort-decide {
  height: 44px;
  padding-inline: var(--space-8);
  font-size: 15px;
}

.sort-theme {
  position: absolute;
  right: var(--space-4);
}
</style>
