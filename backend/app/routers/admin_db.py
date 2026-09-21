from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_auth

# 라우터 설정 (보안 자물쇠 포함)
router = APIRouter(
    prefix="/admin/db",
    tags=["DB Admin"],
    dependencies=[Depends(get_current_auth)]
)

# 1. 전체 테이블 목록 조회
@router.get("/tables")
def get_all_tables(db: Session = Depends(get_db)):
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()
    
    table_info = []
    for table_name in tables:
        # 각 테이블의 대략적인 행 수 조회
        count = db.scalar(text(f"SELECT COUNT(*) FROM {table_name}"))
        table_info.append({"name": table_name, "row_count": count})
        
    return {"tables": table_info, "total_count": len(tables)}

# 2. 특정 테이블의 컬럼 정보 및 데이터 조회
@router.get("/tables/{table_name}")
def get_table_data(table_name: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    inspector = inspect(db.bind)
    if table_name not in inspector.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found")
        
    pk_columns = inspector.get_pk_constraint(table_name).get('constrained_columns', [])
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    
    result = db.execute(text(f"SELECT * FROM {table_name} LIMIT :limit OFFSET :skip"), {"limit": limit, "skip": skip})
    rows = [dict(zip(columns, row)) for row in result.fetchall()]
    
    return {
        "table_name": table_name,
        "primary_keys": pk_columns,
        "columns": columns,
        "data": rows
    }

# 3. 데이터 추가 (CREATE)
@router.post("/tables/{table_name}")
async def create_data(table_name: str, request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    columns = ", ".join(data.keys())
    placeholders = ", ".join([f":{k}" for k in data.keys()])
    
    query = text(f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})")
    db.execute(query, data)
    db.commit()
    return {"status": "success"}

# 4. 데이터 수정 (UPDATE)
@router.put("/tables/{table_name}/{pk_column}/{pk_value}")
async def update_data(table_name: str, pk_column: str, pk_value: str, request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    set_clauses = ", ".join([f"{k} = :{k}" for k in data.keys()])
    
    query = text(f"UPDATE {table_name} SET {set_clauses} WHERE {pk_column} = :pk_value")
    params = data.copy()
    params["pk_value"] = pk_value
    
    db.execute(query, params)
    db.commit()
    return {"status": "success"}

# 5. 데이터 삭제 (DELETE)
@router.delete("/tables/{table_name}/{pk_column}/{pk_value}")
def delete_data(table_name: str, pk_column: str, pk_value: str, db: Session = Depends(get_db)):
    query = text(f"DELETE FROM {table_name} WHERE {pk_column} = :pk_value")
    db.execute(query, {"pk_value": pk_value})
    db.commit()
    return {"status": "success"}