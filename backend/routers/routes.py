"""
Routing API router for PasarPintar AI.
Handles TSP (Traveling Salesperson Problem) for Smart Routing.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import itertools

router = APIRouter(prefix="/api/routes", tags=["Routing"])

class RouteRequest(BaseModel):
    destinations: List[str]

class RoutePoint(BaseModel):
    name: str
    lat: float
    lng: float

class OptimizeResponse(BaseModel):
    optimized_order: List[str]
    total_distance_km: float
    estimated_savings: float
    points: List[RoutePoint]

# Hardcoded coordinates for Solo Raya districts for MVP
SOLO_DISTRICTS = {
    "Laweyan": {"lat": -7.568, "lng": 110.796},
    "Serengan": {"lat": -7.581, "lng": 110.817},
    "Pasar Kliwon": {"lat": -7.579, "lng": 110.832},
    "Jebres": {"lat": -7.558, "lng": 110.844},
    "Banjarsari": {"lat": -7.545, "lng": 110.817},
    "Grogol": {"lat": -7.608, "lng": 110.811},
    "Kartasura": {"lat": -7.550, "lng": 110.745},
    "Baki": {"lat": -7.618, "lng": 110.778},
    "Colomadu": {"lat": -7.535, "lng": 110.755},
    "Mojolaban": {"lat": -7.605, "lng": 110.865},
}

def calculate_distance(p1, p2):
    # Simple Euclidean distance converted to approx KM for Solo
    # 1 degree lat/lng approx 111 km
    lat_diff = (p1["lat"] - p2["lat"]) * 111
    lng_diff = (p1["lng"] - p2["lng"]) * 111
    return ((lat_diff**2) + (lng_diff**2))**0.5 * 1.3 # 1.3 factor for road distance

@router.post("/optimize", response_model=OptimizeResponse)
def optimize_route(request: RouteRequest):
    if not request.destinations or len(request.destinations) < 2:
        raise HTTPException(status_code=400, detail="Pilih minimal 2 lokasi")
        
    valid_dests = [d for d in request.destinations if d in SOLO_DISTRICTS]
    if len(valid_dests) != len(request.destinations):
        raise HTTPException(status_code=400, detail="Beberapa lokasi tidak ditemukan di sistem")
        
    if len(valid_dests) > 8:
        raise HTTPException(status_code=400, detail="Maksimal 8 lokasi untuk optimasi")

    # Brute force TSP
    min_dist = float('inf')
    best_route = []
    
    for perm in itertools.permutations(valid_dests):
        dist = 0
        for i in range(len(perm)-1):
            dist += calculate_distance(SOLO_DISTRICTS[perm[i]], SOLO_DISTRICTS[perm[i+1]])
        
        if dist < min_dist:
            min_dist = dist
            best_route = list(perm)
            
    # Calculate savings
    # Assume without optimization, the route is just random, 
    # we take the original order distance
    orig_dist = 0
    for i in range(len(valid_dests)-1):
        orig_dist += calculate_distance(SOLO_DISTRICTS[valid_dests[i]], SOLO_DISTRICTS[valid_dests[i+1]])
        
    savings_km = max(0, orig_dist - min_dist)
    # Assume 1 liter = 10km, Rp 10.000 / liter
    savings_rp = (savings_km / 10) * 10000
    
    points = [{"name": d, "lat": SOLO_DISTRICTS[d]["lat"], "lng": SOLO_DISTRICTS[d]["lng"]} for d in best_route]
    
    return OptimizeResponse(
        optimized_order=best_route,
        total_distance_km=round(min_dist, 1),
        estimated_savings=round(savings_rp, 0),
        points=points
    )
