from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import stripe
import resend
import mercadopago
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'achaservico')]

# Auth Backend URL (Emergent Authentication Service)
AUTH_BACKEND_URL = os.environ.get('AUTH_BACKEND_URL', 'https://demobackend.emergentagent.com')

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
ADMIN_NOTIFICATION_EMAIL = os.environ.get('ADMIN_NOTIFICATION_EMAIL', 'saragomeshh@gmail.com')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# PIX Manual Configuration (from environment variables)
PIX_KEY = os.environ.get('PIX_KEY', '49958688875')
PIX_KEY_TYPE = os.environ.get('PIX_KEY_TYPE', 'cpf')
PIX_RECEIVER_NAME = os.environ.get('PIX_RECEIVER_NAME', 'AchaServico')

# Stripe Configuration
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
stripe.api_key = STRIPE_SECRET_KEY

# Mercado Pago Configuration
MP_ACCESS_TOKEN = os.environ.get('MP_ACCESS_TOKEN', '')
MP_PUBLIC_KEY = os.environ.get('MP_PUBLIC_KEY', '')
mp_sdk = mercadopago.SDK(MP_ACCESS_TOKEN) if MP_ACCESS_TOKEN else None

# App Domain for Stripe redirects
# App configuration
APP_DOMAIN = os.environ.get('APP_DOMAIN', 'https://achaservico-backend.onrender.com')
# For mobile app deep linking after Stripe payment
APP_SCHEME = os.environ.get('APP_SCHEME', 'achaservico')

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

# ======================== EMAIL NOTIFICATIONS ========================

