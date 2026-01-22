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

# Mercado Pago SDK
mp_access_token = os.environ.get('MERCADO_PAGO_ACCESS_TOKEN', '')
mp_public_key = os.environ.get('MERCADO_PAGO_PUBLIC_KEY', '')
sdk = mercadopago.SDK(mp_access_token) if mp_access_token else None

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
    category: str
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
    category: str
    neighborhood: str
    description: str
    profile_image: Optional[str] = None

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
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
        query["category"] = category
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

# ======================== MERCADO PAGO SUBSCRIPTIONS ========================

@api_router.get("/payments/public-key")
async def get_public_key():
    """Get Mercado Pago public key for frontend"""
    return {"public_key": mp_public_key}

@api_router.post("/subscriptions/create")
async def create_subscription(request: Request):
    """Create a subscription payment preference with Mercado Pago"""
    user = await require_auth(request)
    
    provider = await db.providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=400, detail="Você precisa criar um perfil de prestador primeiro")
    
    if not sdk:
        raise HTTPException(status_code=500, detail="Mercado Pago não configurado")
    
    # Create payment preference with PIX enabled
    preference_data = {
        "items": [
            {
                "id": f"sub_{provider['provider_id']}",
                "title": "Assinatura Mensal AchaServico",
                "description": "Assinatura mensal para prestadores - Tres Lagoas/MS",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": 15.00
            }
        ],
        "payer": {
            "email": user.email
        },
        "back_urls": {
            "success": "https://achaservico.preview.emergentagent.com/payment/success",
            "failure": "https://achaservico.preview.emergentagent.com/payment/failure",
            "pending": "https://achaservico.preview.emergentagent.com/payment/pending"
        },
        "auto_return": "approved",
        "external_reference": f"{user.user_id}|{provider['provider_id']}",
        "statement_descriptor": "ACHASERVICO",
        "payment_methods": {
            "default_payment_method_id": "pix",
            "excluded_payment_types": [],
            "excluded_payment_methods": [],
            "installments": 1
        }
    }
    
    try:
        preference_response = sdk.preference().create(preference_data)
        
        if preference_response["status"] != 201:
            logger.error(f"Mercado Pago error: {preference_response}")
            raise HTTPException(status_code=500, detail="Erro ao criar preferência de pagamento")
        
        preference = preference_response["response"]
        
        # Create pending subscription record
        subscription = Subscription(
            provider_id=provider["provider_id"],
            user_id=user.user_id,
            mp_preference_id=preference["id"],
            status="pending"
        )
        
        await db.subscriptions.insert_one(subscription.model_dump())
        
        # Update provider with preference ID
        await db.providers.update_one(
            {"provider_id": provider["provider_id"]},
            {"$set": {"mp_preference_id": preference["id"]}}
        )
        
        return {
            "success": True,
            "preference_id": preference["id"],
            "init_point": preference["init_point"],
            "sandbox_init_point": preference["sandbox_init_point"],
            "subscription_id": subscription.subscription_id,
            "amount": 15.00
        }
        
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar assinatura: {str(e)}")

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

# ======================== WEBHOOKS ========================

@api_router.post("/webhooks/mercadopago")
async def mercadopago_webhook(request: Request):
    """Handle Mercado Pago webhook notifications"""
    try:
        body = await request.json()
        logger.info(f"Webhook received: {body}")
        
        # Store webhook for audit
        await db.webhooks.insert_one({
            "type": "mercadopago",
            "data": body,
            "received_at": datetime.now(timezone.utc),
            "processed": False
        })
        
        # Process payment notification
        if body.get("type") == "payment":
            payment_id = body.get("data", {}).get("id")
            
            if payment_id and sdk:
                # Get payment details from Mercado Pago
                payment_response = sdk.payment().get(payment_id)
                
                if payment_response["status"] == 200:
                    payment_data = payment_response["response"]
                    external_ref = payment_data.get("external_reference", "")
                    status = payment_data.get("status")
                    
                    if "|" in external_ref:
                        user_id, provider_id = external_ref.split("|")
                        
                        if status == "approved":
                            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                            
                            # Update subscription
                            await db.subscriptions.update_one(
                                {"provider_id": provider_id},
                                {"$set": {
                                    "status": "active",
                                    "mp_payment_id": str(payment_id),
                                    "started_at": datetime.now(timezone.utc),
                                    "expires_at": expires_at
                                }}
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
                            
                            logger.info(f"Subscription activated for provider {provider_id}")
                        
                        elif status in ["rejected", "cancelled"]:
                            await db.subscriptions.update_one(
                                {"provider_id": provider_id},
                                {"$set": {"status": "cancelled"}}
                            )
                            logger.info(f"Subscription cancelled for provider {provider_id}")
        
        # Mark webhook as processed
        await db.webhooks.update_one(
            {"data.id": body.get("data", {}).get("id")},
            {"$set": {"processed": True}}
        )
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ======================== PAYMENT CALLBACKS ========================

@api_router.get("/payment/success")
async def payment_success(
    collection_id: Optional[str] = None,
    collection_status: Optional[str] = None,
    payment_id: Optional[str] = None,
    status: Optional[str] = None,
    external_reference: Optional[str] = None,
    preference_id: Optional[str] = None
):
    """Handle successful payment redirect"""
    logger.info(f"Payment success callback: payment_id={payment_id}, status={status}, ref={external_reference}")
    
    if external_reference and "|" in external_reference and status == "approved":
        user_id, provider_id = external_reference.split("|")
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        await db.subscriptions.update_one(
            {"provider_id": provider_id},
            {"$set": {
                "status": "active",
                "mp_payment_id": payment_id,
                "started_at": datetime.now(timezone.utc),
                "expires_at": expires_at
            }}
        )
        
        await db.providers.update_one(
            {"provider_id": provider_id},
            {"$set": {
                "subscription_status": "active",
                "subscription_expires_at": expires_at,
                "is_active": True
            }}
        )
    
    return {"status": "success", "message": "Pagamento aprovado! Sua assinatura foi ativada."}

@api_router.get("/payment/failure")
async def payment_failure():
    """Handle failed payment redirect"""
    return {"status": "failure", "message": "Pagamento não foi aprovado. Tente novamente."}

@api_router.get("/payment/pending")
async def payment_pending():
    """Handle pending payment redirect"""
    return {"status": "pending", "message": "Pagamento pendente. Aguarde a confirmação."}

# ======================== ROOT ========================

@api_router.get("/")
async def root():
    return {
        "message": "AchaServiço API",
        "version": "1.0.0",
        "city": "Três Lagoas - MS",
        "mercadopago": "configured" if sdk else "not configured"
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
