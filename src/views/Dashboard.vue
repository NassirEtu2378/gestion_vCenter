<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { getVcenterList, getVcenterVms, getVmStorageGb } from '../api/vcenter'

const vcenters = ref([])
const selectedVcenter = ref(null)
const vms = ref([])
const isLoadingVcenters = ref(true)
const isLoadingVms = ref(false)
const errorMessage = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const vmStorage = ref({})
const vmStorageLoading = ref({})

const loadVcenters = async () => {
  isLoadingVcenters.value = true
  errorMessage.value = ''

  try {
    vcenters.value = await getVcenterList()
    if (vcenters.value.length > 0) {
      await selectVcenter(vcenters.value[0])
    }
  } catch (error) {
    errorMessage.value = 'Impossible de charger la liste des vCenter.'
  } finally {
    isLoadingVcenters.value = false
  }
}

const loadVcenterVms = async () => {
  if (!selectedVcenter.value) {
    vms.value = []
    vmStorage.value = {}
    vmStorageLoading.value = {}
    return
  }

  isLoadingVms.value = true
  errorMessage.value = ''

  try {
    vms.value = await getVcenterVms(selectedVcenter.value.id)

    currentPage.value = 1
    vmStorage.value = {}
    vmStorageLoading.value = {}
  } catch (error) {
    errorMessage.value =
      'Impossible de récupérer les machines virtuelles. Veuillez vérifier votre session vCenter.'
    vms.value = []
    vmStorage.value = {}
    vmStorageLoading.value = {}
  } finally {
    isLoadingVms.value = false
  }
}

const selectVcenter = async (vcenter) => {
  selectedVcenter.value = vcenter
  await loadVcenterVms()
}

const hasVms = computed(() => vms.value.length > 0)
const pageCount = computed(() => Math.max(1, Math.ceil(vms.value.length / pageSize.value)))
const paginatedVms = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return vms.value.slice(start, start + pageSize.value)
})
const pageNumbers = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))

const formatMemory = (value) => (value ? `${value} MiB` : 'N/A')
const formatDate = (value) => (value ? new Date(value).toLocaleString('fr-FR') : 'N/A')

const fetchVmStorage = async (vmId) => {
  if (!vmId || !selectedVcenter.value) {
    return 0
  }

  if (vmStorage.value[vmId] != null) {
    return vmStorage.value[vmId]
  }

  vmStorageLoading.value[vmId] = true
  try {
    const storageGb = await getVmStorageGb(vmId, selectedVcenter.value.id)
    vmStorage.value[vmId] = storageGb
    return storageGb
  } catch (error) {
    vmStorage.value[vmId] = 0
    return 0
  } finally {
    vmStorageLoading.value[vmId] = false
  }
}

const loadStorageForPage = async () => {
  await Promise.all(
    paginatedVms.value.map((vm) => {
      const vmId = vm.vm || vm.name
      return fetchVmStorage(vmId)
    }),
  )
}

watch(
  () => paginatedVms.value.map((vm) => vm.vm || vm.name),
  () => {
    if (hasVms.value) {
      loadStorageForPage()
    }
  },
  { immediate: true },
)

const getStorageLabel = (vm) => {
  const vmId = vm.vm || vm.name
  if (vmStorageLoading.value[vmId]) {
    return '...'
  }

  return vmStorage.value[vmId] != null ? vmStorage.value[vmId] : 'N/A'
}

const isFirstPage = computed(() => currentPage.value === 1)
const isLastPage = computed(() => currentPage.value === pageCount.value)

const goToPage = (page) => {
  if (page >= 1 && page <= pageCount.value) {
    currentPage.value = page
  }
}

const prevPage = () => {
  if (!isFirstPage.value) {
    currentPage.value -= 1
  }
}

const nextPage = () => {
  if (!isLastPage.value) {
    currentPage.value += 1
  }
}

onMounted(() => {
  loadVcenters()
})
</script>

