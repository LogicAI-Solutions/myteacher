from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.models.config import AppConfig as AppConfigModel
from backend.schemas.config import AppConfig, AppConfigUpdate, StripePublicConfig
from backend.core.security import get_current_active_user
import os

router = APIRouter(prefix="/config", tags=["config"])

@router.get("/stripe-public", response_model=StripePublicConfig)
def get_stripe_public_key(db: Session = Depends(get_db)):
    config_entry = db.query(AppConfigModel).filter(AppConfigModel.key == "stripe_public_key").first()
    value = config_entry.value if config_entry and config_entry.value else os.getenv("VITE_STRIPE_PUBLIC_KEY")
    return {"stripe_public_key": value}

@router.get("/", response_model=List[AppConfig])
def get_configs(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return db.query(AppConfigModel).all()

@router.put("/{key}", response_model=AppConfig)
def update_config(key: str, config: AppConfigUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    db_config = db.query(AppConfigModel).filter(AppConfigModel.key == key).first()
    if not db_config:
        db_config = AppConfigModel(key=key, value=config.value)
        db.add(db_config)
    else:
        db_config.value = config.value
        
    db.commit()
    db.refresh(db_config)
    return db_config
