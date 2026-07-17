import { ref, computed } from 'vue'
import { getBackendRoles } from '@/api/backendRole'

export function useAdminRoleOptions() {
  const roleOptions = ref([])

  async function fetchRoleOptions() {
    const res = await getBackendRoles()
    const roles = res.data || res || []
    roleOptions.value = roles.filter(
      role => role.roleKey !== 'super_admin' && role.status === 'active'
    )
  }

  const roleLabelMap = computed(() => {
    const map = { super_admin: '超级管理员' }
    roleOptions.value.forEach(role => {
      map[role.roleKey] = role.name
    })
    return map
  })

  const filterRoleOptions = computed(() => [
    { roleKey: 'super_admin', name: '超级管理员' },
    ...roleOptions.value,
  ])

  return {
    roleOptions,
    roleLabelMap,
    filterRoleOptions,
    fetchRoleOptions,
  }
}
