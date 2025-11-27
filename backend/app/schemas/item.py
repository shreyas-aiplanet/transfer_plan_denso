from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


# ==================== PRODUCT SCHEMAS ====================

class ProductBase(BaseModel):
    """Base product schema with must-have fields."""
    product_id: str = Field(..., description="Unique product identifier (SKU)")
    monthly_demand: float = Field(..., gt=0, description="Forecasted demand (pcs/month)")
    current_unit_cost: float = Field(..., ge=0, description="Current production unit cost ($/unit)")
    current_plant_id: Optional[str] = Field(None, description="Current plant where product is manufactured")

    # Optional must-have fields
    unit_volume_or_weight: Optional[float] = Field(None, ge=0, description="Pcs per pallet or m³ per unit")

    # Optional data
    cycle_time_sec: Optional[float] = Field(None, ge=0, description="Cycle time (sec/unit)")
    required_machine_type: Optional[str] = Field(None, description="Required machine type")
    yield_rate: Optional[float] = Field(None, ge=0, le=100, description="Yield rate (%)")
    special_compliance_flag: Optional[bool] = Field(False, description="Requires FDA/ISO/cleanroom")
    batch_size: Optional[int] = Field(None, ge=0, description="Batch or lot size")
    monthly_demand_variability: Optional[float] = Field(None, ge=0, description="Demand standard deviation")


class ProductCreate(ProductBase):
    """Schema for creating a new product."""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    monthly_demand: Optional[float] = Field(None, gt=0)
    current_unit_cost: Optional[float] = Field(None, ge=0)
    current_plant_id: Optional[str] = None
    unit_volume_or_weight: Optional[float] = Field(None, ge=0)
    cycle_time_sec: Optional[float] = Field(None, ge=0)
    required_machine_type: Optional[str] = None
    yield_rate: Optional[float] = Field(None, ge=0, le=100)
    special_compliance_flag: Optional[bool] = None
    batch_size: Optional[int] = Field(None, ge=0)
    monthly_demand_variability: Optional[float] = Field(None, ge=0)


class Product(ProductBase):
    """Product schema with ID."""
    id: int

    class Config:
        from_attributes = True


# ==================== PLANT SCHEMAS ====================

class PlantBase(BaseModel):
    """Base plant schema with must-have fields."""
    plant_id: str = Field(..., description="Unique plant identifier")
    available_capacity: float = Field(..., gt=0, description="Maximum producible units (pcs/month)")
    unit_production_cost: float = Field(..., ge=0, description="Expected production cost ($/unit)")
    transfer_fixed_cost: float = Field(..., ge=0, description="One-time transfer cost ($)")

    # Optional must-have fields
    effective_oee: Optional[float] = Field(1.0, ge=0, le=1, description="Overall Equipment Effectiveness")
    lead_time_to_start: Optional[float] = Field(0, ge=0, description="Time to start production (months)")

    # Optional data
    available_area_m2: Optional[float] = Field(None, ge=0, description="Available floor area (m²)")
    area_required_per_product_m2: Optional[float] = Field(None, ge=0, description="Area per product (m²)")
    labor_skill_level: Optional[str] = Field(None, description="Required labor skill level")
    training_days_required: Optional[int] = Field(None, ge=0, description="Training days required")
    warehouse_capacity_pallets: Optional[float] = Field(None, ge=0, description="Warehouse capacity (pallets)")
    pallets_per_unit: Optional[float] = Field(None, ge=0, description="Pallets per unit")
    interplant_transport_cost_per_unit: Optional[float] = Field(None, ge=0, description="Transport cost ($/unit)")
    lead_time_days: Optional[int] = Field(None, ge=0, description="Transport lead time (days)")
    max_utilization_target: Optional[float] = Field(90, ge=0, le=100, description="Max utilization target (%)")
    setup_time_hours: Optional[float] = Field(None, ge=0, description="Setup time (hours)")
    changeover_cost: Optional[float] = Field(None, ge=0, description="Changeover cost ($)")
    risk_score: Optional[float] = Field(None, ge=0, le=1, description="Supply chain risk score (0-1)")
    probability_of_delay: Optional[float] = Field(None, ge=0, le=1, description="Probability of delay (0-1)")
    delay_cost_per_day: Optional[float] = Field(None, ge=0, description="Delay cost ($/day)")


