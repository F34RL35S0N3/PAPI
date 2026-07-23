from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.business_service import run_simulation

router = APIRouter(prefix="/api/business/simulator", tags=["Business"])

class SimulatorRequest(BaseModel):
    scenario: str
    percentage: float
    capital_price: float
    selling_price: float
    sales_volume: int = 100

@router.post("/")
async def simulate(request: SimulatorRequest):
    """
    Run What-if Business Simulator to see impact on profit.
    Scenarios: modal_naik, modal_turun, harga_naik, harga_turun, diskon
    """
    valid_scenarios = ["modal_naik", "modal_turun", "harga_naik", "harga_turun", "diskon"]
    if request.scenario not in valid_scenarios:
        raise HTTPException(status_code=400, detail="Skenario tidak valid")
        
    result = run_simulation(
        scenario=request.scenario,
        percentage=request.percentage,
        capital_price=request.capital_price,
        selling_price=request.selling_price,
        sales_volume=request.sales_volume
    )
    return result
