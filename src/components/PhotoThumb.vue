<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Decision } from '../types'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    name: string
    src: string | undefined
    decision: Decision | null
    active: boolean
    layout?: 'card' | 'row' | 'dense'
    sizeText?: string
  }>(),
  { layout: 'card' },
)

const emit = defineEmits<{ select: []; visible: [] }>()

const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (props.src) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        emit('visible')
        observer?.disconnect()
        observer = null
      }
    },
    { rootMargin: '200px' },
  )
  if (root.value) observer.observe(root.value)
})

watch(
  () => props.active,
  (active) => {
    if (active) root.value?.scrollIntoView({ block: 'nearest' })
  },
)

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <button
    ref="root"
    class="thumb"
    :class="[`thumb-${layout}`, { 'thumb-active': active, 'thumb-trashed': decision === 'trash' }]"
    :aria-current="active"
    :title="name"
    @click="emit('select')"
  >
    <template v-if="layout === 'row'">
      <div class="thumb-row-frame">
        <img v-if="src" :src="src" :alt="name" class="thumb-row-img" decoding="async" />
        <div v-else class="thumb-row-placeholder"></div>
      </div>
      <span class="thumb-row-name text-mono">{{ name }}</span>
      <span v-if="sizeText" class="thumb-row-size text-muted">{{ sizeText }}</span>
      <span v-if="decision === 'keep'" class="thumb-row-badge thumb-badge-keep">
        <AppIcon name="check" :size="12" :stroke-width="2.4" />
      </span>
      <span v-else-if="decision === 'trash'" class="thumb-row-badge thumb-badge-trash">
        <AppIcon name="close" :size="12" :stroke-width="2.4" />
      </span>
    </template>

    <div v-else class="thumb-frame">
      <img v-if="src" :src="src" :alt="name" class="thumb-img" decoding="async" />
      <div v-else class="thumb-placeholder"></div>

      <span v-if="decision === 'keep'" class="thumb-badge thumb-badge-keep">
        <AppIcon name="check" :size="12" :stroke-width="2.4" />
      </span>
      <span v-else-if="decision === 'trash'" class="thumb-badge thumb-badge-trash">
        <AppIcon name="close" :size="12" :stroke-width="2.4" />
      </span>

      <span v-if="layout !== 'dense'" class="thumb-name text-mono">{{ name }}</span>
    </div>
  </button>
</template>

<style scoped>
.thumb {
  all: unset;
  cursor: pointer;
  display: block;
  border-radius: var(--radius-md);
  content-visibility: auto;
  contain-intrinsic-size: auto var(--thumb-intrinsic-height, 140px);
}

.thumb:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.thumb-active {
  box-shadow: 0 0 0 2px var(--color-accent);
}

.thumb-frame {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-neutral-900);
}

.thumb:not(.thumb-active) .thumb-frame {
  opacity: 0.85;
}

.thumb:hover .thumb-frame {
  opacity: 1;
}

.thumb-trashed .thumb-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-bg) 55%, transparent);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    115deg,
    var(--color-neutral-900),
    var(--color-neutral-800) 50%,
    var(--color-neutral-900)
  );
}

.thumb-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-badge-keep {
  background: var(--color-accent-800);
  color: var(--color-accent-100);
}

.thumb-badge-trash {
  background: var(--color-neutral-900);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.thumb-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  padding: 12px 8px 6px;
  font-size: 10px;
  color: var(--color-neutral-300);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75), transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumb-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2);
  border-radius: var(--radius-md);
}

.thumb-row:hover {
  background: color-mix(in srgb, var(--color-text) 5%, transparent);
}

.thumb-row.thumb-active {
  background: var(--tint-accent);
  box-shadow: none;
}

.thumb-row-frame {
  flex: none;
  width: min(var(--thumb-scale), 45%);
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-neutral-900);
}

.thumb-row-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-row-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    115deg,
    var(--color-neutral-900),
    var(--color-neutral-800) 50%,
    var(--color-neutral-900)
  );
}

.thumb-row-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thumb-row-size {
  flex: none;
  font-size: 12px;
}

.thumb-row-badge {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
