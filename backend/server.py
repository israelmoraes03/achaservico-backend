from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import mercadopago

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Mercado Pago SDK (disabled - using manual PIX)
# mp_access_token = os.environ.get('MERCADO_PAGO_ACCESS_TOKEN', '')
# mp_public_key = os.environ.get('MERCADO_PAGO_PUBLIC_KEY', '')
# sdk = mercadopago.SDK(mp_access_token) if mp_access_token else None

# PIX Manual Configuration
PIX_KEY = "49958688875"
PIX_KEY_TYPE = "cpf"
PIX_RECEIVER_NAME = "AchaServico"

# Create the main app
app = FastAPI(title="AchaServiço API", description="API para conectar clientes a prestadores de serviços locais")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================== MODELS ========================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_provider: bool = False

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Provider(BaseModel):
    provider_id: str = Field(default_factory=lambda: f"prov_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    phone: str
    categories: List[str] = []  # Multiple categories
    neighborhood: str
    description: str
    profile_image: Optional[str] = None  # base64
    average_rating: float = 0.0
    total_reviews: int = 0
    is_active: bool = True
    subscription_status: str = "inactive"  # active, inactive, expired
    subscription_expires_at: Optional[datetime] = None
    mp_preference_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProviderCreate(BaseModel):
    name: str
    phone: str
    categories: List[str]  # Multiple categories
    neighborhood: str
    description: str
    profile_image: Optional[str] = None

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    categories: Optional[List[str]] = None  # Multiple categories
    neighborhood: Optional[str] = None
    description: Optional[str] = None
    profile_image: Optional[str] = None

class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    provider_id: str
    user_id: str
    user_name: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    provider_id: str
    rating: int
    comment: Optional[str] = None

class Subscription(BaseModel):
    subscription_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    provider_id: str
    user_id: str
    amount: float = 15.00
    status: str = "pending"  # pending, active, expired, cancelled
    payment_method: str = "mercadopago"
    mp_preference_id: Optional[str] = None
    mp_payment_id: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# ======================== STATIC DATA ========================

CATEGORIES = [
    {"id": "eletricista", "name": "Eletricista", "icon": "flash"},
    {"id": "encanador", "name": "Encanador", "icon": "water"},
    {"id": "pedreiro", "name": "Pedreiro", "icon": "construct"},
    {"id": "pintor", "name": "Pintor", "icon": "color-palette"},
    {"id": "jardineiro", "name": "Jardineiro", "icon": "leaf"},
    {"id": "diarista", "name": "Diarista", "icon": "home"},
    {"id": "mecanico", "name": "Mecânico", "icon": "car"},
    {"id": "carpinteiro", "name": "Carpinteiro", "icon": "hammer"},
    {"id": "serralheiro", "name": "Serralheiro", "icon": "build"},
    {"id": "ar_condicionado", "name": "Técnico de Ar Condicionado", "icon": "snow"},
    {"id": "informatica", "name": "Técnico de Informática", "icon": "laptop"},
    {"id": "manicure", "name": "Manicure/Pedicure", "icon": "hand-left"},
    {"id": "cabeleireiro", "name": "Cabeleireiro(a)", "icon": "cut"},
    {"id": "personal", "name": "Personal Trainer", "icon": "fitness"},
    {"id": "professor", "name": "Professor Particular", "icon": "school"},
    {"id": "costureira", "name": "Costureira", "icon": "shirt"},
]

NEIGHBORHOODS = [
    "Alto da Boa Vista", "Bela Vista", "Carandá", "Centro", "Cinturão Verde",
    "Colinos", "Interlagos", "Jardim Alvorada", "Jardim Atenas", "Jardim Bela Vista",
    "Jardim Glória", "Jardim Guaporé", "Jardim Imperial", "Jardim Maristela",
    "Jardim Mirassol", "Jardim Morumbi", "Jardim Nova Americana", "Jardim Nova Ipanema",
    "Jardim Oiti", "Jardim Planalto", "Jardim Primavera", "Jardim Progresso",
    "Jardim Santa Aurélia", "Jardim Santa Júlia", "Jardim Vendrell", "Jardim Violetas",
    "JK", "Lapa", "Nossa Senhora Aparecida", "Nossa Senhora das Graças", "Nova Europa",
    "SetSul", "São Carlos", "São João", "São Jorge", "Vila Alegre", "Vila Cardoso",
    "Vila Carioca", "Vila Guanabara", "Vila Haro", "Vila Maria", "Vila Nova",
    "Vila Piloto", "Vila Popular", "Vila Santana", "Vila Verde", "Vila Viana"
]

# ======================== AUTH HELPERS ========================

async def get_session_token(request: Request) -> Optional[str]:
    """Get session token from cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "")
    return None

async def get_current_user(request: Request) -> Optional[User]:
    """Get current authenticated user"""
    session_token = await get_session_token(request)
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return user

# ======================== AUTH ENDPOINTS ========================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID não fornecido")
    
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessão inválida")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=500, detail="Erro na autenticação")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        new_user = User(
            user_id=user_id,
            email=user_data["email"],
            name=user_data["name"],
            picture=user_data.get("picture")
        )
        await db.users.insert_one(new_user.model_dump())
    
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session.model_dump())
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user info"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {
        "user": user.model_dump(),
        "provider": provider
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout realizado com sucesso"}

# ======================== CATEGORIES & NEIGHBORHOODS ========================

@api_router.get("/categories")
async def get_categories():
    """Get all service categories"""
    return CATEGORIES

@api_router.get("/neighborhoods")
async def get_neighborhoods():
    """Get all neighborhoods in Três Lagoas"""
    return NEIGHBORHOODS

# ======================== PROVIDERS ========================

@api_router.get("/providers")
async def get_providers(
    category: Optional[str] = None,
    neighborhood: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all active providers with optional filters"""
    query = {"is_active": True, "subscription_status": "active"}
    
    if category:
        # Search in categories array
        query["categories"] = category
    if neighborhood:
        query["neighborhood"] = neighborhood
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    providers = await db.providers.find(query, {"_id": 0}).sort("average_rating", -1).to_list(100)
    return providers

@api_router.get("/providers/{provider_id}")
async def get_provider(provider_id: str):
    """Get a specific provider by ID"""
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    return provider

@api_router.post("/providers", response_model=Provider)
async def create_provider(provider_data: ProviderCreate, request: Request):
    """Create a new provider profile (requires auth)"""
    user = await require_auth(request)
    
    existing = await db.providers.find_one({"user_id": user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Você já possui um perfil de prestador")
    
    provider = Provider(
        user_id=user.user_id,
        **provider_data.model_dump()
    )
    
    await db.providers.insert_one(provider.model_dump())
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_provider": True}}
    )
    
    return provider

@api_router.put("/providers/{provider_id}")
async def update_provider(provider_id: str, provider_data: ProviderUpdate, request: Request):
    """Update provider profile (requires auth and ownership)"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    if provider["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para editar este perfil")
    
    update_data = {k: v for k, v in provider_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": update_data}
    )
    
    updated = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    return updated

# ======================== REVIEWS ========================

@api_router.get("/providers/{provider_id}/reviews")
async def get_provider_reviews(provider_id: str):
    """Get all reviews for a provider"""
    reviews = await db.reviews.find({"provider_id": provider_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, request: Request):
    """Create a review for a provider (requires auth)"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"provider_id": review_data.provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    existing_review = await db.reviews.find_one({
        "provider_id": review_data.provider_id,
        "user_id": user.user_id
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="Você já avaliou este prestador")
    
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Avaliação deve ser entre 1 e 5")
    
    review = Review(
        provider_id=review_data.provider_id,
        user_id=user.user_id,
        user_name=user.name,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    all_reviews = await db.reviews.find({"provider_id": review_data.provider_id}).to_list(1000)
    total_rating = sum(r["rating"] for r in all_reviews)
    avg_rating = total_rating / len(all_reviews)
    
    await db.providers.update_one(
        {"provider_id": review_data.provider_id},
        {"$set": {
            "average_rating": round(avg_rating, 1),
            "total_reviews": len(all_reviews)
        }}
    )
    
    return review

# ======================== PIX MANUAL SUBSCRIPTIONS ========================

@api_router.get("/payments/pix-info")
async def get_pix_info():
    """Get PIX information for manual payment"""
    return {
        "pix_key": PIX_KEY,
        "pix_key_type": PIX_KEY_TYPE,
        "pix_key_formatted": "499.586.888-75",
        "receiver_name": PIX_RECEIVER_NAME,
        "amount": 15.00,
        "description": "Assinatura Mensal AchaServico"
    }

@api_router.post("/subscriptions/create")
async def create_subscription(request: Request):
    """Create a pending subscription for PIX payment"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=400, detail="Você precisa criar um perfil de prestador primeiro")
    
    # Check if there's already a pending subscription
    existing = await db.subscriptions.find_one({
        "provider_id": provider["provider_id"],
        "status": {"$in": ["pending", "active"]}
    })
    
    if existing and existing.get("status") == "active":
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa")
    
    # Create or update pending subscription
    subscription = Subscription(
        provider_id=provider["provider_id"],
        user_id=user.user_id,
        status="pending",
        payment_method="pix_manual"
    )
    
    if existing:
        await db.subscriptions.update_one(
            {"provider_id": provider["provider_id"]},
            {"$set": {"status": "pending", "created_at": datetime.now(timezone.utc)}}
        )
    else:
        await db.subscriptions.insert_one(subscription.model_dump())
    
    return {
        "success": True,
        "subscription_id": subscription.subscription_id,
        "pix_key": PIX_KEY,
        "pix_key_formatted": "(66) 99684-1531",
        "amount": 15.00,
        "message": "Faça o PIX e aguarde a confirmação"
    }

@api_router.get("/subscriptions/status")
async def get_subscription_status(request: Request):
    """Get current subscription status"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        return {"has_provider": False, "subscription": None}
    
    subscription = await db.subscriptions.find_one(
        {"provider_id": provider["provider_id"]},
        {"_id": 0}
    )
    
    return {
        "has_provider": True,
        "provider": provider,
        "subscription": subscription
    }

@api_router.post("/subscriptions/activate")
async def activate_subscription_manual(request: Request):
    """Manually activate subscription (for testing or manual approval)"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=400, detail="Prestador não encontrado")
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Update subscription
    await db.subscriptions.update_one(
        {"provider_id": provider["provider_id"], "status": "pending"},
        {"$set": {
            "status": "active",
            "started_at": datetime.now(timezone.utc),
            "expires_at": expires_at
        }}
    )
    
    # Activate provider
    await db.providers.update_one(
        {"provider_id": provider["provider_id"]},
        {"$set": {
            "subscription_status": "active",
            "subscription_expires_at": expires_at,
            "is_active": True
        }}
    )
    
    return {"success": True, "message": "Assinatura ativada com sucesso!", "expires_at": expires_at.isoformat()}

# ======================== ADMIN ENDPOINTS ========================

@api_router.get("/admin/stats")
async def get_admin_stats():
    """Get dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_providers = await db.providers.count_documents({})
    active_subscriptions = await db.providers.count_documents({"subscription_status": "active"})
    pending_subscriptions = await db.subscriptions.count_documents({"status": "pending"})
    total_reviews = await db.reviews.count_documents({})
    
    return {
        "total_users": total_users,
        "total_providers": total_providers,
        "active_subscriptions": active_subscriptions,
        "pending_subscriptions": pending_subscriptions,
        "total_reviews": total_reviews
    }

@api_router.get("/admin/all-providers")
async def get_all_providers():
    """Get all providers for admin"""
    providers = await db.providers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return providers

@api_router.get("/admin/all-users")
async def get_all_users():
    """Get all users for admin"""
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return users

@api_router.get("/admin/all-subscriptions")
async def get_all_subscriptions():
    """Get all subscriptions with provider details"""
    subscriptions = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for sub in subscriptions:
        provider = await db.providers.find_one({"provider_id": sub.get("provider_id")}, {"_id": 0})
        result.append({
            "subscription": sub,
            "provider": provider
        })
    
    return result

@api_router.get("/admin/all-reviews")
async def get_all_reviews():
    """Get all reviews for admin"""
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reviews

@api_router.get("/admin/pending-subscriptions")
async def get_pending_subscriptions():
    """Get all pending subscriptions (for admin to activate)"""
    pending = await db.subscriptions.find({"status": "pending"}, {"_id": 0}).to_list(100)
    
    result = []
    for sub in pending:
        provider = await db.providers.find_one({"provider_id": sub["provider_id"]}, {"_id": 0})
        if provider:
            result.append({
                "subscription": sub,
                "provider": provider
            })
    
    return result

@api_router.post("/admin/activate/{provider_id}")
async def admin_activate_subscription(provider_id: str):
    """Admin endpoint to activate a subscription after PIX payment"""
    provider = await db.providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.subscriptions.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "status": "active",
            "started_at": datetime.now(timezone.utc),
            "expires_at": expires_at
        }},
        upsert=True
    )
    
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "subscription_status": "active",
            "subscription_expires_at": expires_at,
            "is_active": True
        }}
    )
    
    return {
        "success": True, 
        "message": f"Assinatura de {provider['name']} ativada com sucesso!",
        "expires_at": expires_at.isoformat()
    }

