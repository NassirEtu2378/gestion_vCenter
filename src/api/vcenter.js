import {getVcenter1Config,loginVcenter1Session,getVcenter1Vms,getVcenter1Clusters,getVcenter1VmStorageGb,getVcenter1VmFolderMap,getVcenter1AllVmsWithClusterInfo,} from './vcenter1'
import {getVcenter2Config,loginVcenter2Session,getVcenter2Vms,getVcenter2Clusters,getVcenter2VmStorageGb,getVcenter2VmFolderMap,getVcenter2AllVmsWithClusterInfo,} from './vcenter2'

export function getVcenterList() {
  const list = []
  const primary = getVcenter1Config()
  if (primary) {
    list.push(primary)
  }
  const secondary = getVcenter2Config()
  if (secondary) {
    list.push(secondary)
  }
  return Promise.resolve(list)
}

export async function loginVcenterSession(username, password, vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return loginVcenter2Session(username, password)
  }
  return loginVcenter1Session(username, password)
}

export async function getVcenterVms(vcenterId = 'default', clusterId = null) {
  if (vcenterId === 'secondary') {
    return getVcenter2Vms(clusterId)
  }
  return getVcenter1Vms(clusterId)
}

export async function getVcenterClusters(vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return getVcenter2Clusters()
  }
  return getVcenter1Clusters()
}

export async function getVmStorageGb(vmId, vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return getVcenter2VmStorageGb(vmId)
  }
  return getVcenter1VmStorageGb(vmId)
}

export async function getVcenterVmFolderMap(vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return getVcenter2VmFolderMap()
  }
  return getVcenter1VmFolderMap()
}

export async function getAllVmsWithClusterInfo(vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return getVcenter2AllVmsWithClusterInfo()
  }
  return getVcenter1AllVmsWithClusterInfo()
}
