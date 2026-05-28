import {getVcenter1Config,loginVcenter1Session,getVcenter1Vms,getVcenter1VmStorageGb,} from './vcenter1'
import {getVcenter2Config,loginVcenter2Session,getVcenter2Vms,getVcenter2VmStorageGb,} from './vcenter2'

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

export async function getVcenterVms(vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return getVcenter2Vms()
  }
  return getVcenter1Vms()
}

export async function getVmStorageGb(vmId, vcenterId = 'default') {
  if (vcenterId === 'secondary') {
    return getVcenter2VmStorageGb(vmId)
  }
  return getVcenter1VmStorageGb(vmId)
}
