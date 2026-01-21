<template>
  <div class="dashboard">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>仪表盘</span>
        </div>
      </template>
      <div class="welcome">
        <h2>欢迎使用 AI 能力中台后台管理系统</h2>
        <p>当前登录用户：{{ authStore.admin?.username }}</p>
        <p>角色：{{ authStore.admin?.role }}</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<style scoped>
.dashboard {
  width: 100%;
}

.welcome {
  padding: 20px;
  text-align: center;
}

.welcome h2 {
  margin-bottom: 20px;
  color: #333;
}

.welcome p {
  margin: 10px 0;
  color: #666;
  font-size: 14px;
}
</style>

