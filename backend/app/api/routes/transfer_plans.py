from fastapi import APIRouter, HTTPException
from app.schemas.item import TransferPlanConfig, TransferPlanResult, TransferAssignment
from app.api.routes.products import products_db
from app.api.routes.plants import plants_db
import time
from pulp import LpProblem, LpMinimize, LpVariable, lpSum, LpStatus, LpStatusOptimal, LpStatusInfeasible, LpStatusUnbounded, LpStatusNotSolved, PULP_CBC_CMD, value

router = APIRouter()


@router.post("/transfer-plan/generate", response_model=TransferPlanResult)
async def generate_transfer_plan(config: TransferPlanConfig):
    """
    Generate a transfer plan recommendation using MILP/LP optimization.

    Uses PuLP library to solve the optimization problem with:
    - Binary assignment variables (MILP) or continuous (LP) based on config
    - Demand satisfaction constraints
    - Capacity constraints
    - Optional budget constraints
    - Multiple objective functions (cost minimization, utilization balancing)

    Performance Optimizations:
    - Pre-filters infeasible product-plant pairs to reduce problem size
    - Uses CBC solver with multi-threading and aggressive strategies
    - Caches lookup dictionaries for O(1) access
    - Minimizes constraint generation to only feasible assignments
    - 30-second time limit with heuristics for large problems
    """
    start_time = time.time()

    if not products_db:
        raise HTTPException(status_code=400, detail="No products available. Please add products first.")

    if not plants_db:
        raise HTTPException(status_code=400, detail="No plants available. Please add plants first.")

    products = list(products_db.values())
    plants = list(plants_db.values())

    # Validate that all products have current plant assignments
    products_without_plants = [p.product_id for p in products if not p.current_plant_id]
    if products_without_plants:
        raise HTTPException(
            status_code=400,
            detail=f"The following products must be assigned to a current plant before optimization: {', '.join(products_without_plants)}"
        )

    # Get exclusion lists from config
    excluded_product_ids = set(config.excluded_products or [])
    excluded_plant_ids = set(config.excluded_plants or [])

    # Filter out excluded plants from the optimization
    available_plants = [t for t in plants if t.plant_id not in excluded_plant_ids]

    # Create lookup for plant_id -> plant object
    plant_by_plant_id = {t.plant_id: t for t in plants}

    # Create the optimization problem
    if config.objective_function == "minimize_cost":
        prob = LpProblem("Transfer_Plan_Cost_Minimization", LpMinimize)
    elif config.objective_function == "balance_utilization":
        prob = LpProblem("Transfer_Plan_Utilization_Balance", LpMinimize)
    else:
        prob = LpProblem("Transfer_Plan_Optimization", LpMinimize)

    # Pre-filter feasible assignments to reduce problem size
    # Only create variables for product-plant pairs where the product can fit
    feasible_pairs = []
    for p in products:
        # Check if product is excluded from transfer
        if p.product_id in excluded_product_ids:
            # Excluded product: can only stay at current plant
            current_plant = plant_by_plant_id.get(p.current_plant_id)
            if current_plant and current_plant.plant_id not in excluded_plant_ids:
                effective_capacity = current_plant.available_capacity * (current_plant.effective_oee or 1.0)
                if p.monthly_demand <= effective_capacity:
                    feasible_pairs.append((p.id, current_plant.id))
        else:
            # Normal product: can go to any available plant
            for t in available_plants:
                effective_capacity = t.available_capacity * (t.effective_oee or 1.0)
                # Only consider assignments where product demand fits in plant capacity
                if p.monthly_demand <= effective_capacity:
                    feasible_pairs.append((p.id, t.id))

    # Calculate problem size reduction
    total_possible = len(products) * len(plants)
    reduction_pct = ((total_possible - len(feasible_pairs)) / total_possible * 100) if total_possible > 0 else 0

    # Decision Variables
    # x[p, t] = volume of product p assigned to plant t
    if config.allow_fractional_assignment:
        # LP: Continuous variables (allow splitting production)
        x = LpVariable.dicts("assign",
                           feasible_pairs,
                           lowBound=0,
                           cat='Continuous')
    else:
        # MILP: Binary assignment (all or nothing)
        # We'll use a workaround: binary y variables + volume x variables
        y = LpVariable.dicts("transfer",
                           feasible_pairs,
                           cat='Binary')
        x = LpVariable.dicts("volume",
                           feasible_pairs,
                           lowBound=0,
                           cat='Continuous')

    # Create lookup dictionaries for faster access
    product_dict = {p.id: p for p in products}
    plant_dict = {t.id: t for t in plants}

    # Objective Function: Minimize Total Cost
    if config.objective_function == "minimize_cost":
        # Total cost = transfer costs + monthly production costs
        if config.allow_fractional_assignment:
            # For fractional: Simplified - just minimize production costs
            # (Transfer costs are relatively fixed, focus on variable costs)
            prob += (
                lpSum([
                    x[product_id, plant_id] * plant_dict[plant_id].unit_production_cost
                    for product_id, plant_id in feasible_pairs
                ]),
                "Total_Cost"
            )
        else:
            # For binary: fixed transfer cost per assignment
            prob += (
                lpSum([
                    y[product_id, plant_id] * plant_dict[plant_id].transfer_fixed_cost
                    + x[product_id, plant_id] * plant_dict[plant_id].unit_production_cost
                    for product_id, plant_id in feasible_pairs
                ]),
                "Total_Cost"
            )

    elif config.objective_function == "balance_utilization":
        # Minimize maximum utilization across plants
        max_util = LpVariable("max_utilization", lowBound=0, upBound=100)
        for plant in plants:
            effective_capacity = plant.available_capacity * (plant.effective_oee or 1.0)
            if effective_capacity > 0:
                # Only sum over feasible pairs for this plant
                plant_pairs = [(p_id, t_id) for p_id, t_id in feasible_pairs if t_id == plant.id]
                if plant_pairs:
                    utilization = lpSum([x[p_id, t_id] for p_id, t_id in plant_pairs]) / effective_capacity * 100
                    prob += (max_util >= utilization, f"MaxUtil_{plant.id}_{plant.plant_id}")
        prob += max_util, "Minimize_Max_Utilization"

    # Constraint 1: Demand Satisfaction
    # Sum of assignments for each product must equal its demand
    for product in products:
        # Only sum over feasible pairs for this product
        product_pairs = [(p_id, t_id) for p_id, t_id in feasible_pairs if p_id == product.id]
        if product_pairs:
            prob += (
                lpSum([x[p_id, t_id] for p_id, t_id in product_pairs]) == product.monthly_demand,
                f"Demand_{product.id}_{product.product_id}"
            )

    # Constraint 2: Capacity Constraints
    # Total production at each plant must not exceed its effective capacity
    for plant in plants:
        effective_capacity = plant.available_capacity * (plant.effective_oee or 1.0)
        # Only sum over feasible pairs for this plant
        plant_pairs = [(p_id, t_id) for p_id, t_id in feasible_pairs if t_id == plant.id]
        if plant_pairs:
            prob += (
                lpSum([x[p_id, t_id] for p_id, t_id in plant_pairs]) <= effective_capacity,
                f"Capacity_{plant.id}_{plant.plant_id}"
            )

    # Constraint 3: Binary assignment activation (only for MILP)
    if not config.allow_fractional_assignment:
        for product_id, plant_id in feasible_pairs:
            product = product_dict[product_id]
            plant = plant_dict[plant_id]
            # x can only be non-zero if y is 1
            prob += (
                x[product_id, plant_id] <= product.monthly_demand * y[product_id, plant_id],
                f"Activation_{product_id}_{plant_id}"
            )

    # Constraint 4: Budget constraint (optional)
    # For simplicity, budget constraint only applies to binary mode
    if config.budget_capital and not config.allow_fractional_assignment:
        prob += (
            lpSum([
                y[product_id, plant_id] * plant_dict[plant_id].transfer_fixed_cost
                for product_id, plant_id in feasible_pairs
            ]) <= config.budget_capital,
            "Budget_Constraint"
        )

    # Solve the problem with CBC solver
    # Use simple settings to avoid solver hanging issues
    solver = PULP_CBC_CMD(
        msg=0,              # Silent mode
        timeLimit=10,       # 10 second time limit
        gapRel=0.01         # Accept solutions within 1% of optimal
    )

    # Solve the problem
    prob.solve(solver)

    # Log solver status for debugging
    print(f"Solver status: {LpStatus[prob.status]}")
    print(f"Optimization time: {time.time() - start_time:.2f}s")

    # Extract results
    assignments = []
    total_transfer_cost = 0
    total_monthly_cost = 0
    constraints_violated = []

    # Accept both optimal and near-optimal solutions (solver might timeout but find good solution)
    if prob.status == LpStatusOptimal or (prob.status == LpStatusNotSolved and value(prob.objective) is not None):
        feasible = True

        if prob.status == LpStatusNotSolved:
            constraints_violated.append("Solver timed out - returning best solution found (may be sub-optimal)")

        # Calculate plant utilizations once
        plant_utilizations = {}
        for plant in plants:
            effective_capacity = plant.available_capacity * (plant.effective_oee or 1.0)
            plant_pairs = [(p_id, t_id) for p_id, t_id in feasible_pairs if t_id == plant.id]
            plant_total_volume = sum([value(x[p_id, t_id]) or 0 for p_id, t_id in plant_pairs])
            plant_utilizations[plant.id] = (plant_total_volume / effective_capacity * 100) if effective_capacity > 0 else 0

        # Extract assignments - only iterate over feasible pairs
        for product_id, plant_id in feasible_pairs:
            try:
                volume = value(x[product_id, plant_id])
            except:
                volume = None

            if volume and volume > 0.01:  # Threshold for numerical precision
                product = product_dict[product_id]
                plant = plant_dict[plant_id]

                # Calculate costs
                # Check if this is a transfer (different plant) or staying at same plant
                is_transfer = product.current_plant_id != plant.plant_id

                if config.allow_fractional_assignment:
                    # For fractional: proportional transfer cost
                    transfer_cost = plant.transfer_fixed_cost * (volume / product.monthly_demand) if is_transfer else 0
                else:
                    # For binary: full transfer cost if assigned
                    try:
                        is_assigned = value(y[product_id, plant_id]) > 0.5
                    except:
                        is_assigned = False
                    transfer_cost = plant.transfer_fixed_cost if (is_assigned and is_transfer) else 0

                monthly_cost = volume * plant.unit_production_cost

                assignment = TransferAssignment(
                    product_id=product.product_id,
                    source_plant_id=product.current_plant_id,
                    target_plant_id=plant.plant_id,
                    assigned_volume=round(volume, 2),
                    utilization=round(plant_utilizations[plant.id], 2),
                    total_cost=round(transfer_cost + monthly_cost, 2),
                    transfer_cost=round(transfer_cost, 2),
                    monthly_production_cost=round(monthly_cost, 2),
                    start_month=int(plant.lead_time_to_start) if plant.lead_time_to_start else 0
                )
                assignments.append(assignment)
                total_transfer_cost += transfer_cost
                total_monthly_cost += monthly_cost

    else:
        feasible = False
        if prob.status == LpStatusInfeasible:
            constraints_violated.append("Problem is infeasible - no solution satisfies all constraints")
        elif prob.status == LpStatusUnbounded:
            constraints_violated.append("Problem is unbounded")
        elif prob.status == LpStatusNotSolved:
            constraints_violated.append("Solver timed out without finding any solution")
        else:
            constraints_violated.append(f"Solver status: {LpStatus[prob.status]}")

    # Calculate average utilization
    if assignments:
        # Group by plant to get unique utilizations
        plant_utilizations = {}
        for a in assignments:
            plant_utilizations[a.target_plant_id] = a.utilization
        avg_utilization = sum(plant_utilizations.values()) / len(plant_utilizations)
    else:
        avg_utilization = 0

    optimization_time = time.time() - start_time

    result = TransferPlanResult(
        assignments=assignments,
        total_transfer_cost=round(total_transfer_cost, 2),
        total_monthly_cost=round(total_monthly_cost, 2),
        total_cost=round(total_transfer_cost + total_monthly_cost, 2),
        average_utilization=round(avg_utilization, 2),
        feasible=feasible,
        constraints_violated=constraints_violated,
        optimization_time_seconds=round(optimization_time, 3)
    )

    return result


