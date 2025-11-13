from fastapi import APIRouter, HTTPException, Response
from app.schemas.item import Plant, PlantCreate, PlantUpdate

router = APIRouter()

# In-memory storage (replace with database in production)
plants_db = {}
plant_counter = 0


@router.get("/plants", response_model=list[Plant])
async def get_plants():
    """Get all plants."""
    return list(plants_db.values())


@router.get("/plants/{plant_id}", response_model=Plant)
async def get_plant(plant_id: int):
    """Get a specific plant by ID."""
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plants_db[plant_id]


@router.post("/plants", response_model=Plant, status_code=201)
async def create_plant(plant: PlantCreate):
    """Create a new plant."""
    global plant_counter
    plant_counter += 1
    new_plant = Plant(id=plant_counter, **plant.model_dump())
    plants_db[plant_counter] = new_plant
    return new_plant


@router.put("/plants/{plant_id}", response_model=Plant)
async def update_plant(plant_id: int, plant: PlantUpdate):
    """Update an existing plant."""
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="Plant not found")

    stored_plant = plants_db[plant_id]
    update_data = plant.model_dump(exclude_unset=True)
    updated_plant = stored_plant.model_copy(update=update_data)
    plants_db[plant_id] = updated_plant
    return updated_plant


@router.delete("/plants/{plant_id}")
async def delete_plant(plant_id: int):
    """Delete a plant."""
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="Plant not found")
    del plants_db[plant_id]
    return Response(status_code=204)
