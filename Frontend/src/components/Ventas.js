import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, ShoppingCart, Trash2, Scan, DollarSign, Banknote } from 'lucide-react';
import { getProductos, createVenta, buscarPorCodigo, getCotizaciones } from '../api/api';

const Ventas = () => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [loading, setLoading] = useState(true);
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('ARS');
  const [metodoPago, setMetodoPago] = useState('normal'); // 'normal' o 'efectivo'
  const [cotizaciones, setCotizaciones] = useState({ USD: 1, BRL: 1 });
  const codigoInputRef = useRef(null);

  useEffect(() => {
    cargarProductos();
    cargarCotizaciones();
    if (codigoInputRef.current) {
      codigoInputRef.current.focus();
    }
  }, []);

  const cargarCotizaciones = async () => {
    try {
      const rates = await getCotizaciones();
      setCotizaciones(rates);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await getProductos();
      setProductos(response.data.filter(p => p.stock > 0));
    } catch (error) {
      console.error('Error cargando productos:', error);
      alert('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const convertirPrecio = (precioARS) => {
    if (monedaSeleccionada === 'USD') {
      return precioARS * cotizaciones.USD;
    } else if (monedaSeleccionada === 'BRL') {
      return precioARS * cotizaciones.BRL;
    }
    return precioARS;
  };

  const calcularPrecioEfectivo = (precio) => {
    return precio * 0.92; // 8% de descuento
  };

  const getSimbolo = () => {
    if (monedaSeleccionada === 'USD') return 'US$';
    if (monedaSeleccionada === 'BRL') return 'R$';
    return '$';
  };

  const getPrecioFinal = (precio) => {
    const precioConvertido = convertirPrecio(precio);
    return metodoPago === 'efectivo' ? calcularPrecioEfectivo(precioConvertido) : precioConvertido;
  };

  const buscarProductoPorCodigo = async (codigo) => {
    if (!codigo || codigo.trim() === '') return;

    try {
      setBuscandoCodigo(true);
      const response = await buscarPorCodigo(codigo.trim());
      const producto = response.data;
      
      agregarAlCarrito({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        stock: producto.stock,
        categoria: producto.categoria
      });
      
      setCodigoBarras('');
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error buscando producto:', error);
      alert(error.response?.data?.detail || 'Producto no encontrado');
      setCodigoBarras('');
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const handleCodigoKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarProductoPorCodigo(codigoBarras);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.producto_id === producto.id);
    
    if (itemExistente) {
      if (itemExistente.cantidad >= producto.stock) {
        alert('No hay suficiente stock');
        return;
      }
      setCarrito(carrito.map(item =>
        item.producto_id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio_unitario: producto.precio_venta || producto.precio,
        cantidad: 1,
        stock_disponible: producto.stock
      }]);
    }
  };

  const modificarCantidad = (producto_id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(producto_id);
      return;
    }

    const item = carrito.find(i => i.producto_id === producto_id);
    if (nuevaCantidad > item.stock_disponible) {
      alert('No hay suficiente stock');
      return;
    }

    setCarrito(carrito.map(item =>
      item.producto_id === producto_id
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (producto_id) => {
    setCarrito(carrito.filter(item => item.producto_id !== producto_id));
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    try {
      const ventaData = {
        items: carrito.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        })),
        metodo_pago: metodoPago
      };

      await createVenta(ventaData);
      alert('Venta registrada exitosamente!');
      setCarrito([]);
      cargarProductos();
      
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error creando venta:', error);
      alert(error.response?.data?.detail || 'Error al registrar la venta');
    }
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (getPrecioFinal(item.precio_unitario) * item.cantidad), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <p>Cargando productos...</p>
      </div>
    );
  }

  // Solo mostrar productos si hay búsqueda
  const mostrarProductos = busqueda.length > 0 || codigoBarras.length > 0;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Panel de búsqueda */}
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Nueva Venta
          </h2>

          {/* Lector de Código de Barras */}
          <div style={{
            backgroundColor: '#dbeafe',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px solid #3b82f6',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Scan size={24} style={{ color: '#1e40af' }} />
              <label style={{ fontWeight: 600, color: '#1e40af' }}>
                Escanear Código de Barras
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={codigoInputRef}
                type="text"
                placeholder="Escanee o escriba el código..."
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyPress={handleCodigoKeyPress}
                disabled={buscandoCodigo}
                className="input"
                style={{ 
                  flex: 1,
                  fontSize: '1.125rem',
                  backgroundColor: 'white'
                }}
              />
              <button
                onClick={() => buscarProductoPorCodigo(codigoBarras)}
                disabled={buscandoCodigo || !codigoBarras.trim()}
                className="btn btn-primary"
                style={{ minWidth: '100px' }}
              >
                {buscandoCodigo ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#1e40af', marginTop: '0.5rem' }}>
              💡 Presione Enter después de escanear
            </p>
          </div>

          {/* Búsqueda manual */}
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px solid #e5e7eb',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} style={{ color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input"
                style={{ border: 'none', outline: 'none' }}
              />
            </div>
          </div>

          {/* Productos - Solo mostrar si hay búsqueda */}
          {!mostrarProductos ? (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <Search size={64} style={{ color: '#d1d5db', margin: '0 auto', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                Busque un producto para comenzar
              </h3>
              <p style={{ color: '#9ca3af' }}>
                Escanee un código de barras o busque por nombre
              </p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <p style={{ color: '#6b7280' }}>No se encontraron productos</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem',
              maxHeight: '500px',
              overflowY: 'auto'
            }}>
              {productosFiltrados.map(producto => {
                const precioNormal = convertirPrecio(producto.precio_venta);
                const precioEfectivo = calcularPrecioEfectivo(precioNormal);
                
                return (
                  <div
                    key={producto.id}
                    style={{
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      transition: 'border-color 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {producto.nombre}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {producto.categoria || 'Sin categoría'}
                      </p>
                      {producto.codigo_barras && (
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                          CB: {producto.codigo_barras}
                        </p>
                      )}
                    </div>

                    {/* Precios */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      {/* Precio Normal - GRANDE */}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <DollarSign size={20} style={{ color: '#1e40af' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af' }}>
                            PRECIO NORMAL
                          </span>
                        </div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e40af' }}>
                          {getSimbolo()} {precioNormal.toFixed(2)}
                        </div>
                      </div>
                      
                      {/* Precio Efectivo - CHICO */}
                      <div style={{
                        backgroundColor: '#d1fae5',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #86efac'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          <Banknote size={14} style={{ color: '#059669' }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                            Efectivo (8% OFF)
                          </span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#059669' }}>
                          {getSimbolo()} {precioEfectivo.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Stock: {producto.stock}
                      </span>
                      <button
                        onClick={() => agregarAlCarrito(producto)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                      >
                        <Plus size={16} />
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Carrito
          </h2>

          <div style={{
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '1rem'
          }}>
            {carrito.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af'
              }}>
                <ShoppingCart size={48} />
                <p style={{ marginTop: '1rem' }}>El carrito está vacío</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Agregue productos para comenzar
                </p>
              </div>
            ) : (
              <>
                {/* Selectores de Moneda y Método de Pago */}
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
                  {/* Selector de Moneda */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                      Moneda:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setMonedaSeleccionada('ARS')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: monedaSeleccionada === 'ARS' ? '#3b82f6' : '#e5e7eb',
                          color: monedaSeleccionada === 'ARS' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ARS $
                      </button>
                      <button
                        onClick={() => setMonedaSeleccionada('USD')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: monedaSeleccionada === 'USD' ? '#3b82f6' : '#e5e7eb',
                          color: monedaSeleccionada === 'USD' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        USD
                      </button>
                      <button
                        onClick={() => setMonedaSeleccionada('BRL')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: monedaSeleccionada === 'BRL' ? '#3b82f6' : '#e5e7eb',
                          color: monedaSeleccionada === 'BRL' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        BRL
                      </button>
                    </div>
                  </div>

                  {/* Selector de Método de Pago */}
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                      Método de Pago:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setMetodoPago('normal')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: metodoPago === 'normal' ? '#3b82f6' : '#e5e7eb',
                          color: metodoPago === 'normal' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <DollarSign size={18} />
                        Normal
                      </button>
                      <button
                        onClick={() => setMetodoPago('efectivo')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: metodoPago === 'efectivo' ? '#10b981' : '#e5e7eb',
                          color: metodoPago === 'efectivo' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Banknote size={18} />
                        Efectivo (-8%)
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, marginBottom: '1rem', overflowY: 'auto', maxHeight: '300px' }}>
                  {carrito.map(item => {
                    const precioFinal = getPrecioFinal(item.precio_unitario);
                    
                    return (
                      <div
                        key={item.producto_id}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          paddingBottom: '0.75rem',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.nombre}</h4>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {getSimbolo()}{precioFinal.toFixed(2)} c/u
                            </div>
                          </div>
                          <button
                            onClick={() => eliminarDelCarrito(item.producto_id)}
                            style={{
                              padding: '0.25rem',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444'
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => modificarCantidad(item.producto_id, item.cantidad - 1)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#e5e7eb',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 'bold', minWidth: '2rem', textAlign: 'center' }}>
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => modificarCantidad(item.producto_id, item.cantidad + 1)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#e5e7eb',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            +
                          </button>
                          <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
                            {getSimbolo()}{(precioFinal * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  backgroundColor: metodoPago === 'efectivo' ? '#d1fae5' : '#dbeafe',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${metodoPago === 'efectivo' ? '#86efac' : '#93c5fd'}`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>Total a pagar:</span>
                    <span style={{ 
                      fontSize: '1.875rem', 
                      fontWeight: 'bold', 
                      color: metodoPago === 'efectivo' ? '#059669' : '#1e40af' 
                    }}>
                      {getSimbolo()}{totalCarrito.toFixed(2)}
                    </span>
                  </div>
                  {metodoPago === 'efectivo' && (
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#059669', 
                      fontWeight: 600,
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}>
                      🎉 Ahorro por pagar en efectivo: {getSimbolo()}{(totalCarrito / 0.92 * 0.08).toFixed(2)}
                    </div>
                  )}
                  <button
                    onClick={finalizarVenta}
                    className="btn"
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      fontSize: '1.125rem',
                      backgroundColor: metodoPago === 'efectivo' ? '#10b981' : '#3b82f6',
                      color: 'white'
                    }}
                  >
                    Finalizar Venta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ventas;