@router.get("/transfer-plan/status")
async def get_transfer_plan_status():
    """Get current status of products and plants for transfer planning."""
    return {
        "products_count": len(products_db),
        "plants_count": len(plants_db),
        "ready_for_optimization": len(products_db) > 0 and len(plants_db) > 0
    }


@router.post("/transfer-plan/load-example-data")
async def load_example_data():
    """
    Load example data for demonstration purposes.

    Creates realistic automotive manufacturing example data:
    - 5 Products (automotive components)
    - 3 Plants (Japan, Thailand, Mexico)

    Based on the PDF requirements with realistic values.
    """
    from app.schemas.item import Product, Plant
    from app.api.routes.products import products_db, product_counter
    from app.api.routes.plants import plants_db, plant_counter

    global product_counter, plant_counter

    # Clear existing data
    products_db.clear()
    plants_db.clear()

    # Reset counters
    product_counter = 0
    plant_counter = 0

    # Example Products (Automotive Components)
    # Mix of high-value precision parts, mid-range components, and high-volume consumables
    example_products = [
        # High-value precision components (currently at Japan - high cost)
        {
            "product_id": "FUEL-PUMP-FP100",
            "monthly_demand": 18000,
            "current_unit_cost": 45.00,
            "current_plant_id": "PLANT-JP-TOKYO",
            "unit_volume_or_weight": 2.5,
            "cycle_time_sec": 120,
            "yield_rate": 98.5,
            "special_compliance_flag": False,
            "batch_size": 50
        },
        {
            "product_id": "INJECTOR-INJ200",
            "monthly_demand": 22000,
            "current_unit_cost": 32.50,
            "current_plant_id": "PLANT-JP-TOKYO",
            "unit_volume_or_weight": 1.2,
            "cycle_time_sec": 90,
            "yield_rate": 99.2,
            "special_compliance_flag": True,
            "batch_size": 100
        },
        {
            "product_id": "TURBO-CHG300",
            "monthly_demand": 12000,
            "current_unit_cost": 85.00,
            "current_plant_id": "PLANT-JP-TOKYO",
            "unit_volume_or_weight": 5.0,
            "cycle_time_sec": 180,
            "yield_rate": 96.5,
            "special_compliance_flag": True,
            "batch_size": 30
        },
        # Mid-range sensors and actuators (currently at USA/Mexico)
        {
            "product_id": "SENSOR-OXY400",
            "monthly_demand": 28000,
            "current_unit_cost": 28.00,
            "current_plant_id": "PLANT-US-MICHIGAN",
            "unit_volume_or_weight": 0.8,
            "cycle_time_sec": 75,
            "yield_rate": 97.5,
            "special_compliance_flag": True,
            "batch_size": 200
        },
        {
            "product_id": "ACTUATOR-ACT500",
            "monthly_demand": 25000,
            "current_unit_cost": 38.00,
            "current_plant_id": "PLANT-MX-MONTERREY",
            "unit_volume_or_weight": 2.0,
            "cycle_time_sec": 110,
            "yield_rate": 98.0,
            "special_compliance_flag": False,
            "batch_size": 60
        },
        {
            "product_id": "VALVE-EGR600",
            "monthly_demand": 20000,
            "current_unit_cost": 42.00,
            "current_plant_id": "PLANT-US-MICHIGAN",
            "unit_volume_or_weight": 3.0,
            "cycle_time_sec": 130,
            "yield_rate": 97.0,
            "special_compliance_flag": False,
            "batch_size": 45
        },
        # High-volume electrical components (currently at Thailand/Mexico)
        {
            "product_id": "RELAY-PWR700",
            "monthly_demand": 35000,
            "current_unit_cost": 12.00,
            "current_plant_id": "PLANT-TH-BANGKOK",
            "unit_volume_or_weight": 0.3,
            "cycle_time_sec": 45,
            "yield_rate": 99.0,
            "special_compliance_flag": False,
            "batch_size": 250
        },
        {
            "product_id": "SWITCH-TMP800",
            "monthly_demand": 40000,
            "current_unit_cost": 8.50,
            "current_plant_id": "PLANT-TH-BANGKOK",
            "unit_volume_or_weight": 0.2,
            "cycle_time_sec": 35,
            "yield_rate": 99.5,
            "special_compliance_flag": False,
            "batch_size": 400
        },
        {
            "product_id": "CONNECTOR-ELC900",
            "monthly_demand": 50000,
            "current_unit_cost": 5.50,
            "current_plant_id": "PLANT-MX-MONTERREY",
            "unit_volume_or_weight": 0.1,
            "cycle_time_sec": 25,
            "yield_rate": 99.8,
            "special_compliance_flag": False,
            "batch_size": 500
        },
        # Medium-volume mechanical parts (mixed locations)
        {
            "product_id": "GASKET-EXH1000",
            "monthly_demand": 32000,
            "current_unit_cost": 6.00,
            "current_plant_id": "PLANT-TH-BANGKOK",
            "unit_volume_or_weight": 0.2,
            "cycle_time_sec": 30,
            "yield_rate": 99.7,
            "special_compliance_flag": False,
            "batch_size": 400
        },
        {
            "product_id": "FILTER-AIR1100",
            "monthly_demand": 38000,
            "current_unit_cost": 15.00,
            "current_plant_id": "PLANT-MX-MONTERREY",
            "unit_volume_or_weight": 1.0,
            "cycle_time_sec": 55,
            "yield_rate": 99.3,
            "special_compliance_flag": False,
            "batch_size": 150
        },
        {
            "product_id": "BEARING-WHL1200",
            "monthly_demand": 16000,
            "current_unit_cost": 58.00,
            "current_plant_id": "PLANT-JP-TOKYO",
            "unit_volume_or_weight": 2.8,
            "cycle_time_sec": 140,
            "yield_rate": 97.2,
            "special_compliance_flag": True,
            "batch_size": 40
        }
    ]

    # Example Plants
    # Total demand: 336,000 pcs/month
    # Total effective capacity: 375,400 pcs/month (11.7% buffer to ensure feasibility)
    example_plants = [
        {
            "plant_id": "PLANT-JP-TOKYO",
            "available_capacity": 90000,
            "unit_production_cost": 30.00,
            "transfer_fixed_cost": 80000,
            "effective_oee": 0.92,
            "lead_time_to_start": 2,
            "available_area_m2": 7500,
            "labor_skill_level": "High",
            "training_days_required": 10,
            "warehouse_capacity_pallets": 800,
            "max_utilization_target": 90,
            "risk_score": 0.15
        },
        {
            "plant_id": "PLANT-TH-BANGKOK",
            "available_capacity": 120000,
            "unit_production_cost": 19.00,
            "transfer_fixed_cost": 45000,
            "effective_oee": 0.88,
            "lead_time_to_start": 3,
            "available_area_m2": 10000,
            "labor_skill_level": "Medium",
            "training_days_required": 15,
            "warehouse_capacity_pallets": 1000,
            "max_utilization_target": 85,
            "risk_score": 0.25
        },
        {
            "plant_id": "PLANT-MX-MONTERREY",
            "available_capacity": 130000,
            "unit_production_cost": 24.00,
            "transfer_fixed_cost": 55000,
            "effective_oee": 0.85,
            "lead_time_to_start": 4,
            "available_area_m2": 9500,
            "labor_skill_level": "Medium",
            "training_days_required": 20,
            "warehouse_capacity_pallets": 950,
            "max_utilization_target": 88,
            "risk_score": 0.30
        },
        {
            "plant_id": "PLANT-US-MICHIGAN",
            "available_capacity": 85000,
            "unit_production_cost": 32.00,
            "transfer_fixed_cost": 75000,
            "effective_oee": 0.90,
            "lead_time_to_start": 2,
            "available_area_m2": 7000,
            "labor_skill_level": "High",
            "training_days_required": 12,
            "warehouse_capacity_pallets": 750,
            "max_utilization_target": 88,
            "risk_score": 0.18
        }
    ]

    # Add products
    for prod_data in example_products:
        product_counter += 1
        new_product = Product(id=product_counter, **prod_data)
        products_db[product_counter] = new_product

    # Add plants
    for plant_data in example_plants:
        plant_counter += 1
        new_plant = Plant(id=plant_counter, **plant_data)
        plants_db[plant_counter] = new_plant

    return {
        "message": "Example data loaded successfully",
        "products_added": len(example_products),
        "plants_added": len(example_plants),
        "total_monthly_demand": sum(p["monthly_demand"] for p in example_products),
        "total_available_capacity": sum(p["available_capacity"] * p["effective_oee"] for p in example_plants)
    }
