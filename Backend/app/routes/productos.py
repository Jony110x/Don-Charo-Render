from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/productos", tags=["productos"])

@router.get("/", response_model=List[schemas.Producto])
def listar_productos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    productos = db.query(models.Producto).filter(
        models.Producto.activo == True
    ).offset(skip).limit(limit).all()
    return productos

@router.get("/buscar-codigo", response_model=schemas.ProductoBusqueda)
def buscar_por_codigo_barras(
    codigo: str = Query(..., description="Código de barras del producto"),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Busca un producto por su código de barras.
    Usado por el lector de código de barras del cajero.
    """
    producto = db.query(models.Producto).filter(
        models.Producto.codigo_barras == codigo,
        models.Producto.activo == True
    ).first()
    
    if not producto:
        raise HTTPException(
            status_code=404, 
            detail=f"Producto con código de barras '{codigo}' no encontrado"
        )
    
    if producto.stock <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"El producto '{producto.nombre}' no tiene stock disponible"
        )
    
    return producto

@router.get("/{producto_id}", response_model=schemas.Producto)
def obtener_producto(
    producto_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    producto = db.query(models.Producto).filter(
        models.Producto.id == producto_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@router.post("/", response_model=schemas.Producto)
def crear_producto(
    producto: schemas.ProductoCreate, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(["admin"]))
):
    # Verificar si el código de barras ya existe
    if producto.codigo_barras:
        existing = db.query(models.Producto).filter(
            models.Producto.codigo_barras == producto.codigo_barras
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un producto con ese código de barras"
            )
    
    db_producto = models.Producto(**producto.dict())
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto

@router.put("/{producto_id}", response_model=schemas.Producto)
def actualizar_producto(
    producto_id: int, 
    producto: schemas.ProductoUpdate, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(["admin"]))
):
    db_producto = db.query(models.Producto).filter(
        models.Producto.id == producto_id
    ).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Verificar código de barras único si se está actualizando
    if producto.codigo_barras:
        existing = db.query(models.Producto).filter(
            models.Producto.codigo_barras == producto.codigo_barras,
            models.Producto.id != producto_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro producto con ese código de barras"
            )
    
    update_data = producto.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_producto, key, value)
    
    db.commit()
    db.refresh(db_producto)
    return db_producto

@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_role(["admin"]))
):
    db_producto = db.query(models.Producto).filter(
        models.Producto.id == producto_id
    ).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_producto.activo = False
    db.commit()
    return {"message": "Producto eliminado correctamente"}

@router.get("/stock/bajo", response_model=List[schemas.Producto])
def productos_stock_bajo(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    productos = db.query(models.Producto).filter(
        models.Producto.stock < models.Producto.stock_minimo,
        models.Producto.activo == True
    ).all()
    return productos

@router.get("/stock/critico")
def productos_stock_critico(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtener productos con stock crítico (menos de 10 unidades)
    """
    productos = db.query(models.Producto).filter(
        models.Producto.stock < 10,
        models.Producto.activo == True
    ).order_by(models.Producto.stock.asc()).all()
    
    return productos