@api_router.post("/admin/cancel-subscription/{provider_id}")
async def admin_cancel_subscription(provider_id: str):
    """Cancel a subscription"""
    provider = await db.providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    await db.subscriptions.update_one(
        {"provider_id": provider_id},
        {"$set": {"status": "cancelled"}}
    )
    
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "subscription_status": "inactive",
            "is_active": False
        }}
    )
    
    return {"success": True, "message": "Assinatura cancelada"}

@api_router.post("/admin/toggle-provider/{provider_id}")
async def admin_toggle_provider(provider_id: str):
    """Toggle provider active status"""
    provider = await db.providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    new_status = not provider.get("is_active", True)
    
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"success": True, "is_active": new_status}

@api_router.delete("/admin/provider/{provider_id}")
async def admin_delete_provider(provider_id: str):
    """Delete a provider"""
    provider = await db.providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    await db.providers.delete_one({"provider_id": provider_id})
    await db.subscriptions.delete_many({"provider_id": provider_id})
    await db.reviews.delete_many({"provider_id": provider_id})
    
    if provider.get("user_id"):
        await db.users.update_one(
            {"user_id": provider["user_id"]},
            {"$set": {"is_provider": False}}
        )
    
    return {"success": True, "message": "Prestador excluído"}

@api_router.delete("/admin/user/{user_id}")
async def admin_delete_user(user_id: str):
    """Delete a user and their provider profile if exists"""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    provider = await db.providers.find_one({"user_id": user_id})
    if provider:
        await db.providers.delete_one({"user_id": user_id})
        await db.subscriptions.delete_many({"provider_id": provider["provider_id"]})
        await db.reviews.delete_many({"provider_id": provider["provider_id"]})
    
    await db.reviews.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"success": True, "message": "Usuário excluído"}

