<script setup lang="ts">
import { ref } from 'vue'
import FolderPicker from './components/FolderPicker.vue'
import SortView from './components/SortView.vue'
import TrashView from './components/TrashView.vue'
import SettingsView from './components/SettingsView.vue'
import { useTheme } from './composables/useTheme'
import { useSettings } from './composables/useSettings'

useTheme()
useSettings()

type Screen = 'picker' | 'sort' | 'trash' | 'settings'

const screen = ref<Screen>('picker')
const returnScreen = ref<Screen>('picker')
const folder = ref('')

function onFolderSelected(target: string) {
  folder.value = target
  screen.value = 'sort'
}

function openSettings() {
  returnScreen.value = screen.value
  screen.value = 'settings'
}
</script>

<template>
  <SettingsView v-if="screen === 'settings'" @back="screen = returnScreen" />
  <FolderPicker v-else-if="screen === 'picker'" @select="onFolderSelected" @settings="openSettings" />
  <TrashView
    v-else-if="screen === 'trash'"
    :folder="folder"
    @back="screen = 'sort'"
    @settings="openSettings"
  />
  <SortView
    v-else
    :folder="folder"
    @back="screen = 'picker'"
    @trash="screen = 'trash'"
    @settings="openSettings"
  />
</template>
