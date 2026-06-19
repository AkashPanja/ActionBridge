from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_active_user, RequirePermission
from app.auth.schemas import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    LoginRequest,
    RegisterRequest,
    SetupRequest,
    SetupStatusResponse,
    TokenResponse,
    UpdateUserRequest,
    UserResponse,
)
from app.auth.service import (
    authenticate_user,
    check_setup_required,
    create_access_token,
    create_api_key,
    create_initial_admin,
    create_user,
    get_user_by_email,
    list_api_keys,
    list_users,
    reset_system,
    revoke_api_key,
    save_setting,
    update_user,
)
from app.database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.get("/status", response_model=SetupStatusResponse)
async def setup_status(db: AsyncSession = Depends(get_db)):
    required = await check_setup_required(db)
    return SetupStatusResponse(setup_required=required)


@router.post("/setup", response_model=TokenResponse, status_code=201)
async def setup(data: SetupRequest, db: AsyncSession = Depends(get_db)):
    if not await check_setup_required(db):
        raise HTTPException(status_code=409, detail="System is already set up")

    user = await create_initial_admin(db, data)

    if data.smtp_host:
        smtp_settings = {
            "host": data.smtp_host,
            "port": data.smtp_port,
            "username": data.smtp_username,
            "password": data.smtp_password,
            "from_email": data.smtp_from_email,
            "use_tls": data.smtp_use_tls,
        }
        await save_setting(db, "smtp", smtp_settings)

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    return await create_user(db, data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: UserResponse = Depends(get_current_active_user)):
    return user


@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=201)
async def generate_api_key(
    data: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("api_keys:manage")),
):
    api_key, raw_key = await create_api_key(db, data.project_id, data.label, data.scopes)
    return ApiKeyCreatedResponse(
        **{k: v for k, v in api_key.__dict__.items() if k != "_sa_instance_state"},
        raw_key=raw_key,
    )


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_project_api_keys(
    project_id: str = Query(),
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("api_keys:manage")),
):
    return await list_api_keys(db, project_id)


@router.delete("/api-keys/{key_id}", status_code=204)
async def delete_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("api_keys:manage")),
):
    deleted = await revoke_api_key(db, key_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="API key not found")


@router.get("/users", response_model=list[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("users:manage")),
):
    return await list_users(db)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: str,
    data: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(RequirePermission("users:manage")),
):
    updated = await update_user(db, user_id, data.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.post("/reset", status_code=200)
async def reset(
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("users:manage")),
):
    await reset_system(db)
    return {"message": "System has been reset"}