@api_router.delete("/admin/review/{review_id}")
async def admin_delete_review(review_id: str):
    """Delete a review"""
    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    
    await db.reviews.delete_one({"review_id": review_id})
    
    # Update provider rating
    provider_id = review.get("provider_id")
    if provider_id:
        all_reviews = await db.reviews.find({"provider_id": provider_id}).to_list(1000)
        if all_reviews:
            total_rating = sum(r["rating"] for r in all_reviews)
            avg_rating = total_rating / len(all_reviews)
            await db.providers.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "average_rating": round(avg_rating, 1),
                    "total_reviews": len(all_reviews)
                }}
            )
        else:
            await db.providers.update_one(
                {"provider_id": provider_id},
                {"$set": {"average_rating": 0, "total_reviews": 0}}
            )
    
    return {"success": True, "message": "Avaliação excluída"}

# ======================== WEBHOOKS ========================

@api_router.post("/webhooks/pix")
async def pix_webhook(request: Request):
    """Handle PIX webhook notifications (for future use)"""
    try:
        body = await request.json()
        logger.info(f"PIX Webhook received: {body}")
        
        # Store webhook for audit
        await db.webhooks.insert_one({
            "type": "pix",
            "data": body,
            "received_at": datetime.now(timezone.utc),
            "processed": False
        })
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ======================== ROOT ========================

@api_router.get("/")
async def root():
    return {
        "message": "AchaServiço API",
        "version": "1.0.0",
        "city": "Três Lagoas - MS",
        "payment_method": "pix_manual"
    }

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
