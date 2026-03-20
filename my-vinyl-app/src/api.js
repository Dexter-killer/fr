import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
    }
});

// Перехватчик для добавления токена в каждый запрос
apiClient.interceptors.request.use(
    (config) => {
        let accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Перехватчик для обновления токена, если сервер вернул 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        let originalRequest = error.config;

        // Если ошибка 401 (Unauthorized) и мы еще не пробовали повторить запрос
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            let refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                // Нет refresh токена - придется логиниться заново
                localStorage.removeItem('accessToken');
                return Promise.reject(error);
            }

            try {
                // Пробуем получить новые токены
                const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                
                let newAccessToken = response.data.accessToken;
                let newRefreshToken = response.data.refreshToken;
                
                // Сохраняем новые токены
                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                
                // Обновляем заголовок в оригинальном запросе и повторяем его
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
                
            } catch (refreshError) {
                // Если обновить не удалось (например, refresh токен истек)
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login'; // Перекидываем на логин
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
