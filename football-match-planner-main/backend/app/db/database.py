from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["football_planner"]
matches_collection = db["matches"]
members_collection = db["members"]

def get_matches_collection():
    return matches_collection

def get_members_collection():
    return members_collection
