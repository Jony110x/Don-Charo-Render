import React, { useState } from 'react';
import { X } from 'lucide-react';

const ProductoForm = ({ producto, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    precio_costo: producto?.precio_costo || '',  // NUEVO
    precio_venta: producto?.precio_venta || '',  // CAMBIADO
    stock: producto?.stock || '',
    stock_minimo: producto?.stock_minimo || 10,
    categoria: producto?.categoria || '',
    codigo_barras: producto?.codigo_barras || ''
  });

  const margenGanancia = formData.precio_costo && formData.precio_venta
    ? (((formData.precio_venta - formData.precio_costo) / formData.precio_costo) * 100).toFixed(2)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (parseFloat(formData.precio_venta) <= parseFloat(formData.precio_costo)) {
      alert('El precio de venta debe ser mayor al precio de costo');
      return;
    }
    
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'precio_costo' || name === 'precio_venta' || name === 'stock' || name === 'stock_minimo' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button onClick={onClose} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="input"
                rows="3"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Precio de Costo *
                </label>
                <input
                  type="number"
                  name="precio_costo"
                  value={formData.precio_costo}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Precio de Venta *
                </label>
                <input
                  type="number"
                  name="precio_venta"
                  value={formData.precio_venta}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="input"
                />
              </div>
            </div>

            {/* Mostrar margen de ganancia */}
            {formData.precio_costo > 0 && formData.precio_venta > 0 && (
              <div style={{
                backgroundColor: margenGanancia > 0 ? '#d1fae5' : '#fee2e2',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: `2px solid ${margenGanancia > 0 ? '#86efac' : '#fca5a5'}`
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Margen de Ganancia: <span style={{ fontSize: '1.125rem' }}>{margenGanancia}%</span>
                </p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Ganancia por unidad: ${(formData.precio_venta - formData.precio_costo).toFixed(2)}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Stock *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  name="stock_minimo"
                  value={formData.stock_minimo}
                  onChange={handleChange}
                  min="0"
                  className="input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Categoría
                </label>
                <input
                  type="text"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Código de Barras
                </label>
                <input
                  type="text"
                  name="codigo_barras"
                  value={formData.codigo_barras}
                  onChange={handleChange}
                  className="input"
                  placeholder="7891234567890"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                {producto ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={onClose} className="btn" style={{ flex: 1, backgroundColor: '#6b7280', color: 'white' }}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductoForm;