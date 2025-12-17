// context/OfflineContext.js
// Contexto global para manejar el estado offline/online

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getConnectionDetector } from '../utils/connectionDetector';
import { initDB, countVentasPendientes } from '../utils/indexedDB';
import { syncPendingData, syncProductos } from '../utils/syncManager';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline debe usarse dentro de OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ventasPendientes, setVentasPendientes] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productosProgress, setProductosProgress] = useState({ current: 0, total: 0 });

  // Inicializar IndexedDB y precargar productos al montar
  useEffect(() => {
    const inicializarSistema = async () => {
      try {
        await initDB();
        console.log('✅ IndexedDB inicializada desde Context');
        await updateVentasPendientes();
        
        // Si está online, precargar TODOS los productos
        if (navigator.onLine) {
          setIsLoadingProducts(true);
          console.log('🔄 Precargando todos los productos...');
          try {
            // Pasar callback de progreso
            await syncProductos((current, total) => {
              setProductosProgress({ current, total });
            });
            console.log('✅ Productos precargados exitosamente');
          } catch (error) {
            console.error('⚠️ Error precargando productos:', error);
            // No es crítico, continuar normal
          } finally {
            setIsLoadingProducts(false);
            setProductosProgress({ current: 0, total: 0 });
          }
        }
      } catch (error) {
        console.error('❌ Error inicializando sistema:', error);
      }
    };
    
    inicializarSistema();
  }, []);

  // Actualizar contador de ventas pendientes
  const updateVentasPendientes = useCallback(async () => {
    try {
      const count = await countVentasPendientes();
      setVentasPendientes(count);
      return count;
    } catch (error) {
      console.error('Error contando ventas pendientes:', error);
      return 0;
    }
  }, []);

  // Función de sincronización manual
  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) {
      console.log('⚠️ No se puede sincronizar: offline o ya sincronizando');
      return { success: false, reason: 'offline_or_syncing' };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('🔄 Iniciando sincronización...');
      const result = await syncPendingData();
      
      if (result.success) {
        setLastSyncTime(Date.now());
        await updateVentasPendientes();
        console.log('✅ Sincronización completada exitosamente');
      } else {
        setSyncError(result.error || 'Error desconocido');
        console.error('❌ Error en sincronización:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error durante sincronización:', error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updateVentasPendientes]);

  // Escuchar cambios de conexión
  useEffect(() => {
    const detector = getConnectionDetector();
    
    const unsubscribe = detector.subscribe((status, online) => {
      console.log(`🌐 Estado de conexión: ${status}`);
      setIsOnline(online);

      // Auto-sincronizar cuando vuelve la conexión
      if (online && status === 'online') {
        console.log('✅ Conexión restaurada - Auto-sincronizando...');
        setTimeout(() => {
          triggerSync();
        }, 2000); // Esperar 2 segundos para asegurar conexión estable
      }
    });

    return () => {
      unsubscribe();
    };
  }, [triggerSync]);

  // Actualizar ventas pendientes periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      updateVentasPendientes();
    }, 10000); // Cada 10 segundos

    return () => clearInterval(interval);
  }, [updateVentasPendientes]);

  const value = {
    isOnline,
    isSyncing,
    ventasPendientes,
    lastSyncTime,
    syncError,
    isLoadingProducts,
    productosProgress,
    triggerSync,
    updateVentasPendientes
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;