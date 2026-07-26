<script setup lang="ts">
import { ref } from 'vue'
import FolderPicker from './components/FolderPicker.vue'
import SortView from './components/SortView.vue'
import TrashView from './components/TrashView.vue'
import { useTheme } from './composables/useTheme'

useTheme()

type Screen = 'picker' | 'sort' | 'trash'

const screen = ref<Screen>('picker')
const folder = ref('')

function onFolderSelected(target: string) {
  folder.value = target
  screen.value = 'sort'
}
</script>

<template>
  <FolderPicker v-if="screen === 'picker'" @select="onFolderSelected" />
  <TrashView v-else-if="screen === 'trash'" :folder="folder" @back="screen = 'sort'" />
  <SortView
    v-else
    :folder="folder"
    @back="screen = 'picker'"
    @trash="screen = 'trash'"
  />
</template>
