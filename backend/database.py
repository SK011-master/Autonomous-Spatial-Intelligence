import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

# Connect to our local Docker Postgres instance
DATABASE_URL = "postgresql://postgres:adminpassword@localhost:5432/spatial_memory"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define the schema for long-term memory
class KnownFace(Base):
    __tablename__ = "known_faces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    embedding = Column(Vector(128))  # <--- CHANGED FROM 512 TO 128
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
        
    # Drop the old 512-dimension table and recreate it with 128 dimensions
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✅ Vector Database reset and known_faces table ready with 128 dimensions!")


def register_face(name: str, embedding: list) -> Dict[str, Any]:
    """Stores a new identity and vector embedding into the database."""
    session = SessionLocal()
    try:
        new_person = KnownFace(name=name, embedding=embedding)
        session.add(new_person)
        session.commit()
        session.refresh(new_person)
        return {"id": str(new_person.id), "name": new_person.name, "status": "registered"}
    finally:
        session.close()


def recognize_face(embedding: list, threshold: float = 0.40) -> Optional[str]:
    """
    Performs nearest-neighbor vector search in PostgreSQL using Cosine Distance.
    """
    session = SessionLocal()
    try:
        # Query using pgvector's cosine distance metric
        match = session.query(
            KnownFace, 
            KnownFace.embedding.cosine_distance(embedding).label("distance")
        ).order_by("distance").first()

        if match:
            # DEBUG: Print the distance to the terminal EVERY time, even if it fails
            print(f"\n🔍 DEBUG - Closest match in DB: {match.KnownFace.name} | Cosine Distance: {round(match.distance, 4)}")
            
            if match.distance < threshold:
                print(f"🎯 Identity Matched: {match.KnownFace.name}!")
                return match.KnownFace.name
        
        return "Unknown"
    finally:
        session.close()

if __name__ == "__main__":
    init_db()