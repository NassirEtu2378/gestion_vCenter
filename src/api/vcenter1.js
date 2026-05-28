import axios from 'axios'

const SESSION_ENDPOINT = '/rest/com/vmware/cis/session'
const VM_LIST_ENDPOINT = '/rest/vcenter/vm'
const VM_DISK_LIST_ENDPOINT = (vmId) => `/rest/vcenter/vm/${vmId}/hardware/disk`
const VM_DISK_DETAIL_ENDPOINT = (vmId, diskId) => `/rest/vcenter/vm/${vmId}/hardware/disk/${diskId}`

const vcenterUrl = import.meta.env.VITE_VCENTER_API_URL || ''

const vcenterApi = axios.create({
  baseURL: '/api/vcenter1',
  headers: {
    Accept: 'application/json',
  },
})

function getStoredSession() {
  return localStorage.getItem('vcenter_session_default')
}

async function vcenterRequest(method, path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  const response = await vcenterApi({
    method,
    url: path,
    headers,
    data: options.data,
  })

  return response
}

export function getVcenter1Config() {
  if (!vcenterUrl) {
    return null
  }
  return {
    id: 'default',
    name: `vCenter ${vcenterUrl}`,
    host: vcenterUrl,
    description: 'Serveur vCenter principal connecté via l’API',
  }
}

export async function loginVcenter1Session(username, password) {
  const credentials = `${username}:${password}`
  const encodedCredentials =
    typeof window !== 'undefined'
      ? window.btoa(credentials)
      : Buffer.from(credentials).toString('base64')

  const response = await vcenterRequest('post', SESSION_ENDPOINT, {
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
    },
  })

  const sessionId = response.data?.value ?? null

  if (!sessionId) {
    return null
  }

  localStorage.setItem('vcenter_session_default', sessionId)
  return sessionId
}

function getSessionHeaders() {
  const sessionId = getStoredSession()
  if (!sessionId) {
    throw new Error('Session vCenter introuvable. Connectez-vous à nouveau.')
  }
  return {
    'vmware-api-session-id': sessionId,
  }
}

export async function getVcenter1Vms() {
  const response = await vcenterRequest('get', VM_LIST_ENDPOINT, {
    headers: getSessionHeaders(),
  })

  return response.data?.value ?? []
}

export async function getVcenter1VmDiskIds(vmId) {
  const response = await vcenterRequest('get', VM_DISK_LIST_ENDPOINT(vmId), {
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

export async function getVcenter1VmDiskDetail(vmId, diskId) {
  const response = await vcenterRequest('get', VM_DISK_DETAIL_ENDPOINT(vmId, diskId), {
    headers: getSessionHeaders(),
  })

  return response.data?.value ?? {}
}

export async function getVcenter1VmStorageGb(vmId) {
  const diskIds = await getVcenter1VmDiskIds(vmId)
  if (!diskIds.length) {
    return 0
  }

  const capacities = await Promise.all(
    diskIds.map(async (diskId) => {
      const diskDetail = await getVcenter1VmDiskDetail(vmId, diskId)
      return Number(diskDetail.capacity ?? 0)
    }),
  )

  const totalBytes = capacities.reduce((sum, capacity) => sum + capacity, 0)
  const totalGb = totalBytes / 1024 ** 3
  return Number(totalGb.toFixed(2))
}
