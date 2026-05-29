import axios from 'axios'
import { getSessionToken, setSessionToken } from './sessionService'

const SESSION_ENDPOINT = '/rest/com/vmware/cis/session'
const CLUSTER_LIST_ENDPOINT = '/rest/vcenter/cluster'
const FOLDER_LIST_ENDPOINT = '/rest/vcenter/folder'
const VM_LIST_ENDPOINT = '/rest/vcenter/vm'
const VM_DETAIL_ENDPOINT = (vmId) => `/rest/vcenter/vm/${vmId}`
const VM_DISK_LIST_ENDPOINT = (vmId) => `/rest/vcenter/vm/${vmId}/hardware/disk`
const VM_DISK_DETAIL_ENDPOINT = (vmId, diskId) => `/rest/vcenter/vm/${vmId}/hardware/disk/${diskId}`

function encodeCredentials(username, password) {
  const credentials = `${username}:${password}`
  return typeof window !== 'undefined'
    ? window.btoa(credentials)
    : Buffer.from(credentials).toString('base64')
}

export function createVcenterClient({ id, host, apiBase, displayName, description }) {
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Accept: 'application/json',
    },
  })

  const storageCache = new Map()
  const diskDetailCache = new Map()

  function getConfig() {
    if (!host) {
      return null
    }

    return {
      id,
      name: `${displayName}`,
      host,
      description,
    }
  }

  async function request(method, path, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    }

    const response = await api({
      method,
      url: path,
      headers,
      data: options.data,
    })

    return response
  }

  async function loginSession(username, password) {
    const encodedCredentials = encodeCredentials(username, password)
    const response = await request('post', SESSION_ENDPOINT, {
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
      },
    })

    const sessionId = response.data?.value ?? null
    if (!sessionId) {
      return null
    }

    setSessionToken(id, sessionId)
    return sessionId
  }

  function getSessionHeaders() {
    const sessionId = getSessionToken(id)
    if (!sessionId) {
      throw new Error('Session vCenter introuvable. Connectez-vous à nouveau.')
    }

    return {
      'vmware-api-session-id': sessionId,
    }
  }

  async function getVms(clusterId = null) {
    const url = clusterId
      ? `${VM_LIST_ENDPOINT}?filter.clusters=${encodeURIComponent(clusterId)}`
      : VM_LIST_ENDPOINT

    const response = await request('get', url, {
      headers: getSessionHeaders(),
    })
    return response.data?.value ?? []
  }

  async function getClusters() {
    const response = await request('get', CLUSTER_LIST_ENDPOINT, {
      headers: getSessionHeaders(),
    })
    return response.data?.value ?? []
  }

  async function getVmDetail(vmId) {
    const response = await request('get', VM_DETAIL_ENDPOINT(vmId), {
      headers: getSessionHeaders(),
    })
    return response.data?.value ?? {}
  }

  async function getVmDiskIds(vmId) {
    const response = await request('get', VM_DISK_LIST_ENDPOINT(vmId), {
      headers: getSessionHeaders(),
    })

    const disks = response.data?.value ?? []
    return disks
      .map((disk) => {
        if (!disk) return null
        return disk.disk || disk.key || disk.value?.disk || disk.value?.id || null
      })
      .filter(Boolean)
  }

  async function getVmDiskDetail(vmId, diskId) {
    const cacheKey = `${vmId}:${diskId}`
    if (diskDetailCache.has(cacheKey)) {
      return diskDetailCache.get(cacheKey)
    }

    const response = await request('get', VM_DISK_DETAIL_ENDPOINT(vmId, diskId), {
      headers: getSessionHeaders(),
    })

    const detail = response.data?.value ?? {}
    diskDetailCache.set(cacheKey, detail)
    return detail
  }

  async function getVmStorageGb(vmId) {
    if (storageCache.has(vmId)) {
      return storageCache.get(vmId)
    }

    const diskIds = await getVmDiskIds(vmId)
    if (!diskIds.length) {
      storageCache.set(vmId, 0)
      return 0
    }

    const capacities = await Promise.all(
      diskIds.map(async (diskId) => {
        const diskDetail = await getVmDiskDetail(vmId, diskId)
        return Number(diskDetail.capacity ?? 0)
      }),
    )

    const totalBytes = capacities.reduce((sum, capacity) => sum + capacity, 0)
    const totalGb = Number((totalBytes / 1024 ** 3).toFixed(2))
    storageCache.set(vmId, totalGb)
    return totalGb
  }

  async function getFolders() {
    const response = await request('get', `${FOLDER_LIST_ENDPOINT}?filter.type=VIRTUAL_MACHINE`, {
      headers: getSessionHeaders(),
    })
    return response.data?.value ?? []
  }

  async function getVmsByFolder(folderId) {
    const response = await request('get', `${VM_LIST_ENDPOINT}?filter.folders=${encodeURIComponent(folderId)}`, {
      headers: getSessionHeaders(),
    })
    return response.data?.value ?? []
  }

  async function getVmFolderMap() {
    const folders = await getFolders()
    const folderMap = new Map()

    const folderVmPromises = folders.map(async (folder) => {
      const folderId = folder.folder || folder.id
      const folderName = folder.name || folder.folder_name || folder.id || 'N/A'
      if (!folderId) {
        return []
      }

      const vmsInFolder = await getVmsByFolder(folderId)
      return vmsInFolder.map((vm) => ({
        vmId: vm.vm || vm.id,
        folderName,
      }))
    })

    const folderResults = await Promise.all(folderVmPromises)
    for (const items of folderResults) {
      for (const { vmId, folderName } of items) {
        if (vmId && !folderMap.has(vmId)) {
          folderMap.set(vmId, folderName)
        }
      }
    }

    return folderMap
  }

  async function getAllVmsWithClusterInfo() {
    try {
      const [clusters, folderMap] = await Promise.all([getClusters(), getVmFolderMap()])
      const allVmsMap = new Map()

      if (clusters.length === 0) {
        const allVms = await getVms()
        return allVms.map((vm) => ({
          ...vm,
          folder_name: folderMap.get(vm.vm || vm.id) ?? vm.folder_name ?? (vm.folder || vm.folder_path),
        }))
      }

      const clusterVmPromises = clusters.map(async (cluster) => {
        const clusterId = cluster.cluster || cluster.id
        const clusterName = cluster.name
        try {
          const vmsInCluster = await getVms(clusterId)
          return { clusterId, clusterName, vmsInCluster }
        } catch (error) {
          console.warn(`Failed to fetch VMs for cluster ${clusterId}:`, error)
          return { clusterId, clusterName, vmsInCluster: [] }
        }
      })

      const clusterResults = await Promise.all(clusterVmPromises)

      for (const { clusterId, clusterName, vmsInCluster } of clusterResults) {
        for (const vm of vmsInCluster) {
          const vmId = vm.vm || vm.id
          if (vmId && !allVmsMap.has(vmId)) {
            const enrichedVm = {
              ...vm,
              cluster: clusterId,
              cluster_name: clusterName,
              folder_name: folderMap.get(vmId) ?? vm.folder_name ?? (vm.folder || vm.folder_path),
            }
            allVmsMap.set(vmId, enrichedVm)
          }
        }
      }

      return Array.from(allVmsMap.values())
    } catch (error) {
      console.error('Error fetching VMs with cluster info:', error)
      throw error
    }
  }

  return {
    getConfig,
    loginSession,
    getClusters,
    getVms,
    getVmDetail,
    getVmDiskIds,
    getVmDiskDetail,
    getVmStorageGb,
    getFolders,
    getVmsByFolder,
    getVmFolderMap,
    getAllVmsWithClusterInfo,
  }
}
