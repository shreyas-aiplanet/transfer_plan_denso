# Denso Transfer Plan Recommendation System

An intelligent web application for automotive manufacturing transfer plan optimization using FastAPI backend and MILP/LP optimization algorithms.

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py       # Health check endpoint
│   │   │       └── items.py        # Items CRUD endpoints
│   │   ├── core/
│   │   │   └── config.py           # Application configuration
│   │   ├── models/                 # Database models (SQLAlchemy)
│   │   ├── schemas/
│   │   │   └── item.py             # Pydantic schemas
│   │   ├── services/               # Business logic
│   │   └── main.py                 # FastAPI application entry point
│   ├── requirements.txt            # Python dependencies
│   └── .env.example               # Environment variables example
├── frontend/
│   ├── public/
│   │   └── index.html             # Main HTML file
│   └── src/
│       ├── app.js                 # JavaScript application logic
│       └── styles/
│           └── main.css           # CSS styles
└── README.md
```

## Features

### Backend (FastAPI)
- **MILP/LP Optimization**: Uses PuLP library with CBC solver for transfer plan optimization
- **Multiple Objective Functions**:
  - Minimize Total Cost
  - Minimize Time-to-Production
  - Balance Plant Utilization
  - Multi-objective optimization
- **Constraint Handling**:
  - Demand satisfaction constraints
  - Plant capacity constraints with OEE factors
  - Budget constraints (optional)
  - Binary assignment (MILP) or fractional assignment (LP)
- **RESTful API** with comprehensive endpoints for products, plants, and transfer plans
- **Example Data Loader**: Realistic automotive manufacturing sample data
- **Pydantic Validation**: Complete data validation with 40+ product/plant parameters

### Frontend (Vanilla JavaScript)
- **Modern UI**: Clean, responsive interface with Denso branding (#10A958)
- **Tab Navigation**: Products, Plants, Transfer Plan Generation, Results
- **Real-time Optimization**: Visual feedback during MILP/LP solving
- **Results Visualization**:
  - Summary cards with key metrics
  - Detailed assignment tables
  - Constraint violation reporting
- **Full CRUD Operations**: Manage products and plants with ease

## Prerequisites

- Python 3.8+
- pip (Python package manager)

## Quick Start

1. **Install dependencies**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. **Start the backend**:
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Open the frontend**:
   - Open `frontend/public/index.html` in your browser
   - Or serve it: `cd frontend/public && python -m http.server 8080`

4. **Load example data**:
   - Click "Load Example Data" button on the Products tab
   - This loads 12 automotive products and 4 global manufacturing plants

5. **Generate optimization**:
   - Configure budget/deadline (optional)
   - Select objective function (Minimize Cost, Balance Utilization, etc.)
   - Toggle fractional assignment for LP vs MILP
   - Click "Generate Transfer Plan"

## Backend Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv venv
```

### 2. Activate the virtual environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
# Edit .env file with your configuration
```

### 5. Run the application

```bash
# From the backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive API docs (Swagger): http://localhost:8000/docs
- Alternative API docs (ReDoc): http://localhost:8000/redoc

## Frontend Setup

The frontend is a simple static HTML/CSS/JavaScript application.

### 1. Open the frontend

Simply open `frontend/public/index.html` in your web browser.

**Or use a simple HTTP server:**

```bash
# Using Python
cd frontend/public
python -m http.server 8080
```

Then visit: http://localhost:8080

### 2. Update API URL if needed

Edit `frontend/src/app.js` and update the `API_BASE_URL` constant if your backend is running on a different address.

## API Endpoints

### Health Check
- `GET /api/v1/health` - Check API health status

### Products
- `GET /api/v1/products` - Get all products
- `GET /api/v1/products/{product_id}` - Get a specific product
- `POST /api/v1/products` - Create a new product
- `PUT /api/v1/products/{product_id}` - Update a product
- `DELETE /api/v1/products/{product_id}` - Delete a product

### Plants
- `GET /api/v1/plants` - Get all plants
- `GET /api/v1/plants/{plant_id}` - Get a specific plant
- `POST /api/v1/plants` - Create a new plant
- `PUT /api/v1/plants/{plant_id}` - Update a plant
- `DELETE /api/v1/plants/{plant_id}` - Delete a plant

### Transfer Plans
- `POST /api/v1/transfer-plan/generate` - Generate optimized transfer plan
- `GET /api/v1/transfer-plan/status` - Get optimization readiness status
- `POST /api/v1/transfer-plan/load-example-data` - Load example automotive data

## Optimization Algorithm

### MILP (Mixed-Integer Linear Programming)

When **fractional assignment is disabled** (default):
- Uses **binary variables** for product-plant assignments
- Each product is assigned to exactly one plant (no splitting)
- Suitable for scenarios where production cannot be divided

**Decision Variables:**
- `y[p,t]` ∈ {0,1}: Binary - whether product p is assigned to plant t
- `x[p,t]` ≥ 0: Continuous - volume of product p at plant t

**Objective:** Minimize total cost
```
minimize Σ(y[p,t] * transfer_cost[t] + x[p,t] * unit_cost[t])
```

**Key Constraints:**
- Demand satisfaction: Σ x[p,t] = demand[p] for all products p
- Capacity: Σ x[p,t] ≤ capacity[t] * OEE[t] for all plants t
- Activation: x[p,t] ≤ demand[p] * y[p,t] (volume only if assigned)
- Budget (optional): Σ y[p,t] * transfer_cost[t] ≤ budget

