from fastapi import APIRouter, HTTPException, Response
from app.schemas.item import Product, ProductCreate, ProductUpdate

router = APIRouter()

# In-memory storage (replace with database in production)
products_db = {}
product_counter = 0


@router.get("/products", response_model=list[Product])
async def get_products():
    """Get all products."""
    return list(products_db.values())


@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: int):
    """Get a specific product by ID."""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    return products_db[product_id]


@router.post("/products", response_model=Product, status_code=201)
async def create_product(product: ProductCreate):
    """Create a new product or update if product_id already exists."""
    global product_counter

    # Check if product with same product_id already exists
    for existing_id, existing_product in products_db.items():
        if existing_product.product_id == product.product_id:
            # Update existing product instead of creating duplicate
            updated_product = Product(id=existing_id, **product.model_dump())
            products_db[existing_id] = updated_product
            return updated_product

    # Create new product
    product_counter += 1
    new_product = Product(id=product_counter, **product.model_dump())
    products_db[product_counter] = new_product
    return new_product


@router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: int, product: ProductUpdate):
    """Update an existing product."""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")

    stored_product = products_db[product_id]
    update_data = product.model_dump(exclude_unset=True)
    updated_product = stored_product.model_copy(update=update_data)
    products_db[product_id] = updated_product
    return updated_product


@router.delete("/products/{product_id}")
async def delete_product(product_id: int):
    """Delete a product."""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    del products_db[product_id]
    return Response(status_code=204)
