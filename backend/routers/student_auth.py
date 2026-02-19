from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.core import database, security
from backend.crud import students as students_crud
from backend.schemas import auth as auth_schemas
from backend.schemas import students as students_schemas

router = APIRouter()

@router.post("/student/token", response_model=auth_schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    student = students_crud.authenticate_student(db, username=form_data.username, password=form_data.password)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not student.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Conta de aluno inativa.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = security.timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": student.username, "role": "student", "id": student.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from typing import List

async def get_current_student(token: str = Depends(security.oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role != "student":
            raise credentials_exception
    except security.JWTError:
        raise credentials_exception
    
    student = students_crud.get_student_by_username(db, username=username)
    if student is None:
        raise credentials_exception
    return student

@router.get("/student/me", response_model=students_schemas.Student)
async def read_users_me(current_student: students_schemas.Student = Depends(get_current_student)):
    return current_student

@router.get("/student/evolution", response_model=List[students_schemas.StudentEvolutionPoint])
async def read_student_evolution(current_student: students_schemas.Student = Depends(get_current_student), db: Session = Depends(database.get_db)):
    results = students_crud.get_student_evolution(db, student_id=current_student.id)
    
    response = []
    for log in results:
        response.append({
            "date": log.session.date,
            "grade": log.grade,
            "status": log.status
        })
    return response
