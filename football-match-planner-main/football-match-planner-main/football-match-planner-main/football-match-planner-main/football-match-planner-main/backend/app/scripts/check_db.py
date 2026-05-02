import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend', 'app'))
from db.database import get_matches_collection

col = get_matches_collection()
for doc in col.find():
    print(f"Match: {doc.get('name')}")
    for cat in doc.get('categories', []):
        print(f"  Category: {cat.get('name')}")
        for task in cat.get('tasks', []):
            print(f"    Task: {task.get('name')} | Status: {task.get('status')} | Cost: {task.get('cost')} | Loc: {task.get('location')}")
