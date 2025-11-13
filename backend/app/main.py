from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import health, products, plants, transfer_plans


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
    )

    # Set up CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    application.include_router(health.router, prefix=settings.API_V1_STR)
    application.include_router(products.router, prefix=settings.API_V1_STR, tags=["products"])
    application.include_router(plants.router, prefix=settings.API_V1_STR, tags=["plants"])
    application.include_router(transfer_plans.router, prefix=settings.API_V1_STR, tags=["transfer-plans"])

    return application


app = create_application()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Denso Transfer Plan Recommendation System",
        "version": settings.VERSION,
        "docs": "/docs",
    }
