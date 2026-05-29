import { createVcenterClient } from './vcenterClient'

const vcenterUrl = import.meta.env.VITE_VCENTER_API_URL || ''

const vcenter1Client = createVcenterClient({
  id: 'default',
  host: vcenterUrl,
  apiBase: '/api/vcenter1',
  displayName: 'vCenter ANALAKELY',
  description: 'Serveur vCenter principal connecté via l’API',
})

export const getVcenter1Config = vcenter1Client.getConfig
export const loginVcenter1Session = vcenter1Client.loginSession
export const getVcenter1Clusters = vcenter1Client.getClusters
export const getVcenter1Vms = vcenter1Client.getVms
export const getVcenter1VmDiskIds = vcenter1Client.getVmDiskIds
export const getVcenter1VmDiskDetail = vcenter1Client.getVmDiskDetail
export const getVcenter1VmStorageGb = vcenter1Client.getVmStorageGb
export const getVcenter1VmFolderMap = vcenter1Client.getVmFolderMap
export const getVcenter1AllVmsWithClusterInfo = vcenter1Client.getAllVmsWithClusterInfo
