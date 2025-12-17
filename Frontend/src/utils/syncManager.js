// utils/syncManager.js
// Maneja la sincronización de ventas pendientes con el servidor

import { getVentasPendientes, markVentaSincronizada, getAllProductos, saveProductos } from './indexedDB';
import api from '../api/api';

/**
 * Sincronizar todas las ventas pendientes con el servidor
 */
export const syncPendingData = async () => {
  console.log('🔄 Iniciando sincronización de datos pendientes...');
  
  const result = {
    success: false,
    ventasSincronizadas: 0,
    errores: [],
    productosSincronizados: false
  };

  try {
    // 1. Obtener ventas pendientes
    const ventasPendientes = await getVentasPendientes();
    console.log(`📦 ${ventasPendientes.length} ventas pendientes encontradas`);

    if (ventasPendientes.length === 0) {
      console.log('✅ No hay ventas pendientes para sincronizar');
      result.success = true;
      
      // Aunque no haya ventas, actualizar productos
      await syncProductos();
      result.productosSincronizados = true;
      
      return result;
    }

    // 2. Sincronizar cada venta
    for (const venta of ventasPendientes) {
      try {
        console.log(`📤 Enviando venta ID ${venta.id}...`);
        
        // Preparar datos de venta para el servidor
        const ventaData = {
          items: venta.items,
          metodo_pago: venta.metodo_pago,
          observaciones: `Venta offline - Sincronizada el ${new Date().toLocaleString()}`
        };

        // Enviar al servidor
        const response = await api.post('/ventas/', ventaData);
        
        if (response.status === 200 || response.status === 201) {
          // Marcar como sincronizada
          await markVentaSincronizada(venta.id);
          result.ventasSincronizadas++;
          console.log(`✅ Venta ${venta.id} sincronizada exitosamente`);
        } else {
          throw new Error(`Status ${response.status}`);
        }
        
      } catch (error) {
        console.error(`❌ Error sincronizando venta ${venta.id}:`, error);
        result.errores.push({
          ventaId: venta.id,
          error: error.message
        });
      }
    }

    // 3. Sincronizar productos después de las ventas
    try {
      await syncProductos();
      result.productosSincronizados = true;
    } catch (error) {
      console.error('❌ Error sincronizando productos:', error);
      result.errores.push({
        tipo: 'productos',
        error: error.message
      });
    }

    // 4. Evaluar resultado
    if (result.errores.length === 0) {
      result.success = true;
      console.log(`✅ Sincronización completada: ${result.ventasSincronizadas} ventas`);
    } else {
      result.success = result.ventasSincronizadas > 0; // Parcialmente exitoso
      console.warn(`⚠️ Sincronización parcial: ${result.ventasSincronizadas}/${ventasPendientes.length} ventas`);
    }

  } catch (error) {
    console.error('❌ Error general en sincronización:', error);
    result.error = error.message;
  }

  return result;
};

/**
 * Sincronizar productos desde el servidor
 * @param {Function} onProgress - Callback opcional (current, total)
 */
export const syncProductos = async (onProgress = null) => {
  try {
    console.log('📥 Descargando productos del servidor...');
    
    let todosLosProductos = [];
    let skip = 0;
    const limit = 100; // Límite razonable por request
    let hasMore = true;
    let total = 0;

    // Descargar productos en lotes
    while (hasMore) {
      const response = await api.get('/productos/', {
        params: {
          skip: skip,
          limit: limit
        }
      });

      const { productos, has_more, total: totalProductos } = response.data;
      
      if (!productos || productos.length === 0) {
        break;
      }

      todosLosProductos = [...todosLosProductos, ...productos];
      hasMore = has_more;
      skip += limit;
      
      if (totalProductos) {
        total = totalProductos;
      }

      console.log(`📦 Descargados ${todosLosProductos.length} de ${total || '?'} productos...`);
      
      // Reportar progreso
      if (onProgress && total) {
        onProgress(todosLosProductos.length, total);
      }
    }

    if (todosLosProductos.length === 0) {
      console.warn('⚠️ No se recibieron productos del servidor');
      return false;
    }

    // Guardar en IndexedDB
    await saveProductos(todosLosProductos);
    console.log(`✅ ${todosLosProductos.length} productos sincronizados`);
    
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando productos:', error);
    throw error;
  }
};

/**
 * Forzar sincronización completa (manual)
 */
export const forceFullSync = async () => {
  console.log('🔄 Forzando sincronización completa...');
  
  try {
    // 1. Sincronizar ventas pendientes
    const ventasResult = await syncPendingData();
    
    // 2. Sincronizar productos frescos
    await syncProductos();
    
    return {
      success: true,
      ...ventasResult
    };
  } catch (error) {
    console.error('❌ Error en sincronización completa:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verificar si hay sincronización pendiente
 */
export const hasPendingSync = async () => {
  try {
    const ventasPendientes = await getVentasPendientes();
    return ventasPendientes.length > 0;
  } catch (error) {
    console.error('Error verificando sync pendiente:', error);
    return false;
  }
};

/**
 * Obtener estadísticas de sincronización
 */
export const getSyncStats = async () => {
  try {
    const ventasPendientes = await getVentasPendientes();
    const productos = await getAllProductos();
    
    return {
      ventasPendientes: ventasPendientes.length,
      productosEnCache: productos.length,
      ultimoProducto: productos[productos.length - 1]?.nombre || 'N/A'
    };
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    return {
      ventasPendientes: 0,
      productosEnCache: 0,
      ultimoProducto: 'Error'
    };
  }
};

export default {
  syncPendingData,
  syncProductos,
  forceFullSync,
  hasPendingSync,
  getSyncStats
};