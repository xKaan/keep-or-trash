<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePhotoSession } from '../stores/photoSession'
import { useTheme } from '../composables/useTheme'
import AppIcon from './AppIcon.vue'
import PhotoThumb from './PhotoThumb.vue'

const props = defineProps<{ folder: string }>()
const emit = defineEmits<{ back: []; trash: [] }>()

const session = usePhotoSession()
const { theme, toggleTheme } = useTheme()

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.25

const zoom = ref(1)
const rotation = ref(0)

const zoomText = computed(() => `${Math.round(zoom.value * 100)}%`)
const photoStyle = computed(() => ({
  transform: `scale(${zoom.value}) rotate(${rotation.value}deg)`,
}))

const sizeText = computed(() => {
  const size = session.currentPhoto?.size
  if (size === undefined) return ''
  const mo = size / 1_000_000
  return mo >= 1
    ? `${mo.toFixed(1).replace('.', ',')} Mo`
    : `${Math.max(1, Math.round(size / 1000))} ko`
})

watch(
  () => session.currentPhoto?.name,
  () => {
    zoom.value = 1
    rotation.value = 0
  },
)

function zoomIn() {
  zoom.value = Math.min(ZOOM_MAX, +(zoom.value + ZOOM_STEP).toFixed(2))
}

function zoomOut() {
  zoom.value = Math.max(ZOOM_MIN, +(zoom.value - ZOOM_STEP).toFixed(2))
}

function rotateLeft() {
  rotation.value = (rotation.value + 270) % 360
}

function rotateRight() {
  rotation.value = (rotation.value + 90) % 360
}

function onKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) return
  const actions: Record<string, () => void> = {
    ArrowLeft: session.goPrev,
    ArrowRight: session.goNext,
    k: () => session.decide('keep'),
    K: () => session.decide('keep'),
    d: () => session.decide('trash'),
    D: () => session.decide('trash'),
    Delete: () => session.decide('trash'),
    Backspace: () => session.undo(),
    '+': zoomIn,
    '=': zoomIn,
    '-': zoomOut,
  }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  action()
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
      <div class="sort-title">Tri des photos</div>
      <div class="sort-sep"></div>
      <div class="text-muted text-mono sort-path" :title="session.folder">{{ session.folder }}</div>
      <div class="sort-header-end">
        <span v-if="session.total" class="tag tag-neutral">{{ session.progress }}</span>
        <button class="btn btn-secondary sort-change" @click="emit('trash')">
          <AppIcon name="trash" :size="15" />
          Corbeille
          <span v-if="session.trashedCount" class="tag tag-accent sort-trash-count">
            {{ session.trashedCount }}
          </span>
        </button>
        <button class="btn btn-secondary sort-change" @click="emit('back')">
          Changer de dossier
        </button>
      </div>
    </header>

    <p v-if="session.loading" class="sort-state text-muted">Chargement…</p>
    <p v-else-if="session.error" class="sort-state sort-error">{{ session.error }}</p>
    <p v-else-if="!session.total" class="sort-state text-muted">Aucune photo à trier ici.</p>

    <div v-else class="sort-body">
      <nav class="sort-rail" aria-label="Photos du dossier">
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
        <div class="sort-stage">
          <button
            class="btn btn-round sort-nav sort-nav-prev"
            :disabled="session.index === 0"
            aria-label="Photo précédente"
            @click="session.goPrev()"
          >
            <AppIcon name="chevronLeft" :size="18" />
          </button>

          <div class="sort-viewer">
            <div class="sort-frame">
              <img
                v-if="session.currentSrc"
                :src="session.currentSrc"
                :alt="session.currentPhoto?.name"
                :style="photoStyle"
                class="sort-photo"
              />
              <div v-else class="sort-photo-loading text-muted">Chargement de l'image…</div>
            </div>
            <div class="sort-meta text-muted">
              <span class="sort-meta-name text-mono">{{ session.currentPhoto?.name }}</span>
              <span>{{ sizeText }}</span>
              <span v-if="session.currentDecision === 'keep'" class="tag tag-accent">Gardée</span>
              <span v-else-if="session.currentDecision === 'trash'" class="tag sort-tag-trashed">
                À la corbeille
              </span>
            </div>
          </div>

          <button
            class="btn btn-round sort-nav sort-nav-next"
            :disabled="session.index >= session.total - 1"
            aria-label="Photo suivante"
            @click="session.goNext()"
          >
            <AppIcon name="chevronRight" :size="18" />
          </button>

          <div class="sort-zoom">
            <button class="btn btn-icon sort-zoom-btn" aria-label="Dézoomer" @click="zoomOut">
              <AppIcon name="zoomOut" :size="15" />
            </button>
            <span class="text-muted sort-zoom-text">{{ zoomText }}</span>
            <button class="btn btn-icon sort-zoom-btn" aria-label="Zoomer" @click="zoomIn">
              <AppIcon name="zoomIn" :size="15" />
            </button>
          </div>
        </div>

        <footer class="sort-actions">
          <div class="sort-rotate">
            <button class="btn btn-secondary" title="Pivoter à gauche" @click="rotateLeft">
              <AppIcon name="rotateLeft" />
            </button>
            <button class="btn btn-secondary" title="Pivoter à droite" @click="rotateRight">
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
            Garder
          </button>
          <button
            class="btn btn-danger sort-decide"
            :disabled="!!session.currentDecision"
            @click="session.decide('trash')"
          >
            <AppIcon name="trash" :size="17" />
            Envoyer à la corbeille
          </button>
          <button class="btn btn-secondary" :disabled="!session.canUndo" @click="session.undo()">
            Annuler
          </button>

          <button
            class="btn btn-round sort-theme"
            title="Changer de thème"
            aria-label="Changer de thème"
            @click="toggleTheme"
          >
            <AppIcon :name="theme === 'light' ? 'sun' : 'moon'" />
          </button>
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
  --thumb-intrinsic-height: 92px;
  width: 268px;
  flex: none;
  overflow-y: auto;
  padding: var(--space-4) var(--space-3);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: var(--space-6);
  min-height: 0;
}

.sort-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.sort-nav-prev {
  left: 20px;
}

.sort-nav-next {
  right: 20px;
}

.sort-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  max-width: 100%;
  min-height: 0;
}

.sort-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 70vw;
  min-height: 0;
}

.sort-photo {
  max-width: 70vw;
  max-height: 60vh;
  object-fit: contain;
  transition: transform 0.15s ease;
}

.sort-photo-loading {
  display: grid;
  place-items: center;
  width: 40vw;
  height: 40vh;
  font-size: 13px;
  background: var(--color-surface);
}

.sort-meta {
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