async def send_admin_notification_email(provider_name: str, provider_email: str, categories: List[str], cities: List[str], phone: str):
    """Send email notification to admin when a new provider registers"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email notification")
        return False
    
    try:
        categories_str = ", ".join(categories) if categories else "Não informado"
        cities_str = ", ".join([c.replace("_", " ").title() for c in cities]) if cities else "Não informado"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Novo Prestador Cadastrado!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Detalhes do Cadastro:</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Nome:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #333;">{provider_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Email:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #333;">{provider_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Telefone:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #333;">{phone}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Categorias:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #333;">{categories_str}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; font-weight: bold; color: #666;">Cidades:</td>
                        <td style="padding: 10px 0; color: #333;">{cities_str}</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404;">
                        <strong>⚠️ Ação necessária:</strong> O prestador precisa ativar a assinatura para aparecer nas buscas.
                    </p>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
                    Este email foi enviado automaticamente pelo sistema AchaServiço.
                </p>
            </div>
        </div>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [ADMIN_NOTIFICATION_EMAIL],
            "subject": f"🆕 Novo Prestador: {provider_name}",
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Admin notification email sent for new provider: {provider_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send admin notification email: {str(e)}")
        return False

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
    cities: List[str] = ["tres_lagoas"]  # Multiple cities of operation
    neighborhood: str
    description: str
    profile_image: Optional[str] = None  # base64
    service_photos: List[str] = []  # Array of base64 images for service gallery
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
    cities: List[str] = ["tres_lagoas"]  # Multiple cities of operation
    neighborhood: str
    description: str
    profile_image: Optional[str] = None

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    categories: Optional[List[str]] = None  # Multiple categories
    cities: Optional[List[str]] = None  # Multiple cities of operation
    neighborhood: Optional[str] = None
    description: Optional[str] = None
    profile_image: Optional[str] = None
    service_photos: Optional[List[str]] = None  # Array of base64 images for service gallery

class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    provider_id: str
    user_id: str
    # user_name is stored but NOT returned to providers (anonymous)
    user_name: str
    rating: int  # 1-5
    comment: Optional[str] = None
    is_verified: bool = True  # Verified contact via WhatsApp
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    provider_id: str
    rating: int
    comment: Optional[str] = None

# Model to track WhatsApp contacts (for verified reviews)
class WhatsAppContact(BaseModel):
    contact_id: str = Field(default_factory=lambda: f"contact_{uuid.uuid4().hex[:12]}")
    user_id: str
    provider_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    {"id": "fotografo", "name": "Fotógrafo", "icon": "camera"},
    {"id": "montador_moveis", "name": "Montador de Móveis", "icon": "bed"},
    {"id": "taxista", "name": "Taxista", "icon": "car-sport"},
]

NEIGHBORHOODS = [
    "Todos os bairros",  # Option for providers who serve entire city
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

CITIES = [
    {"id": "tres_lagoas", "name": "Três Lagoas", "state": "MS"},
    {"id": "andradina", "name": "Andradina", "state": "SP"},
    {"id": "brasilandia", "name": "Brasilândia", "state": "MS"},
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
                f"{AUTH_BACKEND_URL}/auth/v1/env/oauth/session-data",
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

@api_router.get("/cities")
async def get_cities():
    """Get all available cities"""
    return CITIES

# ======================== SUBSCRIPTION EXPIRATION ========================

async def check_and_expire_subscriptions():
    """Check for expired subscriptions and deactivate them"""
    now = datetime.now(timezone.utc)
    
    # Find providers with expired subscriptions
    expired_providers = await db.providers.find({
        "subscription_status": "active",
        "subscription_expires_at": {"$lt": now}
    }).to_list(1000)
    
    expired_count = 0
    for provider in expired_providers:
        # Update provider status to expired
        await db.providers.update_one(
            {"provider_id": provider["provider_id"]},
            {"$set": {
                "subscription_status": "expired",
                "is_active": False
            }}
        )
        
        # Update subscription record
        await db.subscriptions.update_one(
            {"provider_id": provider["provider_id"], "status": "active"},
            {"$set": {"status": "expired"}}
        )
        
        expired_count += 1
        logger.info(f"Subscription expired for provider: {provider['provider_id']} - {provider['name']}")
    
    return expired_count

# ======================== PROVIDERS ========================

@api_router.get("/providers")
async def get_providers(
    category: Optional[str] = None,
    neighborhood: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all active providers with optional filters"""
    # First, check and expire any overdue subscriptions
    await check_and_expire_subscriptions()
    
    query = {"is_active": True, "subscription_status": "active"}
    
    if category:
        # Search in categories array
        query["categories"] = category
    if city:
        # Search in cities array
        query["cities"] = city
    if neighborhood and neighborhood != "Todos os bairros":
        # Include providers that serve this specific neighborhood OR all neighborhoods
        query["neighborhood"] = {"$in": [neighborhood, "Todos os bairros"]}
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
    
    # Send email notification to admin about new provider registration
    await send_admin_notification_email(
        provider_name=provider.name,
        provider_email=user.email,
        categories=provider.categories,
        cities=provider.cities,
        phone=provider.phone
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
    """Get all reviews for a provider (ANONYMOUS - no user identification)"""
    reviews = await db.reviews.find({"provider_id": provider_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Remove user identification for anonymity
    anonymous_reviews = []
    for review in reviews:
        anonymous_reviews.append({
            "review_id": review.get("review_id"),
            "provider_id": review.get("provider_id"),
            "rating": review.get("rating"),
            "comment": review.get("comment"),
            "is_verified": review.get("is_verified", True),
            "created_at": review.get("created_at")
            # user_id and user_name are NOT included
        })
    
    return anonymous_reviews

@api_router.post("/providers/{provider_id}/contact")
async def register_whatsapp_contact(provider_id: str, request: Request):
    """Register when a user clicks on WhatsApp button (enables reviews)"""
    user = await get_current_user(request)
    
    if not user:
        # Allow anonymous contact but they won't be able to review
        return {"success": True, "can_review": False, "message": "Contato registrado (faça login para avaliar depois)"}
    
    provider = await db.providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    # Check if contact already exists
    existing_contact = await db.whatsapp_contacts.find_one({
        "user_id": user.user_id,
        "provider_id": provider_id
    })
    
    if not existing_contact:
        contact = WhatsAppContact(
            user_id=user.user_id,
            provider_id=provider_id
        )
        await db.whatsapp_contacts.insert_one(contact.model_dump())
    
    return {"success": True, "can_review": True, "message": "Contato registrado, você poderá avaliar este prestador"}

@api_router.get("/providers/{provider_id}/can-review")
async def check_can_review(provider_id: str, request: Request):
    """Check if user can review this provider (must have contacted via WhatsApp)"""
    user = await get_current_user(request)
    
    if not user:
        return {"can_review": False, "reason": "not_authenticated"}
    
    # Check if user already reviewed
    existing_review = await db.reviews.find_one({
        "provider_id": provider_id,
        "user_id": user.user_id
    })
    if existing_review:
        return {"can_review": False, "reason": "already_reviewed"}
    
    # Check if user has contacted this provider
    contact = await db.whatsapp_contacts.find_one({
        "user_id": user.user_id,
        "provider_id": provider_id
    })
    
    if not contact:
        return {"can_review": False, "reason": "no_contact"}
    
    return {"can_review": True, "reason": "eligible"}

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, request: Request):
    """Create a review for a provider (requires auth + WhatsApp contact)"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"provider_id": review_data.provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    # Check if user has contacted this provider via WhatsApp
    contact = await db.whatsapp_contacts.find_one({
        "user_id": user.user_id,
        "provider_id": review_data.provider_id
    })
    if not contact:
        raise HTTPException(
            status_code=403, 
            detail="Você precisa entrar em contato com o prestador pelo WhatsApp antes de avaliar"
        )
    
    # Check if already reviewed
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
        user_name=user.name,  # Stored but not shown to provider
        rating=review_data.rating,
        comment=review_data.comment,
        is_verified=True  # Verified because they contacted via WhatsApp
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    # Update provider average rating using aggregation (optimized)
    pipeline = [
        {"$match": {"provider_id": review_data.provider_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1}
        }}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        avg_rating = result[0]["avg_rating"]
        total_reviews = result[0]["total_reviews"]
    else:
        avg_rating = review_data.rating
        total_reviews = 1
    
    await db.providers.update_one(
        {"provider_id": review_data.provider_id},
        {"$set": {
            "average_rating": round(avg_rating, 1),
            "total_reviews": total_reviews
        }}
    )
    
    # Return anonymous version (without user_id and user_name)
    return {
        "review_id": review.review_id,
        "provider_id": review.provider_id,
        "rating": review.rating,
        "comment": review.comment,
        "is_verified": review.is_verified,
        "created_at": review.created_at.isoformat()
    }

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
    # Check for expired subscriptions first
    await check_and_expire_subscriptions()
    
    total_users = await db.users.count_documents({})
    total_providers = await db.providers.count_documents({})
    active_subscriptions = await db.providers.count_documents({"subscription_status": "active"})
    pending_subscriptions = await db.subscriptions.count_documents({"status": "pending"})
    expired_subscriptions = await db.providers.count_documents({"subscription_status": "expired"})
    total_reviews = await db.reviews.count_documents({})
    
    return {
        "total_users": total_users,
        "total_providers": total_providers,
        "active_subscriptions": active_subscriptions,
        "pending_subscriptions": pending_subscriptions,
        "expired_subscriptions": expired_subscriptions,
        "total_reviews": total_reviews
    }

@api_router.get("/admin/export-excel")
async def export_excel_report():
    """Generate and download Excel report with all providers data"""
    
    # Fetch all data
    providers = await db.providers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    users = await db.users.find({}, {"_id": 0}).to_list(500)
    subscriptions = await db.subscriptions.find({}, {"_id": 0}).to_list(500)
    
    # Create user email map
    user_email_map = {u.get("user_id"): u.get("email") for u in users}
    
    # Create subscription map
    sub_map = {s.get("provider_id"): s for s in subscriptions}
    
    # Create workbook
    wb = Workbook()
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    active_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    pending_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    inactive_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # ==================== SHEET 1: TODOS OS PRESTADORES ====================
    ws1 = wb.active
    ws1.title = "Todos os Prestadores"
    
    headers1 = ["Nome", "Email", "Telefone", "Categorias", "Cidades", "Bairro", "Status", "Data Validade", "Data Cadastro"]
    for col, header in enumerate(headers1, 1):
        cell = ws1.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    for row, provider in enumerate(providers, 2):
        email = user_email_map.get(provider.get("user_id"), "N/A")
        categories = ", ".join(provider.get("categories", []))
        cities = ", ".join([c.replace("_", " ").title() for c in provider.get("cities", [])])
        status = provider.get("subscription_status", "inactive")
        
        expires_at = provider.get("subscription_expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_str = expires_at[:10]
            else:
                expires_str = expires_at.strftime("%d/%m/%Y")
        else:
            expires_str = "N/A"
        
        created_at = provider.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_str = created_at[:10]
            else:
                created_str = created_at.strftime("%d/%m/%Y")
        else:
            created_str = "N/A"
        
        row_data = [
            provider.get("name", ""),
            email,
            provider.get("phone", ""),
            categories,
            cities,
            provider.get("neighborhood", ""),
            status.upper(),
            expires_str,
            created_str
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws1.cell(row=row, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")
            
            # Color by status
            if status == "active":
                cell.fill = active_fill
            elif status == "pending":
                cell.fill = pending_fill
            elif status in ["inactive", "expired"]:
                cell.fill = inactive_fill
    
    # Adjust column widths
    for col in range(1, len(headers1) + 1):
        ws1.column_dimensions[get_column_letter(col)].width = 18
    
    # ==================== SHEET 2: ATIVOS ====================
    ws2 = wb.create_sheet("Ativos")
    active_providers = [p for p in providers if p.get("subscription_status") == "active"]
    
    headers2 = ["Nome", "Email", "Telefone", "WhatsApp", "Categorias", "Cidades", "Data Validade"]
    for col, header in enumerate(headers2, 1):
        cell = ws2.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    for row, provider in enumerate(active_providers, 2):
        email = user_email_map.get(provider.get("user_id"), "N/A")
        phone = provider.get("phone", "")
        whatsapp = f"https://wa.me/55{phone}" if phone else ""
        categories = ", ".join(provider.get("categories", []))
        cities = ", ".join([c.replace("_", " ").title() for c in provider.get("cities", [])])
        
        expires_at = provider.get("subscription_expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_str = expires_at[:10]
            else:
                expires_str = expires_at.strftime("%d/%m/%Y")
        else:
            expires_str = "N/A"
        
        row_data = [provider.get("name", ""), email, phone, whatsapp, categories, cities, expires_str]
        
        for col, value in enumerate(row_data, 1):
            cell = ws2.cell(row=row, column=col, value=value)
            cell.border = thin_border
            cell.fill = active_fill
    
    for col in range(1, len(headers2) + 1):
        ws2.column_dimensions[get_column_letter(col)].width = 20
    
    # ==================== SHEET 3: PENDENTES/INATIVOS ====================
    ws3 = wb.create_sheet("Pendentes e Inativos")
    pending_providers = [p for p in providers if p.get("subscription_status") in ["pending", "inactive", None, "expired"]]
    
    headers3 = ["Nome", "Email", "Telefone", "Status", "Categorias", "Cidades", "Data Cadastro"]
    for col, header in enumerate(headers3, 1):
        cell = ws3.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
        cell.alignment = header_alignment
        cell.border = thin_border
    
    for row, provider in enumerate(pending_providers, 2):
        email = user_email_map.get(provider.get("user_id"), "N/A")
        status = provider.get("subscription_status", "inactive")
        categories = ", ".join(provider.get("categories", []))
        cities = ", ".join([c.replace("_", " ").title() for c in provider.get("cities", [])])
        
        created_at = provider.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_str = created_at[:10]
            else:
                created_str = created_at.strftime("%d/%m/%Y")
        else:
            created_str = "N/A"
        
        row_data = [provider.get("name", ""), email, provider.get("phone", ""), status.upper(), categories, cities, created_str]
        
        for col, value in enumerate(row_data, 1):
            cell = ws3.cell(row=row, column=col, value=value)
            cell.border = thin_border
            if status == "pending":
                cell.fill = pending_fill
            else:
                cell.fill = inactive_fill
    
    for col in range(1, len(headers3) + 1):
        ws3.column_dimensions[get_column_letter(col)].width = 18
    
    # ==================== SHEET 4: RESUMO ====================
    ws4 = wb.create_sheet("Resumo")
    
    total_providers = len(providers)
    total_active = len([p for p in providers if p.get("subscription_status") == "active"])
    total_pending = len([p for p in providers if p.get("subscription_status") == "pending"])
    total_inactive = len([p for p in providers if p.get("subscription_status") in ["inactive", None]])
    total_expired = len([p for p in providers if p.get("subscription_status") == "expired"])
    
    summary_data = [
        ["RESUMO GERAL", ""],
        ["", ""],
        ["Total de Prestadores", total_providers],
        ["Assinaturas Ativas", total_active],
        ["Assinaturas Pendentes", total_pending],
        ["Inativos (sem assinatura)", total_inactive],
        ["Expirados", total_expired],
        ["", ""],
        ["Receita Mensal Potencial", f"R$ {total_active * 15:.2f}"],
        ["", ""],
        ["Data do Relatório", datetime.now().strftime("%d/%m/%Y %H:%M")]
    ]
    
    for row, (label, value) in enumerate(summary_data, 1):
        cell1 = ws4.cell(row=row, column=1, value=label)
        cell2 = ws4.cell(row=row, column=2, value=value)
        
        if row == 1:
            cell1.font = Font(bold=True, size=14)
        elif label and value != "":
            cell1.font = Font(bold=True)
    
    ws4.column_dimensions['A'].width = 30
    ws4.column_dimensions['B'].width = 20
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Generate filename with date
    filename = f"relatorio_achaservico_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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
    """Get all subscriptions with provider details - automatically filters out orphans"""
    subscriptions = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Batch fetch all providers to avoid N+1 query
    provider_ids = [sub.get("provider_id") for sub in subscriptions if sub.get("provider_id")]
    providers = await db.providers.find({"provider_id": {"$in": provider_ids}}, {"_id": 0}).to_list(500)
    provider_map = {p["provider_id"]: p for p in providers}
    
    result = []
    orphan_ids = []
    
    for sub in subscriptions:
        provider = provider_map.get(sub.get("provider_id"))
        if provider:
            # Only include subscriptions with valid providers
            result.append({
                "subscription": sub,
                "provider": provider
            })
        else:
            # Track orphan subscriptions for cleanup
            orphan_ids.append(sub.get("provider_id"))
    
    # Auto-cleanup orphan subscriptions in background
    if orphan_ids:
        for orphan_id in orphan_ids:
            await db.subscriptions.delete_one({"provider_id": orphan_id})
        logger.info(f"Auto-cleaned {len(orphan_ids)} orphan subscriptions")
    
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
    
    # Batch fetch all providers to avoid N+1 query
    provider_ids = [sub.get("provider_id") for sub in pending if sub.get("provider_id")]
    providers = await db.providers.find({"provider_id": {"$in": provider_ids}}, {"_id": 0}).to_list(100)
    provider_map = {p["provider_id"]: p for p in providers}
    
    result = []
    for sub in pending:
        provider = provider_map.get(sub.get("provider_id"))
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
    now = datetime.now(timezone.utc)
    
    # Create or update subscription with full document
    await db.subscriptions.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "provider_id": provider_id,
            "user_id": provider.get("user_id"),
            "status": "active",
            "amount": 15.0,
            "started_at": now,
            "expires_at": expires_at,
            "created_at": now,
            "updated_at": now
        }},
        upsert=True
    )
    
    # Update provider status
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "subscription_status": "active",
            "subscription_expires_at": expires_at,
            "is_active": True
        }}
    )
    
    logger.info(f"Subscription activated for provider: {provider_id} - {provider['name']}")
    
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

@api_router.post("/admin/check-expired")
async def admin_check_expired_subscriptions():
    """Manually check and expire overdue subscriptions"""
    expired_count = await check_and_expire_subscriptions()
    
    # Get list of expired providers
    expired_providers = await db.providers.find(
        {"subscription_status": "expired"},
        {"_id": 0, "provider_id": 1, "name": 1, "subscription_expires_at": 1}
    ).to_list(100)
    
    return {
        "success": True,
        "expired_count": expired_count,
        "message": f"{expired_count} assinatura(s) expirada(s) foram desativadas",
        "expired_providers": expired_providers
    }

@api_router.get("/admin/expired-subscriptions")
async def get_expired_subscriptions():
    """Get all expired subscriptions that can be renewed"""
    expired = await db.providers.find(
        {"subscription_status": "expired"},
        {"_id": 0}
    ).to_list(100)
    
    # Batch fetch subscriptions to avoid N+1 query
    provider_ids = [p["provider_id"] for p in expired]
    subscriptions = await db.subscriptions.find(
        {"provider_id": {"$in": provider_ids}},
        {"_id": 0}
    ).to_list(100)
    subscription_map = {s["provider_id"]: s for s in subscriptions}
    
    result = []
    for provider in expired:
        subscription = subscription_map.get(provider["provider_id"])
        result.append({
            "provider": provider,
            "subscription": subscription
        })
    
    return result

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

@api_router.delete("/admin/cleanup-orphan-subscriptions")
async def admin_cleanup_orphan_subscriptions():
    """Delete subscriptions that don't have a corresponding provider"""
    # Get all subscriptions
    all_subscriptions = await db.subscriptions.find({}, {"_id": 0, "provider_id": 1}).to_list(1000)
    
    # Get all provider IDs
    all_providers = await db.providers.find({}, {"_id": 0, "provider_id": 1}).to_list(1000)
    provider_ids = {p["provider_id"] for p in all_providers}
    
    # Find orphan subscriptions
    orphan_count = 0
    for sub in all_subscriptions:
        if sub.get("provider_id") not in provider_ids:
            await db.subscriptions.delete_one({"provider_id": sub["provider_id"]})
            orphan_count += 1
    
    return {"success": True, "deleted_count": orphan_count, "message": f"{orphan_count} assinaturas órfãs removidas"}

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
    
    # Update provider rating using aggregation (optimized)
    provider_id = review.get("provider_id")
    if provider_id:
        pipeline = [
            {"$match": {"provider_id": provider_id}},
            {"$group": {
                "_id": None,
                "avg_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }}
        ]
        result = await db.reviews.aggregate(pipeline).to_list(1)
        
        if result:
            avg_rating = result[0]["avg_rating"]
            total_reviews = result[0]["total_reviews"]
            await db.providers.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "average_rating": round(avg_rating, 1),
                    "total_reviews": total_reviews
                }}
            )
        else:
            await db.providers.update_one(
                {"provider_id": provider_id},
                {"$set": {"average_rating": 0, "total_reviews": 0}}
            )
    
    return {"success": True, "message": "Avaliação excluída"}

# ======================== MERCADO PAGO CHECKOUT PRO ========================

@api_router.post("/mercadopago/create-pix")
async def create_mercadopago_checkout(request: Request):
    """Create a Mercado Pago Checkout Pro preference for PIX/Card payment"""
    user = await require_auth(request)
    
    if not mp_sdk:
        raise HTTPException(status_code=500, detail="Mercado Pago não configurado")
    
    # Get provider
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Perfil de prestador não encontrado")
    
    # Check if already has active subscription
    if provider.get("subscription_status") == "active":
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa")
    
    provider_id = provider.get("provider_id")
    
    try:
        # Create Checkout Pro preference (supports PIX, Card, etc.)
        preference_data = {
            "items": [
                {
                    "title": "Assinatura Mensal AchaServiço",
                    "description": f"Assinatura para {provider.get('name')}",
                    "quantity": 1,
                    "unit_price": 15.00,
                    "currency_id": "BRL"
                }
            ],
            "payer": {
                "email": user.email,
                "name": provider.get("name", "Cliente")
            },
            "payment_methods": {
                "excluded_payment_types": [],
                "installments": 1
            },
            "back_urls": {
                "success": f"{APP_DOMAIN}/api/mercadopago/callback?status=success&provider_id={provider_id}",
                "failure": f"{APP_DOMAIN}/api/mercadopago/callback?status=failure&provider_id={provider_id}",
                "pending": f"{APP_DOMAIN}/api/mercadopago/callback?status=pending&provider_id={provider_id}"
            },
            "auto_return": "approved",
            "external_reference": provider_id,
            "notification_url": f"{APP_DOMAIN}/api/mercadopago/webhook",
            "statement_descriptor": "ACHASERVICO"
        }
        
        preference_response = mp_sdk.preference().create(preference_data)
        preference = preference_response.get("response", {})
        
        if preference_response.get("status") not in [200, 201]:
            logger.error(f"Mercado Pago preference error: {preference_response}")
            raise HTTPException(status_code=400, detail="Erro ao criar preferência de pagamento")
        
        preference_id = preference.get("id")
        init_point = preference.get("init_point")  # Production URL
        sandbox_init_point = preference.get("sandbox_init_point")  # Sandbox URL
        
        # Store preference reference
        await db.mp_payments.insert_one({
            "preference_id": preference_id,
            "provider_id": provider_id,
            "user_id": user.user_id,
            "status": "pending",
            "amount": 15.00,
            "created_at": datetime.now(timezone.utc)
        })
        
        logger.info(f"Mercado Pago Checkout created for provider: {provider_id} - Preference ID: {preference_id}")
        
        return {
            "success": True,
            "preference_id": preference_id,
            "checkout_url": init_point,  # Use production URL
            "sandbox_url": sandbox_init_point
        }
        
    except Exception as e:
        logger.error(f"Error creating Mercado Pago Checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar pagamento: {str(e)}")

@api_router.get("/mercadopago/callback")
async def mercadopago_callback(
    status: str = "unknown",
    provider_id: str = None,
    collection_id: str = None,
    collection_status: str = None,
    payment_id: str = None,
    external_reference: str = None
):
    """Handle Mercado Pago redirect callback after payment"""
    logger.info(f"Mercado Pago callback: status={status}, provider_id={provider_id}, payment_id={payment_id}, collection_status={collection_status}")
    
    # Use external_reference as provider_id if not provided
    if not provider_id and external_reference:
        provider_id = external_reference
    
    if status == "success" or collection_status == "approved":
        # Payment was successful - activate subscription
        if provider_id:
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            now = datetime.now(timezone.utc)
            
            # Update subscription
            await db.subscriptions.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "provider_id": provider_id,
                    "status": "active",
                    "amount": 15.0,
                    "payment_method": "mercadopago",
                    "mp_payment_id": str(payment_id or collection_id),
                    "started_at": now,
                    "expires_at": expires_at,
                    "updated_at": now
                }},
                upsert=True
            )
            
            # Update provider status
            await db.providers.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "subscription_status": "active",
                    "subscription_expires_at": expires_at,
                    "is_active": True
                }}
            )
            
            # Update stored payment
            await db.mp_payments.update_one(
                {"provider_id": provider_id, "status": "pending"},
                {"$set": {"status": "approved", "payment_id": str(payment_id or collection_id), "approved_at": now}}
            )
            
            logger.info(f"Mercado Pago subscription activated via callback for provider: {provider_id}")
        
        # Redirect to success page or deep link
        return HTMLResponse(content=f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Confirmado</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0A0A0A; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }}
                .container {{ text-align: center; padding: 40px; }}
                .icon {{ font-size: 80px; margin-bottom: 20px; }}
                h1 {{ color: #10B981; margin-bottom: 10px; }}
                p {{ color: #9CA3AF; margin-bottom: 30px; }}
                .btn {{ background: #10B981; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>Pagamento Confirmado!</h1>
                <p>Sua assinatura foi ativada com sucesso.<br>Você já pode voltar para o aplicativo.</p>
                <a href="achaservico://dashboard" class="btn">Voltar para o App</a>
            </div>
        </body>
        </html>
        """, status_code=200)
    
    elif status == "pending" or collection_status == "pending":
        return HTMLResponse(content=f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Pendente</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0A0A0A; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }}
                .container {{ text-align: center; padding: 40px; }}
                .icon {{ font-size: 80px; margin-bottom: 20px; }}
                h1 {{ color: #F59E0B; margin-bottom: 10px; }}
                p {{ color: #9CA3AF; margin-bottom: 30px; }}
                .btn {{ background: #F59E0B; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">⏳</div>
                <h1>Pagamento Pendente</h1>
                <p>Seu pagamento está sendo processado.<br>Você receberá uma notificação quando for confirmado.</p>
                <a href="achaservico://dashboard" class="btn">Voltar para o App</a>
            </div>
        </body>
        </html>
        """, status_code=200)
    
    else:
        return HTMLResponse(content=f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Não Concluído</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0A0A0A; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }}
                .container {{ text-align: center; padding: 40px; }}
                .icon {{ font-size: 80px; margin-bottom: 20px; }}
                h1 {{ color: #EF4444; margin-bottom: 10px; }}
                p {{ color: #9CA3AF; margin-bottom: 30px; }}
                .btn {{ background: #374151; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>Pagamento Não Concluído</h1>
                <p>O pagamento não foi finalizado.<br>Tente novamente pelo aplicativo.</p>
                <a href="achaservico://dashboard" class="btn">Voltar para o App</a>
            </div>
        </body>
        </html>
        """, status_code=200)

@api_router.get("/mercadopago/payment-status/{payment_id}")
async def get_mercadopago_payment_status(payment_id: str):
    """Check the status of a Mercado Pago payment"""
    if not mp_sdk:
        raise HTTPException(status_code=500, detail="Mercado Pago não configurado")
    
    try:
        payment_response = mp_sdk.payment().get(payment_id)
        payment = payment_response.get("response", {})
        
        return {
            "payment_id": payment.get("id"),
            "status": payment.get("status"),
            "status_detail": payment.get("status_detail"),
            "approved": payment.get("status") == "approved"
        }
    except Exception as e:
        logger.error(f"Error checking Mercado Pago payment: {str(e)}")
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

@api_router.post("/mercadopago/webhook")
async def mercadopago_webhook(request: Request):
    """Handle Mercado Pago webhooks for payment notifications"""
    try:
        body = await request.json()
        logger.info(f"Mercado Pago webhook received: {body}")
        
        action = body.get("action")
        data = body.get("data", {})
        payment_id = data.get("id")
        
        if action == "payment.updated" or action == "payment.created":
            if payment_id and mp_sdk:
                # Get payment details
                payment_response = mp_sdk.payment().get(payment_id)
                payment = payment_response.get("response", {})
                
                if payment.get("status") == "approved":
                    # Get provider_id from metadata or stored payment
                    metadata = payment.get("metadata", {})
                    provider_id = metadata.get("provider_id")
                    
                    if not provider_id:
                        # Try to find from stored payment
                        stored_payment = await db.mp_payments.find_one({"payment_id": str(payment_id)})
                        if stored_payment:
                            provider_id = stored_payment.get("provider_id")
                    
                    if provider_id:
                        # Activate subscription
                        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                        now = datetime.now(timezone.utc)
                        
                        # Create/update subscription
                        await db.subscriptions.update_one(
                            {"provider_id": provider_id},
                            {"$set": {
                                "provider_id": provider_id,
                                "status": "active",
                                "amount": 15.0,
                                "payment_method": "mercadopago_pix",
                                "mp_payment_id": str(payment_id),
                                "started_at": now,
                                "expires_at": expires_at,
                                "created_at": now,
                                "updated_at": now
                            }},
                            upsert=True
                        )
                        
                        # Update provider status
                        await db.providers.update_one(
                            {"provider_id": provider_id},
                            {"$set": {
                                "subscription_status": "active",
                                "subscription_expires_at": expires_at,
                                "is_active": True
                            }}
                        )
                        
                        # Update stored payment
                        await db.mp_payments.update_one(
                            {"payment_id": str(payment_id)},
                            {"$set": {"status": "approved", "approved_at": now}}
                        )
                        
                        logger.info(f"Mercado Pago subscription activated for provider: {provider_id}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error processing Mercado Pago webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.post("/mercadopago/activate-from-payment")
async def activate_from_mercadopago_payment(request: Request):
    """Manually activate subscription from Mercado Pago payment (fallback)"""
    user = await require_auth(request)
    
    body = await request.json()
    payment_id = body.get("payment_id")
    
    if not payment_id or not mp_sdk:
        raise HTTPException(status_code=400, detail="Payment ID é obrigatório")
    
    try:
        # Get payment from Mercado Pago
        payment_response = mp_sdk.payment().get(payment_id)
        payment = payment_response.get("response", {})
        
        if payment.get("status") != "approved":
            raise HTTPException(status_code=400, detail="Pagamento não foi aprovado")
        
        # Get provider
        provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
        if not provider:
            raise HTTPException(status_code=404, detail="Prestador não encontrado")
        
        provider_id = provider.get("provider_id")
        
        # Check if already active
        if provider.get("subscription_status") == "active":
            return {"success": True, "message": "Assinatura já está ativa", "already_active": True}
        
        # Activate subscription
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        now = datetime.now(timezone.utc)
        
        await db.subscriptions.update_one(
            {"provider_id": provider_id},
            {"$set": {
                "provider_id": provider_id,
                "status": "active",
                "amount": 15.0,
                "payment_method": "mercadopago_pix",
                "mp_payment_id": str(payment_id),
                "started_at": now,
                "expires_at": expires_at,
                "updated_at": now
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
        
        logger.info(f"Mercado Pago subscription manually activated for provider: {provider_id}")
        
        return {"success": True, "message": "Assinatura ativada com sucesso!", "expires_at": expires_at.isoformat()}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating from Mercado Pago: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao ativar assinatura: {str(e)}")

# ======================== STRIPE PAYMENTS ========================

@api_router.post("/stripe/create-checkout-session")
async def create_stripe_checkout_session(request: Request):
    """Create a Stripe Checkout session for subscription payment"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=400, detail="Você precisa criar um perfil de prestador primeiro")
    
    # Check if already has active subscription
    if provider.get("subscription_status") == "active":
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa")
    
    try:
        # Create Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'brl',
                    'product_data': {
                        'name': 'Assinatura Mensal AchaServiço',
                        'description': 'Acesso completo para prestadores de serviços em Três Lagoas',
                    },
                    'unit_amount': 1500,  # R$ 15.00 in centavos
                },
                'quantity': 1,
            }],
            mode='payment',
            # Use backend URL for return, which will redirect to app via JavaScript
            success_url=f"{APP_DOMAIN}/api/stripe/payment-complete?session_id={{CHECKOUT_SESSION_ID}}&status=success",
            cancel_url=f"{APP_DOMAIN}/api/stripe/payment-complete?status=cancelled",
            metadata={
                'provider_id': provider['provider_id'],
                'user_id': user.user_id,
            },
            customer_email=user.email,
        )
        
        logger.info(f"Stripe checkout session created for provider: {provider['provider_id']}")
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar pagamento: {str(e)}")

@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    # If webhook secret is set, verify signature
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No webhook secret - parse JSON directly (for testing)
        try:
            event = stripe.Event.construct_from(
                await request.json(), stripe.api_key
            )
        except Exception as e:
            logger.error(f"Error parsing event: {e}")
            raise HTTPException(status_code=400, detail="Invalid event")
    
    # Store webhook for audit
    await db.webhooks.insert_one({
        "type": "stripe",
        "event_type": event.type,
        "event_id": event.id,
        "data": event.data.object if hasattr(event.data, 'object') else str(event.data),
        "received_at": datetime.now(timezone.utc),
        "processed": False
    })
    
    # Handle checkout.session.completed
    if event.type == 'checkout.session.completed':
        session = event.data.object
        provider_id = session.metadata.get('provider_id')
        user_id = session.metadata.get('user_id')
        
        if provider_id:
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            now = datetime.now(timezone.utc)
            
            # Create or update subscription
            await db.subscriptions.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "provider_id": provider_id,
                    "user_id": user_id,
                    "status": "active",
                    "amount": 15.0,
                    "payment_method": "stripe",
                    "stripe_session_id": session.id,
                    "stripe_payment_intent": session.payment_intent,
                    "started_at": now,
                    "expires_at": expires_at,
                    "created_at": now,
                    "updated_at": now
                }},
                upsert=True
            )
            
            # Activate provider
            await db.providers.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "subscription_status": "active",
                    "subscription_expires_at": expires_at,
                    "is_active": True
                }}
            )
            
            logger.info(f"Stripe payment completed - Provider {provider_id} activated until {expires_at}")
            
            # Mark webhook as processed
            await db.webhooks.update_one(
                {"event_id": event.id},
                {"$set": {"processed": True}}
            )
    
    elif event.type == 'payment_intent.payment_failed':
        logger.warning(f"Payment failed: {event.data.object}")
    
    return {"status": "ok"}