<template>
  <section class="dashboard-page">
    <div class="dashboard-hero">
      <h1>Tableau de bord VMware</h1>
      <p>Supervision des vCenter et des machines virtuelles.</p>
    </div>

    <div class="dashboard-grid">
      <aside class="dashboard-sidebar">
        <div class="panel">
          <h2>vCenter</h2>

          <div v-if="isLoadingVcenters" class="panel-empty">Chargement des vCenter…</div>
          <div v-else-if="vcenters.length === 0" class="panel-empty">Aucun vCenter configuré.</div>

          <ul class="vcenter-list" v-else>
            <li
              v-for="vcenter in vcenters"
              :key="vcenter.id"
              :class="{ active: selectedVcenter?.id === vcenter.id }"
            >
              <button type="button" @click="selectVcenter(vcenter)">
                <span class="vcenter-name">{{ vcenter.name }}</span>
                <span class="vcenter-host">{{ vcenter.host }}</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>

      <main class="dashboard-content">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Machines virtuelles</h2>
              <p v-if="selectedVcenter" class="subtitle">
                {{ selectedVcenter.description }}
              </p>
            </div>
            <div class="status-pill" v-if="selectedVcenter">{{ selectedVcenter.host }}</div>
          </div>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <div v-if="!selectedVcenter" class="panel-empty">
            Sélectionnez un vCenter pour afficher les VM.
          </div>

          <div v-if="isLoadingVms" class="panel-empty">Chargement des VM…</div>

          <table v-if="selectedVcenter && hasVms" class="vm-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>CPU</th>
                <th>RAM</th>
                <th>Stockage (GB)</th>
                <th>Date de création</th>
                <th>Cluster</th>
                <th>Dossier</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="vm in paginatedVms" :key="vm.vm || vm.name">
                <td>{{ vm.name || 'N/A' }}</td>
                <td>{{ vm.cpu_count ?? vm.cpu?.count ?? 'N/A' }}</td>
                <td>{{ formatMemory(vm.memory_size_MiB || vm.memory?.size_MiB) }}</td>
                <td>{{ getStorageLabel(vm) }}</td>
                <td>
                  {{ formatDate(vm.create_time || vm.creation_time || vm.identity?.create_time) }}
                </td>
                <td>{{ vm.cluster || vm.cluster_name || vm.cluster_id || 'N/A' }}</td>
                <td>{{ vm.folder || vm.folder_name || vm.folder_path || 'N/A' }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="selectedVcenter && hasVms" class="pagination-controls">
            <button type="button" :disabled="isFirstPage" @click="prevPage">Précédent</button>
            <div class="page-list">
              <button
                v-for="page in pageNumbers"
                :key="page"
                type="button"
                :class="{ active: currentPage === page }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button type="button" :disabled="isLastPage" @click="nextPage">Suivant</button>
          </div>

          <div v-if="selectedVcenter && !isLoadingVms && !hasVms" class="panel-empty">
            Aucune machine virtuelle trouvée pour ce vCenter.
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.dashboard-page {
  padding: 2rem;
}

.dashboard-hero {
  margin-bottom: 1.5rem;
}

.dashboard-hero h1 {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.dashboard-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(240px, 320px) 1fr;
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
}

.panel {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.subtitle {
  margin: 0.35rem 0 0;
  color: #627d98;
}

.status-pill {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.9rem;
  white-space: nowrap;
}

.vcenter-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.vcenter-list li {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.vcenter-list li.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.vcenter-list button {
  width: 100%;
  text-align: left;
  padding: 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
}

.vcenter-name {
  display: block;
  font-weight: 700;
}

.vcenter-host {
  display: block;
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.95rem;
}

.vm-table {
  width: 100%;
  border-collapse: collapse;
}

.vm-table th,
.vm-table td {
  padding: 0.95rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.vm-table th {
  font-weight: 700;
  color: #334155;
  text-align: left;
}

.vm-table tbody tr:hover {
  background: #f8fafc;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.pagination-controls button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  cursor: pointer;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.page-list button {
  min-width: 2.4rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}

.page-list button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.panel-empty {
  padding: 1.25rem 0;
  color: #64748b;
}

.error-message {
  margin-bottom: 1rem;
  padding: 1rem;
  color: #991b1b;
  background: #fee2e2;
  border-radius: 12px;
}
</style>
