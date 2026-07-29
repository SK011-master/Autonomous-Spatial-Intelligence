from typing import List, Dict, Any, Tuple

# Define our semantic rules: which objects strongly indicate which rooms.
# The integer represents the 'weight' or 'importance' of that object for the room.
ROOM_KNOWLEDGE_GRAPH = {
    "Office/Workspace": {
        "laptop": 10,
        "monitor": 10,
        "keyboard": 8,
        "mouse": 8,
        "cell phone": 3,
        "book": 5,
        "chair": 4,
        "cup": 2
    },
    "Kitchen": {
        "refrigerator": 10,
        "microwave": 10,
        "oven": 10,
        "sink": 10,
        "cup": 6,
        "bottle": 5,
        "bowl": 5,
        "dining table": 6
    },
    "Living Room": {
        "tv": 10,
        "sofa": 10,
        "remote": 8,
        "potted plant": 5,
        "chair": 4,
        "dog": 6,
        "cat": 6
    }
}

def analyze_scene_context(detected_labels: List[str]) -> Tuple[str, float]:
    """
    Probabilistic rule-based inference to determine room context from bounding box labels.
    """
    if not detected_labels:
        return "Unknown Location", 0.0

    room_scores = {room: 0 for room in ROOM_KNOWLEDGE_GRAPH.keys()}
    total_objects_found = 0

    # Calculate raw scores based on detected items
    for label in detected_labels:
        # We only count unique object types for scene classification to prevent 
        # 10 cups from overwhelmingly tricking the system into guessing "Kitchen".
        pass # The set will be passed in from main.py

    unique_labels = set(detected_labels)
    
    for label in unique_labels:
        for room_name, room_items in ROOM_KNOWLEDGE_GRAPH.items():
            if label in room_items:
                room_scores[room_name] += room_items[label]
                total_objects_found += 1

    if total_objects_found == 0:
         return "Unknown Context", 0.0

    # Find the room with the highest score
    best_room = max(room_scores, key=room_scores.get)
    best_score = room_scores[best_room]

    # Calculate a rough confidence percentage
    # Max possible score for a room is the sum of its top 3 indicator weights (approx 30)
    confidence = min((best_score / 25.0) * 100, 99.9) 

    return best_room, round(confidence, 1)

def determine_activity_status(occupancy: int, room: str) -> str:
    """
    Determine the state of the room based on human presence.
    """
    if occupancy == 0:
        return "IDLE"
    
    if room == "Office/Workspace":
        return "ACTIVE_WORKING"
    elif room == "Kitchen":
        return "ACTIVE_COOKING_OR_EATING"
    elif room == "Living Room":
        return "ACTIVE_RELAXING"
    
    return "ACTIVE_UNKNOWN"