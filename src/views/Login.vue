<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginVcenterSession } from '../api/vcenter'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const submitLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const [primaryResult, secondaryResult] = await Promise.allSettled([
      loginVcenterSession(username.value, password.value, 'default'),
      loginVcenterSession(username.value, password.value, 'secondary'),
    ])

    if (primaryResult.status !== 'fulfilled' || !primaryResult.value) {
      throw new Error('Impossible de se connecter au vCenter principal.')
    }

    console.log('[login] token default:', primaryResult.value)

    if (secondaryResult.status === 'fulfilled' && secondaryResult.value) {
      console.log('[login] token secondary:', secondaryResult.value)
    }

    await router.push('/dashboard')
  } catch (error) {
    if (error?.response?.status === 401) {
      errorMessage.value = 'Identifiants incorrects. Veuillez réessayer.'
    } else {
      errorMessage.value =
        'Échec de la connexion au vCenter. Vérifiez vos identifiants et votre connexion.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-card">
      <h1>Connexion vCenter</h1>

      <form @submit.prevent="submitLogin" novalidate>

        <div class="form-group">
          <label for="username">Nom d’utilisateur</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            required
            placeholder="Entrez votre utilisateur"
          />
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Entrez votre mot de passe"
          />
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Connexion en cours…' : 'Se connecter' }}
        </button>

        <p class="error-message" v-if="errorMessage">{{ errorMessage }}</p>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #f7f9fc;
}

.login-card {
  width: min(420px, 100%);
  padding: 2rem;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.login-card h1 {
  margin-bottom: 1.5rem;
  font-size: 1.6rem;
  color: #102a43;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #334e68;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  background: #f8fafc;
  color: #102a43;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.95rem 1rem;
  margin-top: 1rem;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  background: #7f9cf5;
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  color: #b91c1c;
  font-size: 0.95rem;
}
</style>