@api_router.get("/stripe/payment-complete", response_class=HTMLResponse)
async def stripe_payment_complete(session_id: str = None, status: str = "success"):
    """HTML page shown after Stripe payment - instructs user to close browser and return to app"""
    
    if status == "success" and session_id:
        # Try to activate subscription automatically
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.payment_status == 'paid':
                provider_id = session.metadata.get('provider_id')
                if provider_id:
                    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
                    if provider and provider.get("subscription_status") != "active":
                        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                        now = datetime.now(timezone.utc)
                        
                        await db.subscriptions.update_one(
                            {"provider_id": provider_id},
                            {"$set": {
                                "provider_id": provider_id,
                                "user_id": provider.get("user_id"),
                                "status": "active",
                                "amount": 15.0,
                                "payment_method": "stripe",
                                "stripe_session_id": session.id,
                                "started_at": now,
                                "expires_at": expires_at,
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
                        logger.info(f"Subscription auto-activated for provider: {provider_id}")
        except Exception as e:
            logger.error(f"Error auto-activating subscription: {e}")
    
    # Return HTML page
    if status == "success":
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Confirmado - AchaServiço</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    padding: 20px;
                }
                .container {
                    text-align: center;
                    max-width: 400px;
                }
                .icon {
                    width: 80px;
                    height: 80px;
                    background: #10B981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 40px;
                }
                h1 {
                    font-size: 28px;
                    margin-bottom: 16px;
                    color: #10B981;
                }
                p {
                    font-size: 16px;
                    color: #9CA3AF;
                    margin-bottom: 32px;
                    line-height: 1.5;
                }
                .btn {
                    background: #10B981;
                    color: white;
                    border: none;
                    padding: 16px 32px;
                    font-size: 18px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    width: 100%;
                    max-width: 280px;
                }
                .btn:active { background: #059669; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✓</div>
                <h1>Pagamento Confirmado!</h1>
                <p>Sua assinatura foi ativada com sucesso. Agora você pode receber contatos de clientes.</p>
                <button class="btn" onclick="window.close()">Fechar e Voltar ao App</button>
                <p style="margin-top: 20px; font-size: 14px;">Se o botão não funcionar, feche esta aba manualmente.</p>
            </div>
        </body>
        </html>
        """
    else:
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Cancelado - AchaServiço</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    padding: 20px;
                }
                .container { text-align: center; max-width: 400px; }
                .icon {
                    width: 80px; height: 80px;
                    background: #EF4444;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 40px;
                }
                h1 { font-size: 28px; margin-bottom: 16px; color: #EF4444; }
                p { font-size: 16px; color: #9CA3AF; margin-bottom: 32px; }
                .btn {
                    background: #374151; color: white; border: none;
                    padding: 16px 32px; font-size: 18px; border-radius: 12px;
                    cursor: pointer; font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✕</div>
                <h1>Pagamento Cancelado</h1>
                <p>O pagamento foi cancelado. Você pode tentar novamente quando quiser.</p>
                <button class="btn" onclick="window.close()">Fechar e Voltar ao App</button>
            </div>
        </body>
        </html>
        """
    
    return HTMLResponse(content=html_content)

@api_router.get("/stripe/payment-status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    """Check the status of a Stripe payment session"""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        logger.info(f"Payment status check for session {session_id}: status={session.payment_status}")
        
        return {
            "status": session.payment_status,
            "provider_id": session.metadata.get('provider_id'),
            "completed": session.payment_status == 'paid'
        }
    except stripe.error.StripeError as e:
        logger.error(f"Error retrieving session: {e}")
        raise HTTPException(status_code=404, detail="Sessão não encontrada")

class ActivateFromSessionRequest(BaseModel):
    session_id: str

@api_router.post("/stripe/activate-from-session")
async def activate_from_stripe_session(data: ActivateFromSessionRequest, request: Request):
    """Manually activate subscription from Stripe session (fallback when webhook doesn't work)"""
    # Note: Authentication is done via Stripe session verification, not user token
    # This allows activation even if session was lost during Stripe redirect
    
    try:
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(data.session_id)
        
        # Verify payment was successful
        if session.payment_status != 'paid':
            raise HTTPException(status_code=400, detail="Pagamento não foi concluído")
        
        # Get provider info from session metadata
        provider_id = session.metadata.get('provider_id')
        session_user_id = session.metadata.get('user_id')
        
        if not provider_id:
            raise HTTPException(status_code=400, detail="Sessão inválida - provider_id não encontrado")
        
        # Get the provider (using provider_id from session metadata for security)
        provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
        if not provider:
            raise HTTPException(status_code=404, detail="Prestador não encontrado")
        
        # Check if already activated
        if provider.get("subscription_status") == "active":
            return {"success": True, "message": "Assinatura já está ativa", "already_active": True}
        
        # Activate the subscription
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        now = datetime.now(timezone.utc)
        
        # Create or update subscription record
        await db.subscriptions.update_one(
            {"provider_id": provider_id},
            {"$set": {
                "provider_id": provider_id,
                "user_id": session_user_id or provider.get("user_id"),
                "status": "active",
                "amount": 15.0,
                "payment_method": "stripe",
                "stripe_session_id": session.id,
                "stripe_payment_intent": session.payment_intent,
                "started_at": now,
                "expires_at": expires_at,
                "created_at": now,
                "updated_at": now
            }},
            upsert=True
        )
        
        # Activate provider
        await db.providers.update_one(
            {"provider_id": provider_id},
            {"$set": {
                "subscription_status": "active",
                "subscription_expires_at": expires_at,
                "is_active": True
            }}
        )
        
        logger.info(f"Stripe subscription manually activated for provider: {provider_id} - {provider.get('name')}")
        
        return {"success": True, "message": "Assinatura ativada com sucesso!", "expires_at": expires_at.isoformat()}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error checking session: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao verificar pagamento: {str(e)}")

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
