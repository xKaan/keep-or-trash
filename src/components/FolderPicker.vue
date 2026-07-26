<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { getRecentFolders } from '../lib/persistence'
import AppIcon from './AppIcon.vue'

const emit = defineEmits<{ select: [folder: string] }>()

const recentFolders = ref<string[]>([])
const folderPath = ref('')

onMounted(async () => {
  recentFolders.value = await getRecentFolders()
  folderPath.value = recentFolders.value[0] ?? ''
})

async function pickFolder() {
  const folder = await open({ directory: true, multiple: false })
  if (typeof folder === 'string') {
    folderPath.value = folder
    emit('select', folder)
  }
}

function openTyped() {
  const folder = folderPath.value.trim()
  if (folder) emit('select', folder)
}
</script>

<template>
  <main class="screen-centered">
    <div class="card elev-lg picker">
      <div class="picker-badge">
        <AppIcon name="folder" :size="30" :stroke-width="1.6" />
      </div>

      <h2>Trier les photos d'un dossier</h2>
      <p class="text-muted picker-lead">
        Choisissez un dossier pour passer ses photos en revue : gardez les bonnes, envoyez les
        autres à la corbeille.
      </p>

      <div class="field picker-field">
        <label for="folder-path">Dossier</label>
        <input
          id="folder-path"
          v-model="folderPath"
          class="input text-mono picker-input"
          placeholder="C:\Utilisateurs\…\Images"
          @keyup.enter="openTyped"
        />
      </div>

      <button class="btn btn-primary btn-block picker-cta" @click="pickFolder">
        <AppIcon name="folder" />
        Choisir un dossier
      </button>

      <div v-if="recentFolders.length" class="picker-recent">
        <div class="hr"></div>
        <h6 class="text-muted picker-recent-title">Dossiers récents</h6>
        <ul class="picker-recent-list">
          <li v-for="folder in recentFolders" :key="folder">
            <button class="picker-recent-item text-mono" :title="folder" @click="emit('select', folder)">
              {{ folder }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>

<style scoped>
.picker {
  width: 420px;
  max-width: calc(100vw - var(--space-8));
  padding: var(--space-8);
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  animation: fadeIn 0.3s ease;
}

.picker-badge {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--tint-accent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.picker h2 {
  margin: 0;
}

.picker-lead {
  margin: 0;
  font-size: 14px;
}

.picker-field {
  width: 100%;
  text-align: left;
  margin-top: var(--space-2);
}

.picker-input {
  font-size: 12.5px;
}

.picker-cta {
  height: 40px;
  font-size: 15px;
}

.picker-recent {
  width: 100%;
  text-align: left;
}

.picker-recent-title {
  margin: 0 0 var(--space-2);
}

.picker-recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker-recent-item {
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 12.5px;
  color: color-mix(in srgb, var(--color-text) 75%, transparent);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-recent-item:hover {
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
  color: var(--color-text);
}
</style>
