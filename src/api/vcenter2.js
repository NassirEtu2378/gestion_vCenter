import { createVcenterClient } from './vcenterClient'

const vcenterUrl = import.meta.env.VITE_VCENTER_API_URL_2 || ''

const vcenter2Client = createVcenterClient({
  id: 'secondary',
  host: vcenterUrl,
  apiBase: '/api/vcenter2',
  displayName: 'vCenter GALAXY',
  description: 'Serveur vCenter secondaire connecté via l’API',
})

export const getVcenter2Config = vcenter2Client.getConfig
export const loginVcenter2Session = vcenter2Client.loginSession
export const getVcenter2Clusters = vcenter2Client.getClusters
export const getVcenter2Vms = vcenter2Client.getVms
export const getVcenter2VmDiskIds = vcenter2Client.getVmDiskIds
export const getVcenter2VmDiskDetail = vcenter2Client.getVmDiskDetail
export const getVcenter2VmStorageGb = vcenter2Client.getVmStorageGb
export const getVcenter2VmFolderMap = vcenter2Client.getVmFolderMap
export const getVcenter2AllVmsWithClusterInfo = vcenter2Client.getAllVmsWithClusterInfo