### LP (Linear Programming)

When **fractional assignment is enabled**:
- Uses **continuous variables** only
- Production can be split across multiple plants
- More flexible, often faster to solve

**Decision Variables:**
- `x[p,t]` ≥ 0: Continuous - volume of product p at plant t

**Objective & Constraints:** Similar to MILP but without binary restrictions

### Solver

- **PuLP Library**: Open-source Python optimization framework
- **CBC Solver**: COIN-OR Branch and Cut solver (included with PuLP)
- Solves problems in milliseconds for typical datasets

## Example Data

The system includes realistic automotive manufacturing data representing a global supply chain optimization scenario:

### Products (12 components):

**High-Value Precision Parts** (currently at Japan/USA - high cost locations):
1. **FUEL-PUMP-FP100**: 18,000 pcs/month, $45/unit
2. **INJECTOR-INJ200**: 22,000 pcs/month, $32.50/unit (compliance required)
3. **TURBO-CHG300**: 12,000 pcs/month, $85/unit (compliance required)
4. **BEARING-WHL1200**: 16,000 pcs/month, $58/unit (compliance required)

**Mid-Range Components** (currently at USA/Mexico - mixed locations):
5. **SENSOR-OXY400**: 28,000 pcs/month, $28/unit (compliance required)
6. **ACTUATOR-ACT500**: 25,000 pcs/month, $38/unit
7. **VALVE-EGR600**: 20,000 pcs/month, $42/unit

**High-Volume Parts** (currently at Thailand/Mexico - lower cost locations):
8. **RELAY-PWR700**: 35,000 pcs/month, $12/unit
9. **SWITCH-TMP800**: 40,000 pcs/month, $8.50/unit
10. **CONNECTOR-ELC900**: 50,000 pcs/month, $5.50/unit
11. **GASKET-EXH1000**: 32,000 pcs/month, $6/unit
12. **FILTER-AIR1100**: 38,000 pcs/month, $15/unit

**Total Demand:** 336,000 pcs/month
**Current Monthly Cost:** $8,321,000/month

### Plants (4 global facilities):

1. **PLANT-JP-TOKYO** (Japan): 90,000 pcs/month, **$30/unit**, OEE 92% → 82,800 effective
   - Transfer cost: $80,000 | Lead time: 2 months | Risk: 0.15 (low)
   - High quality, high cost, specialized for precision parts

2. **PLANT-TH-BANGKOK** (Thailand): 120,000 pcs/month, **$19/unit**, OEE 88% → 105,600 effective
   - Transfer cost: $45,000 | Lead time: 3 months | Risk: 0.25 (medium)
   - **Lowest production cost**, large capacity, good for high-volume parts

3. **PLANT-MX-MONTERREY** (Mexico): 130,000 pcs/month, **$24/unit**, OEE 85% → 110,500 effective
   - Transfer cost: $55,000 | Lead time: 4 months | Risk: 0.30 (medium)
   - Medium cost, largest capacity, balanced capabilities

4. **PLANT-US-MICHIGAN** (USA): 85,000 pcs/month, **$32/unit**, OEE 90% → 76,500 effective
   - Transfer cost: $75,000 | Lead time: 2 months | Risk: 0.18 (low)
   - **Highest production cost**, high quality, quick lead time

**Total Effective Capacity:** 375,400 pcs/month (11.7% buffer ensures feasibility)

### Optimization Potential:

**Current State:**
- Monthly cost: $8,321,000
- Products distributed across all 4 plants

**Optimized State:**
- Potential monthly cost: ~$6,384,000 (moving all to Thailand)
- **Potential savings: $1,937,000/month (23.3%)**
- **Annual savings: $23.2 million/year**

The optimizer balances:
- **Cost differences**: Thailand ($19) vs USA ($32) = 68% more expensive
- **Transfer costs**: $45K-$80K one-time investment
- **Risk factors**: Low-risk plants (Japan, USA) vs cost efficiency
- **Capacity constraints**: Must respect plant capacities and OEE
- **Lead times**: 2-4 months to start production
- **Compliance requirements**: Some products need special handling

## Development

### Backend Development

The application uses `uvicorn` with the `--reload` flag, which automatically restarts the server when code changes are detected.

### Adding New Routes

1. Create a new route file in `backend/app/api/routes/`
2. Define your routes using FastAPI's router
3. Import and include the router in `backend/app/main.py`

### Adding Database Support

1. Uncomment database dependencies in `requirements.txt`
2. Install: `pip install -r requirements.txt`
3. Create models in `backend/app/models/`
4. Configure database connection in `backend/app/core/config.py`

## Testing

To run tests (after setting up pytest):

```bash
cd backend
pytest
```

## Production Deployment

For production deployment:

1. Update `SECRET_KEY` in `.env` with a secure random string
2. Set `BACKEND_CORS_ORIGINS` to your frontend domain
3. Use a production ASGI server configuration
4. Consider using Docker for containerization
5. Set up a proper database (PostgreSQL, MySQL, etc.)

## License

This project is open source and available under the MIT License.

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [PuLP Documentation](https://coin-or.github.io/pulp/)
- [Linear Programming Guide](https://en.wikipedia.org/wiki/Linear_programming)
- [MILP Optimization](https://en.wikipedia.org/wiki/Integer_programming)
