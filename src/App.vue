<script setup lang="ts">
import { ref } from 'vue'
import FolderPicker from './components/FolderPicker.vue'
import { useTheme } from './composables/useTheme'

useTheme()

const selectedFolder = ref<string | null>(null)

function onFolderSelected(folder: string) {
  selectedFolder.value = folder
}
</script>

<template>
  <FolderPicker v-if="!selectedFolder" @select="onFolderSelected" />
</template>
