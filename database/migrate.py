
import os
import sys
import importlib
import inspect
from sqlalchemy import create_engine, text, inspect as sa_inspect
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import Base, DATABASE_URL
from backend.core.config import settings

# Load env
load_dotenv()

engine = create_engine(DATABASE_URL)

TYPE_MAP = {
    'INTEGER': 'INTEGER',
    'BIGINT': 'BIGINT',
    'SMALLINT': 'SMALLINT',
    'VARCHAR': 'VARCHAR',
    'TEXT': 'TEXT',
    'BOOLEAN': 'BOOLEAN',
    'DATE': 'DATE',
    'DATETIME': 'TIMESTAMP',
    'TIMESTAMP': 'TIMESTAMP',
    'FLOAT': 'FLOAT',
    'NUMERIC': 'NUMERIC',
    'JSON': 'JSON',
    'JSONB': 'JSONB',
}

def get_pg_type(sa_type):
    """Convert SQLAlchemy type to PostgreSQL type string"""
    type_name = type(sa_type).__name__.upper()
    return TYPE_MAP.get(type_name, 'VARCHAR')

def get_existing_columns(table_name):
    with engine.connect() as conn:
        query = text("SELECT column_name FROM information_schema.columns WHERE table_name = :table_name;")
        result = conn.execute(query, {"table_name": table_name})
        return {row[0] for row in result}

def add_column_if_not_exists(table_name, column_name, column_type, nullable=True):
    with engine.connect() as conn:
        existing = get_existing_columns(table_name)
        if column_name not in existing:
            null_clause = "" if nullable else " NOT NULL"
            print(f"  [+] Adding column '{column_name}' ({column_type}) to '{table_name}'...")
            try:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}{null_clause};"))
                conn.commit()
                return True
            except Exception as e:
                print(f"  ❌ Error adding column: {e}")
                return False
        return False

def sync_model(model):
    table_name = model.__tablename__
    print(f"\n📋 Checking table: {table_name}")
    
    # Check if table exists
    with engine.connect() as conn:
        res = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :t)"), {"t": table_name}).fetchone()
        if not res[0]:
            print(f"  ⚠️  Table '{table_name}' does not exist. Please run initial migration/creation.")
            return

    existing_columns = get_existing_columns(table_name)
    mapper = sa_inspect(model)
    
    for column in mapper.columns:
        col_name = column.name
        col_type = get_pg_type(column.type)
        if col_name not in existing_columns:
            add_column_if_not_exists(table_name, col_name, col_type, column.nullable)
        else:
            print(f"  [✓] Column '{col_name}' exists")

def discover_models():
    """Dynamically find all SQLAlchemy models in backend.models"""
    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "models")
    model_classes = []
    
    for filename in os.listdir(models_dir):
        if filename.endswith(".py") and not filename.startswith("__"):
            module_name = f"backend.models.{filename[:-3]}"
            try:
                module = importlib.import_module(module_name)
                for name, obj in inspect.getmembers(module):
                    if inspect.isclass(obj) and issubclass(obj, Base) and obj is not Base:
                        # Avoid duplicates if imported multiple times
                        if obj not in model_classes:
                            model_classes.append(obj)
            except Exception as e:
                print(f"Error importing {module_name}: {e}")
                
    return model_classes

def run_migrations():
    print("🚀 Starting Dynamic Migration")
    models = discover_models()
    print(f"Found {len(models)} models: {[m.__tablename__ for m in models]}")
    
    for model in models:
        sync_model(model)
        
    print("\n✅ Migration completed!")

if __name__ == "__main__":
    run_migrations()
