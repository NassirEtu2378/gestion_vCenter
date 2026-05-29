<script setup>
import { computed } from 'vue'

const props = defineProps({
  clusters: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  selectedClusterId: {
    type: [String, Number, null],
    default: null,
  },
})

const emit = defineEmits(['update:selectedClusterId'])

const handleChange = (event) => {
  const value = event.target.value === '' ? null : event.target.value
  emit('update:selectedClusterId', value)
}

const displayText = computed(() => {
  if (props.isLoading) return 'Chargement des clusters…'
  if (props.error) return 'Erreur'
  if (props.clusters.length === 0) return 'Aucun cluster'
  return 'Clusters'
})
</script>

<template>
  <div class="cluster-filter-panel">
    <h2>{{ displayText }}</h2>

    <div v-if="isLoading" class="panel-empty">Chargement des clusters…</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="clusters.length === 0" class="panel-empty">Aucun cluster disponible.</div>

    <select v-else @change="handleChange" :value="selectedClusterId ?? ''" class="cluster-dropdown">
      <option value="">-- Tous les clusters --</option>
      <option v-for="cluster in clusters" :key="cluster.cluster || cluster.id" :value="cluster.cluster || cluster.id">
        {{ cluster.name || cluster.cluster }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.cluster-filter-panel h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #102a43;
}

.panel-empty {
  padding: 1rem 0;
  color: #64748b;
  font-size: 0.95rem;
}

.error-message {
  margin-bottom: 1rem;
  padding: 1rem;
  color: #991b1b;
  background: #fee2e2;
  border-radius: 12px;
}

.cluster-dropdown {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  background: #f8fafc;
  color: #5a6f83;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: 500;
}

.cluster-dropdown:hover {
  border-color: #192029;
}

.cluster-dropdown:focus {
  outline: none;
  border-color: #202227;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
</style>
