// utils/connectionDetector.js
// Detecta y monitorea el estado de conexión a internet

class ConnectionDetector {
  constructor() {
    this.listeners = [];
    this.isOnline = navigator.onLine;
    this.lastStatusChange = Date.now();
    
    // Bind event handlers
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    // Inicializar listeners
    this.init();
  }

  init() {
    // Escuchar eventos nativos del navegador
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Verificación periódica adicional (cada 30 segundos)
    // Útil porque a veces los eventos online/offline no se disparan correctamente
    this.intervalId = setInterval(() => {
      this.checkConnection();
    }, 30000);
    
    console.log(`🌐 Connection Detector inicializado. Estado: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
  }

  handleOnline() {
    if (!this.isOnline) {
      console.log('✅ Conexión restaurada');
      this.isOnline = true;
      this.lastStatusChange = Date.now();
      this.notifyListeners('online');
    }
  }

  handleOffline() {
    if (this.isOnline) {
      console.log('❌ Conexión perdida');
      this.isOnline = false;
      this.lastStatusChange = Date.now();
      this.notifyListeners('offline');
    }
  }

  // Verificación activa de conexión
  async checkConnection() {
    const wasOnline = this.isOnline;
    
    // Verificar con navigator.onLine primero
    if (!navigator.onLine) {
      this.isOnline = false;
      if (wasOnline !== this.isOnline) {
        this.notifyListeners('offline');
      }
      return false;
    }

    // Intentar hacer ping al servidor
    try {
      // Ping simple con timeout corto
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      this.isOnline = response.ok;
    } catch (error) {
      // Si falla el fetch, asumir offline
      this.isOnline = false;
    }

    // Si cambió el estado, notificar
    if (wasOnline !== this.isOnline) {
      this.lastStatusChange = Date.now();
      this.notifyListeners(this.isOnline ? 'online' : 'offline');
    }

    return this.isOnline;
  }

  // Suscribirse a cambios de conexión
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Retornar función de unsuscribe
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notificar a todos los listeners
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.isOnline);
      } catch (error) {
        console.error('Error en callback de conexión:', error);
      }
    });
  }

  // Obtener estado actual
  getStatus() {
    return {
      isOnline: this.isOnline,
      lastStatusChange: this.lastStatusChange,
      timeSinceChange: Date.now() - this.lastStatusChange
    };
  }

  // Cleanup
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.listeners = [];
    console.log('🌐 Connection Detector destruido');
  }
}

// Singleton instance
let instance = null;

export const getConnectionDetector = () => {
  if (!instance) {
    instance = new ConnectionDetector();
  }
  return instance;
};

export const isOnline = () => {
  return getConnectionDetector().isOnline;
};

export default getConnectionDetector;