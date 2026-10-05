import json
from staticmap import StaticMap, CircleMarker
from agent import get_ai_response

async def generate_impact_map(schools, map_path):
    school_names = [s.get("school_name", "") for s in schools]
    school_names = list(set([name for name in school_names if name]))
    
    if not school_names:
        return False
        
    prompt = f"""
    Geocode the following list of schools located in Nepal (most are likely in Gorkha district, Bhimsen Thapa RM, or nearby).
    Provide approximate latitude and longitude coordinates for each.
    If you don't know the exact school, provide the coordinates for the general area/ward/village/municipality.
    Schools:
    {json.dumps(school_names)}
    
    Return STRICTLY JSON format as a list of dictionaries:
    [{{"name": "School Name", "lat": 28.01, "lon": 84.62}}]
    """
    
    resp = await get_ai_response("You are a geocoding API.", prompt, model="gemini-3.8-flash-low")
    
    try:
        start_idx = resp.find('[')
        end_idx = resp.rfind(']') + 1
        geo_data = json.loads(resp[start_idx:end_idx])
        
        # We can increase the map size and use a larger marker to make it look a bit more prominent
        m = StaticMap(1000, 800)
        for loc in geo_data:
            lat = loc["lat"]
            lon = loc["lon"]
            # Add a red marker for each school
            marker = CircleMarker((lon, lat), '#ef4444', 12)
            m.add_marker(marker)
            
        # Render the map with an automatic zoom level that fits all markers
        image = m.render()
        image.save(map_path)
        return True
    except Exception as e:
        print("Map generation failed:", e)
        return False
