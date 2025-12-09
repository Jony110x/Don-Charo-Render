import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const getCurrentUser = () => api.get('/auth/me');

// Productos
export const getProductos = () => api.get('/productos/');
export const getProducto = (id) => api.get(`/productos/${id}`);
export const createProducto = (data) => api.post('/productos/', data);
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data);
export const deleteProducto = (id) => api.delete(`/productos/${id}`);
export const getProductosStockBajo = () => api.get('/productos/stock/bajo');
export const buscarPorCodigo = (codigo) => api.get(`/productos/buscar-codigo?codigo=${codigo}`);

// Ventas
export const getVentas = () => api.get('/ventas/');
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const createVenta = (data) => api.post('/ventas/', data);

// Reportes
export const getDashboard = () => api.get('/reportes/dashboard');
export const getVentasMensuales = () => api.get('/reportes/ventas/mensuales');
export const getProductosRentabilidad = () => api.get('/reportes/productos/rentabilidad');

// Cotizaciones (API externa - Frankfurter.dev - GRATIS)
export const getCotizaciones = async () => {
  try {
    const response = await axios.get('https://api.frankfurter.dev/v1/latest?base=ARS&symbols=USD,BRL');
    return response.data.rates;
  } catch (error) {
    console.error('Error obteniendo cotizaciones:', error);
    // Valores por defecto si falla la API
    return { USD: 0.0007, BRL: 0.004 }; // Aproximado
  }
};

export const getVentasPorPeriodo = (periodo) => api.get(`/reportes/ventas-por-periodo?periodo=${periodo}`);
export const getCategoriasVendidas = (limite = 10) => api.get(`/reportes/categorias-mas-vendidas?limite=${limite}`);
export const getProductosVendidos = (limite = 10) => api.get(`/reportes/productos-mas-vendidos?limite=${limite}`);
export const getVentasPorHorario = () => api.get('/reportes/ventas-por-horario');
export const getGanancias = (periodo) => api.get(`/reportes/ganancias?periodo=${periodo}`);
export const getMetodosPago = () => api.get('/reportes/metodos-pago');

export default api;