from app.db.session import SessionLocal
from app.core.security import create_access_token
from app.api.deps import get_user_from_access_token

db = SessionLocal()
try:
    token, _ = create_access_token("3")
    print(f"Token creado: {token[:50]}...")
    
    user = get_user_from_access_token(token, db)
    print(f"User ID: {user.id}, Email: {user.email}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
finally:
    db.close()