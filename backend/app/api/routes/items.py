from fastapi import APIRouter, HTTPException
from app.schemas.item import Item, ItemCreate, ItemUpdate

router = APIRouter()

# In-memory storage (replace with database in production)
items_db = {}
item_counter = 0


@router.get("/items", response_model=list[Item])
async def get_items():
    """Get all items."""
    return list(items_db.values())


@router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: int):
    """Get a specific item by ID."""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return items_db[item_id]


@router.post("/items", response_model=Item, status_code=201)
async def create_item(item: ItemCreate):
    """Create a new item."""
    global item_counter
    item_counter += 1
    new_item = Item(id=item_counter, **item.model_dump())
    items_db[item_counter] = new_item
    return new_item


@router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: int, item: ItemUpdate):
    """Update an existing item."""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    stored_item = items_db[item_id]
    update_data = item.model_dump(exclude_unset=True)
    updated_item = stored_item.model_copy(update=update_data)
    items_db[item_id] = updated_item
    return updated_item


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: int):
    """Delete an item."""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    del items_db[item_id]
