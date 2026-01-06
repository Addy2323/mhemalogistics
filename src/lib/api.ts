import axios from 'axios';

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    error?: {
        message: string;
    };
}


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Re-type the instance to reflect interceptor behavior
import { AxiosInstance, AxiosRequestConfig } from 'axios';

interface CustomAxiosInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
    get<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
}

const apiClient = instance as CustomAxiosInstance;



// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('mhema_user');
            window.location.href = '/auth';
        }

        // Return error message
        const errorMessage = error.response?.data?.error?.message || 'An error occurred';
        return Promise.reject(new Error(errorMessage));
    }
);

// Auth API
export const authAPI = {
    login: (email: string, password: string) =>
        apiClient.post('/auth/login', { email, password }),

    register: (fullName: string, email: string, password: string, phone?: string) =>
        apiClient.post('/auth/register', { fullName, email, password, phone }),
};

// Orders API
export const ordersAPI = {
    list: (params?: { status?: string; page?: number; limit?: number }) =>
        apiClient.get('/orders', { params }),

    getById: (id: string) =>
        apiClient.get(`/orders/${id}`),

    create: (orderData: {
        pickupAddress: string;
        pickupLat?: number;
        pickupLng?: number;
        deliveryAddress: string;
        deliveryLat?: number;
        deliveryLng?: number;
        transportMethodId?: string;
        description?: string;
        packageWeight?: number;
        productImageUrls?: string[];
    }) =>
        apiClient.post('/orders', orderData),

    updateStatus: (id: string, status: string) =>
        apiClient.patch(`/orders/${id}/status`, { status }),

    update: (id: string, data: {
        actualCost?: number;
        estimatedCost?: number;
        packageWeight?: number;
        description?: string;
    }) =>
        apiClient.patch(`/orders/${id}`, data),

    confirmPayment: (id: string, paymentMethod: string, amount: number) =>
        apiClient.patch(`/orders/${id}/payment`, { paymentMethod, amount }),

    reassign: (id: string, agentId: string, reason?: string) =>
        apiClient.patch(`/orders/${id}/assign`, { agentId, reason }),

    uploadProductImage: (formData: FormData) =>
        apiClient.post('/orders/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    verifyOrder: (id: string) =>
        apiClient.patch(`/orders/${id}/verify`),

    delete: (id: string) =>
        apiClient.delete(`/orders/${id}`),
};

// Agents API
export const agentsAPI = {
    list: (params?: { search?: string; status?: string }) =>
        apiClient.get('/agents', { params }),

    getStats: (id: string) =>
        apiClient.get(`/agents/${id}/stats`),

    create: (agentData: {
        email: string;
        password: string;
        fullName: string;
        phone: string;
        commissionRate?: number;
        maxOrderCapacity?: number;
    }) =>
        apiClient.post('/agents', agentData),

    updateStatus: (id: string, availabilityStatus: 'ONLINE' | 'OFFLINE') =>
        apiClient.patch(`/agents/${id}/status`, { availabilityStatus }),

    update: (id: string, data: {
        commissionRate?: number;
        maxOrderCapacity?: number;
        status?: string;
    }) =>
        apiClient.patch(`/agents/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/agents/${id}`),
};

// Customers API
export const customersAPI = {
    list: (params?: { search?: string; status?: string }) =>
        apiClient.get('/customers', { params }),

    delete: (id: string) =>
        apiClient.delete(`/customers/${id}`),
};

// Payment QR Codes API
export const paymentQRAPI = {
    list: () =>
        apiClient.get('/payment-qr-codes'),

    upload: (formData: FormData) =>
        apiClient.post('/payment-qr-codes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    delete: (id: string) =>
        apiClient.delete(`/payment-qr-codes/${id}`),
};

// Transport Methods API
export const transportAPI = {
    list: () =>
        apiClient.get('/transport-methods'),

    create: (data: {
        name: string;
        description?: string;
        basePrice: number;
        pricePerKm?: number;
        pricePerKg?: number;
        icon?: string;
    }) =>
        apiClient.post('/transport-methods', data),

    update: (id: string, data: any) =>
        apiClient.patch(`/transport-methods/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/transport-methods/${id}`),
};

// Notifications API
export const notificationsAPI = {
    list: (params?: { isRead?: boolean; limit?: number }) =>
        apiClient.get('/notifications', { params }),

    markAsRead: (id: string) =>
        apiClient.patch(`/notifications/${id}/read`),

    markAllAsRead: () =>
        apiClient.patch('/notifications/read-all'),
};

// Analytics API
export const analyticsAPI = {
    getDashboard: () =>
        apiClient.get('/analytics/dashboard'),

    getSales: (params: {
        startDate?: string;
        endDate?: string;
        groupBy?: 'day' | 'week' | 'month';
    }) =>
        apiClient.get('/analytics/sales', { params }),

    getAgentPerformance: () =>
        apiClient.get('/analytics/agents'),
};

// Chats API
export const chatsAPI = {
    getByOrderId: (orderId: string) =>
        apiClient.get(`/chats/order/${orderId}`),
};

export const usersAPI = {
    updateProfile: (data: { fullName?: string; phone?: string }) =>
        apiClient.patch<ApiResponse<any>>('/users/profile', data),
    uploadAvatar: (formData: FormData) =>
        apiClient.post<ApiResponse<any>>('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
};

export default apiClient;