class PlantCreate(PlantBase):
    """Schema for creating a new plant."""
    pass


class PlantUpdate(BaseModel):
    """Schema for updating a plant."""
    available_capacity: Optional[float] = Field(None, gt=0)
    unit_production_cost: Optional[float] = Field(None, ge=0)
    transfer_fixed_cost: Optional[float] = Field(None, ge=0)
    effective_oee: Optional[float] = Field(None, ge=0, le=1)
    lead_time_to_start: Optional[float] = Field(None, ge=0)
    available_area_m2: Optional[float] = Field(None, ge=0)
    area_required_per_product_m2: Optional[float] = Field(None, ge=0)
    labor_skill_level: Optional[str] = None
    training_days_required: Optional[int] = Field(None, ge=0)
    warehouse_capacity_pallets: Optional[float] = Field(None, ge=0)
    pallets_per_unit: Optional[float] = Field(None, ge=0)
    interplant_transport_cost_per_unit: Optional[float] = Field(None, ge=0)
    lead_time_days: Optional[int] = Field(None, ge=0)
    max_utilization_target: Optional[float] = Field(None, ge=0, le=100)
    setup_time_hours: Optional[float] = Field(None, ge=0)
    changeover_cost: Optional[float] = Field(None, ge=0)
    risk_score: Optional[float] = Field(None, ge=0, le=1)
    probability_of_delay: Optional[float] = Field(None, ge=0, le=1)
    delay_cost_per_day: Optional[float] = Field(None, ge=0)


class Plant(PlantBase):
    """Plant schema with ID."""
    id: int

    class Config:
        from_attributes = True


# ==================== TRANSFER PLAN SCHEMAS ====================

class TransferPlanConfig(BaseModel):
    """Configuration for transfer plan optimization."""
    budget_capital: Optional[float] = Field(None, ge=0, description="Maximum one-time spend allowed ($)")
    transfer_deadline: Optional[date] = Field(None, description="Transfer deadline date")
    discount_rate: Optional[float] = Field(None, ge=0, le=1, description="Discount rate for NPV")
    objective_function: str = Field(
        "minimize_cost",
        description="Optimization objective: minimize_cost, minimize_time, balance_utilization, multi_objective"
    )
    allow_fractional_assignment: bool = Field(
        False,
        description="Allow splitting production across plants"
    )
    excluded_products: List[str] = Field(
        default_factory=list,
        description="Product IDs to exclude from transfer (keep at current plant)"
    )
    excluded_plants: List[str] = Field(
        default_factory=list,
        description="Plant IDs to exclude from optimization (no transfers to/from)"
    )


class TransferAssignment(BaseModel):
    """Single transfer assignment result."""
    product_id: str
    source_plant_id: Optional[str] = Field(None, description="Current plant (source)")
    target_plant_id: str = Field(..., description="Recommended plant (target)")
    assigned_volume: float = Field(..., ge=0, description="Units assigned (pcs/month)")
    utilization: float = Field(..., ge=0, le=100, description="Plant utilization (%)")
    total_cost: float = Field(..., ge=0, description="Total cost for this assignment ($)")
    transfer_cost: float = Field(..., ge=0, description="One-time transfer cost ($)")
    monthly_production_cost: float = Field(..., ge=0, description="Monthly production cost ($)")
    start_month: Optional[int] = Field(None, description="Start month")


class TransferPlanResult(BaseModel):
    """Transfer plan recommendation result."""
    assignments: list[TransferAssignment]
    total_transfer_cost: float = Field(..., ge=0, description="Total one-time transfer cost ($)")
    total_monthly_cost: float = Field(..., ge=0, description="Total monthly production cost ($)")
    total_cost: float = Field(..., ge=0, description="Total cost ($)")
    average_utilization: float = Field(..., ge=0, le=100, description="Average plant utilization (%)")
    feasible: bool = Field(..., description="Whether plan is feasible")
    constraints_violated: list[str] = Field(default_factory=list, description="List of violated constraints")
    optimization_time_seconds: Optional[float] = None
