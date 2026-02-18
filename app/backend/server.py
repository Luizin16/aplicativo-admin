"from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
import os
import logging
from pathlib import Path
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = \"HS256\"
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix=\"/api\")

# ==================== MODELS ====================

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError(\"Invalid ObjectId\")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, schema, handler):
        schema.update(type=\"string\")
        return schema

# User Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nome: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    nome: str
    token: str

# Cliente Models
class ClienteCreate(BaseModel):
    tipo: str  # \"PF\" ou \"PJ\"
    nome: str
    cpf_cnpj: str
    telefone: Optional[str] = \"\"
    email: Optional[str] = \"\"
    endereco: Optional[str] = \"\"
    observacoes: Optional[str] = \"\"
    tags: Optional[List[str]] = []

class Cliente(ClienteCreate):
    id: str
    historico_atendimentos: List[dict] = []
    criado_em: datetime

class AtendimentoCreate(BaseModel):
    descricao: str

# Caso Models
class CasoCreate(BaseModel):
    titulo: str
    area: str  # \"família\", \"cível\", \"trabalhista\", etc.
    numero_processo: Optional[str] = \"\"
    tribunal: Optional[str] = \"\"
    vara: Optional[str] = \"\"
    comarca: Optional[str] = \"\"
    partes: Optional[str] = \"\"
    status: str = \"novo\"  # \"novo\", \"em andamento\", \"aguardando\", \"concluído\"
    prioridade: str = \"media\"  # \"baixa\", \"media\", \"alta\"
    proxima_acao: Optional[str] = \"\"
    cliente_id: str

class Caso(CasoCreate):
    id: str
    timeline: List[dict] = []
    anexos: List[str] = []
    criado_em: datetime

class MovimentacaoCreate(BaseModel):
    descricao: str

# Prazo Models
class PrazoCreate(BaseModel):
    tipo: str  # \"prazo\", \"audiência\", \"reunião\"
    titulo: str
    data: str  # ISO format
    hora: str
    descricao: Optional[str] = \"\"
    caso_id: Optional[str] = None
    cliente_id: Optional[str] = None
    lembretes: List[int] = [7, 3, 1]  # dias antes

class Prazo(PrazoCreate):
    id: str
    criado_em: datetime

# Tarefa Models
class TarefaCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = \"\"
    data: Optional[str] = None
    prioridade: str = \"media\"
    status: str = \"a_fazer\"  # \"a_fazer\", \"fazendo\", \"concluido\"
    caso_id: Optional[str] = None
    cliente_id: Optional[str] = None

class Tarefa(TarefaCreate):
    id: str
    criado_em: datetime

# Documento Models
class DocumentoCreate(BaseModel):
    nome: str
    tipo: str
    conteudo_base64: str
    caso_id: Optional[str] = None
    cliente_id: Optional[str] = None

class Documento(DocumentoCreate):
    id: str
    criado_em: datetime

# Financeiro Models
class FinanceiroCreate(BaseModel):
    tipo: str  # \"receber\" ou \"pagar\"
    descricao: str
    valor: float
    categoria: str  # \"honorários\", \"custas\", \"despesas\"
    status: str = \"pendente\"  # \"pendente\", \"pago\", \"atrasado\"
    data_vencimento: str
    data_pagamento: Optional[str] = None
    caso_id: Optional[str] = None
    cliente_id: Optional[str] = None

class Financeiro(FinanceiroCreate):
    id: str
    criado_em: datetime

# Dashboard Models
class DashboardStats(BaseModel):
    prazos_hoje: int
    prazos_semana: int
    tarefas_pendentes: int
    processos_ativos: int
    contas_receber_mes: float
    contas_atrasadas: float
    alertas: List[dict]

# ==================== AUTH FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        \"user_id\": user_id,
        \"exp\": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload[\"user_id\"]
    except:
        raise HTTPException(status_code=401, detail=\"Token inválido\")

# ==================== AUTH ROUTES ====================

@api_router.post(\"/auth/register\", response_model=UserResponse)
async def register(user: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({\"email\": user.email})
    if existing:
        raise HTTPException(status_code=400, detail=\"Email já cadastrado\")
    
    # Create user
    user_dict = {
        \"email\": user.email,
        \"senha_hash\": hash_password(user.password),
        \"nome\": user.nome,
        \"criado_em\": datetime.utcnow()
    }
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    token = create_token(user_id)
    
    return UserResponse(
        id=user_id,
        email=user.email,
        nome=user.nome,
        token=token
    )

@api_router.post(\"/auth/login\", response_model=UserResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({\"email\": credentials.email})
    if not user or not verify_password(credentials.password, user[\"senha_hash\"]):
        raise HTTPException(status_code=401, detail=\"Email ou senha inválidos\")
    
    token = create_token(str(user[\"_id\"]))
    
    return UserResponse(
        id=str(user[\"_id\"]),
        email=user[\"email\"],
        nome=user[\"nome\"],
        token=token
    )

# ==================== CLIENTE ROUTES ====================

@api_router.post(\"/clientes\", response_model=Cliente)
async def criar_cliente(cliente: ClienteCreate, user_id: str = Depends(get_current_user)):
    cliente_dict = cliente.dict()
    cliente_dict[\"user_id\"] = user_id
    cliente_dict[\"historico_atendimentos\"] = []
    cliente_dict[\"criado_em\"] = datetime.utcnow()
    
    result = await db.clientes.insert_one(cliente_dict)
    cliente_dict[\"id\"] = str(result.inserted_id)
    
    return Cliente(**cliente_dict)

@api_router.get(\"/clientes\", response_model=List[Cliente])
async def listar_clientes(user_id: str = Depends(get_current_user)):
    clientes = await db.clientes.find({\"user_id\": user_id}).to_list(1000)
    return [Cliente(id=str(c[\"_id\"]), **{k: v for k, v in c.items() if k != \"_id\"}) for c in clientes]

@api_router.get(\"/clientes/{cliente_id}\", response_model=Cliente)
async def obter_cliente(cliente_id: str, user_id: str = Depends(get_current_user)):
    cliente = await db.clientes.find_one({\"_id\": ObjectId(cliente_id), \"user_id\": user_id})
    if not cliente:
        raise HTTPException(status_code=404, detail=\"Cliente não encontrado\")
    return Cliente(id=str(cliente[\"_id\"]), **{k: v for k, v in cliente.items() if k != \"_id\"})

@api_router.put(\"/clientes/{cliente_id}\", response_model=Cliente)
async def atualizar_cliente(cliente_id: str, cliente: ClienteCreate, user_id: str = Depends(get_current_user)):
    result = await db.clientes.update_one(
        {\"_id\": ObjectId(cliente_id), \"user_id\": user_id},
        {\"$set\": cliente.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Cliente não encontrado\")
    return await obter_cliente(cliente_id, user_id)

@api_router.delete(\"/clientes/{cliente_id}\")
async def deletar_cliente(cliente_id: str, user_id: str = Depends(get_current_user)):
    result = await db.clientes.delete_one({\"_id\": ObjectId(cliente_id), \"user_id\": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Cliente não encontrado\")
    return {\"message\": \"Cliente deletado com sucesso\"}

@api_router.post(\"/clientes/{cliente_id}/atendimentos\")
async def adicionar_atendimento(cliente_id: str, atendimento: AtendimentoCreate, user_id: str = Depends(get_current_user)):
    atendimento_dict = {
        \"descricao\": atendimento.descricao,
        \"data\": datetime.utcnow().isoformat()
    }
    result = await db.clientes.update_one(
        {\"_id\": ObjectId(cliente_id), \"user_id\": user_id},
        {\"$push\": {\"historico_atendimentos\": atendimento_dict}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Cliente não encontrado\")
    return {\"message\": \"Atendimento adicionado com sucesso\"}

# ==================== CASO ROUTES ====================

@api_router.post(\"/casos\", response_model=Caso)
async def criar_caso(caso: CasoCreate, user_id: str = Depends(get_current_user)):
    caso_dict = caso.dict()
    caso_dict[\"user_id\"] = user_id
    caso_dict[\"timeline\"] = []
    caso_dict[\"anexos\"] = []
    caso_dict[\"criado_em\"] = datetime.utcnow()
    
    result = await db.casos.insert_one(caso_dict)
    caso_dict[\"id\"] = str(result.inserted_id)
    
    return Caso(**caso_dict)

@api_router.get(\"/casos\", response_model=List[Caso])
async def listar_casos(user_id: str = Depends(get_current_user)):
    casos = await db.casos.find({\"user_id\": user_id}).to_list(1000)
    return [Caso(id=str(c[\"_id\"]), **{k: v for k, v in c.items() if k != \"_id\"}) for c in casos]

@api_router.get(\"/casos/{caso_id}\", response_model=Caso)
async def obter_caso(caso_id: str, user_id: str = Depends(get_current_user)):
    caso = await db.casos.find_one({\"_id\": ObjectId(caso_id), \"user_id\": user_id})
    if not caso:
        raise HTTPException(status_code=404, detail=\"Caso não encontrado\")
    return Caso(id=str(caso[\"_id\"]), **{k: v for k, v in caso.items() if k != \"_id\"})

@api_router.put(\"/casos/{caso_id}\", response_model=Caso)
async def atualizar_caso(caso_id: str, caso: CasoCreate, user_id: str = Depends(get_current_user)):
    result = await db.casos.update_one(
        {\"_id\": ObjectId(caso_id), \"user_id\": user_id},
        {\"$set\": caso.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Caso não encontrado\")
    return await obter_caso(caso_id, user_id)

@api_router.delete(\"/casos/{caso_id}\")
async def deletar_caso(caso_id: str, user_id: str = Depends(get_current_user)):
    result = await db.casos.delete_one({\"_id\": ObjectId(caso_id), \"user_id\": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Caso não encontrado\")
    return {\"message\": \"Caso deletado com sucesso\"}

@api_router.post(\"/casos/{caso_id}/movimentacoes\")
async def adicionar_movimentacao(caso_id: str, movimentacao: MovimentacaoCreate, user_id: str = Depends(get_current_user)):
    movimentacao_dict = {
        \"descricao\": movimentacao.descricao,
        \"data\": datetime.utcnow().isoformat()
    }
    result = await db.casos.update_one(
        {\"_id\": ObjectId(caso_id), \"user_id\": user_id},
        {\"$push\": {\"timeline\": movimentacao_dict}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Caso não encontrado\")
    return {\"message\": \"Movimentação adicionada com sucesso\"}

# ==================== PRAZO ROUTES ====================

@api_router.post(\"/prazos\", response_model=Prazo)
async def criar_prazo(prazo: PrazoCreate, user_id: str = Depends(get_current_user)):
    prazo_dict = prazo.dict()
    prazo_dict[\"user_id\"] = user_id
    prazo_dict[\"criado_em\"] = datetime.utcnow()
    
    result = await db.prazos.insert_one(prazo_dict)
    prazo_dict[\"id\"] = str(result.inserted_id)
    
    return Prazo(**prazo_dict)

@api_router.get(\"/prazos\", response_model=List[Prazo])
async def listar_prazos(user_id: str = Depends(get_current_user)):
    prazos = await db.prazos.find({\"user_id\": user_id}).to_list(1000)
    return [Prazo(id=str(p[\"_id\"]), **{k: v for k, v in p.items() if k != \"_id\"}) for p in prazos]

@api_router.get(\"/prazos/{prazo_id}\", response_model=Prazo)
async def obter_prazo(prazo_id: str, user_id: str = Depends(get_current_user)):
    prazo = await db.prazos.find_one({\"_id\": ObjectId(prazo_id), \"user_id\": user_id})
    if not prazo:
        raise HTTPException(status_code=404, detail=\"Prazo não encontrado\")
    return Prazo(id=str(prazo[\"_id\"]), **{k: v for k, v in prazo.items() if k != \"_id\"})

@api_router.put(\"/prazos/{prazo_id}\", response_model=Prazo)
async def atualizar_prazo(prazo_id: str, prazo: PrazoCreate, user_id: str = Depends(get_current_user)):
    result = await db.prazos.update_one(
        {\"_id\": ObjectId(prazo_id), \"user_id\": user_id},
        {\"$set\": prazo.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Prazo não encontrado\")
    return await obter_prazo(prazo_id, user_id)

@api_router.delete(\"/prazos/{prazo_id}\")
async def deletar_prazo(prazo_id: str, user_id: str = Depends(get_current_user)):
    result = await db.prazos.delete_one({\"_id\": ObjectId(prazo_id), \"user_id\": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Prazo não encontrado\")
    return {\"message\": \"Prazo deletado com sucesso\"}

# ==================== TAREFA ROUTES ====================

@api_router.post(\"/tarefas\", response_model=Tarefa)
async def criar_tarefa(tarefa: TarefaCreate, user_id: str = Depends(get_current_user)):
    tarefa_dict = tarefa.dict()
    tarefa_dict[\"user_id\"] = user_id
    tarefa_dict[\"criado_em\"] = datetime.utcnow()
    
    result = await db.tarefas.insert_one(tarefa_dict)
    tarefa_dict[\"id\"] = str(result.inserted_id)
    
    return Tarefa(**tarefa_dict)

@api_router.get(\"/tarefas\", response_model=List[Tarefa])
async def listar_tarefas(user_id: str = Depends(get_current_user)):
    tarefas = await db.tarefas.find({\"user_id\": user_id}).to_list(1000)
    return [Tarefa(id=str(t[\"_id\"]), **{k: v for k, v in t.items() if k != \"_id\"}) for t in tarefas]

@api_router.get(\"/tarefas/{tarefa_id}\", response_model=Tarefa)
async def obter_tarefa(tarefa_id: str, user_id: str = Depends(get_current_user)):
    tarefa = await db.tarefas.find_one({\"_id\": ObjectId(tarefa_id), \"user_id\": user_id})
    if not tarefa:
        raise HTTPException(status_code=404, detail=\"Tarefa não encontrada\")
    return Tarefa(id=str(tarefa[\"_id\"]), **{k: v for k, v in tarefa.items() if k != \"_id\"})

@api_router.put(\"/tarefas/{tarefa_id}\", response_model=Tarefa)
async def atualizar_tarefa(tarefa_id: str, tarefa: TarefaCreate, user_id: str = Depends(get_current_user)):
    result = await db.tarefas.update_one(
        {\"_id\": ObjectId(tarefa_id), \"user_id\": user_id},
        {\"$set\": tarefa.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Tarefa não encontrada\")
    return await obter_tarefa(tarefa_id, user_id)

@api_router.delete(\"/tarefas/{tarefa_id}\")
async def deletar_tarefa(tarefa_id: str, user_id: str = Depends(get_current_user)):
    result = await db.tarefas.delete_one({\"_id\": ObjectId(tarefa_id), \"user_id\": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Tarefa não encontrada\")
    return {\"message\": \"Tarefa deletada com sucesso\"}

# ==================== DOCUMENTO ROUTES ====================

@api_router.post(\"/documentos\", response_model=Documento)
async def criar_documento(documento: DocumentoCreate, user_id: str = Depends(get_current_user)):
    documento_dict = documento.dict()
    documento_dict[\"user_id\"] = user_id
    documento_dict[\"criado_em\"] = datetime.utcnow()
    
    result = await db.documentos.insert_one(documento_dict)
    documento_dict[\"id\"] = str(result.inserted_id)
    
    return Documento(**documento_dict)

@api_router.get(\"/documentos\", response_model=List[Documento])
async def listar_documentos(user_id: str = Depends(get_current_user), caso_id: Optional[str] = None, cliente_id: Optional[str] = None):
    query = {\"user_id\": user_id}
    if caso_id:
        query[\"caso_id\"] = caso_id
    if cliente_id:
        query[\"cliente_id\"] = cliente_id
    
    documentos = await db.documentos.find(query).to_list(1000)
    return [Documento(id=str(d[\"_id\"]), **{k: v for k, v in d.items() if k != \"_id\"}) for d in documentos]

@api_router.delete(\"/documentos/{documento_id}\")
async def deletar_documento(documento_id: str, user_id: str = Depends(get_current_user)):
    result = await db.documentos.delete_one({\"_id\": ObjectId(documento_id), \"user_id\": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Documento não encontrado\")
    return {\"message\": \"Documento deletado com sucesso\"}

# ==================== FINANCEIRO ROUTES ====================

@api_router.post(\"/financeiro\", response_model=Financeiro)
async def criar_financeiro(financeiro: FinanceiroCreate, user_id: str = Depends(get_current_user)):
    financeiro_dict = financeiro.dict()
    financeiro_dict[\"user_id\"] = user_id
    financeiro_dict[\"criado_em\"] = datetime.utcnow()
    
    result = await db.financeiro.insert_one(financeiro_dict)
    financeiro_dict[\"id\"] = str(result.inserted_id)
    
    return Financeiro(**financeiro_dict)

@api_router.get(\"/financeiro\", response_model=List[Financeiro])
async def listar_financeiro(user_id: str = Depends(get_current_user)):
    financeiro = await db.financeiro.find({\"user_id\": user_id}).to_list(1000)
    return [Financeiro(id=str(f[\"_id\"]), **{k: v for k, v in f.items() if k != \"_id\"}) for f in financeiro]

@api_router.get(\"/financeiro/{financeiro_id}\", response_model=Financeiro)
async def obter_financeiro(financeiro_id: str, user_id: str = Depends(get_current_user)):
    financeiro = await db.financeiro.find_one({\"_id\": ObjectId(financeiro_id), \"user_id\": user_id})
    if not financeiro:
        raise HTTPException(status_code=404, detail=\"Registro não encontrado\")
    return Financeiro(id=str(financeiro[\"_id\"]), **{k: v for k, v in financeiro.items() if k != \"_id\"})

@api_router.put(\"/financeiro/{financeiro_id}\", response_model=Financeiro)
async def atualizar_financeiro(financeiro_id: str, financeiro: FinanceiroCreate, user_id: str = Depends(get_current_user)):
    result = await db.financeiro.update_one(
        {\"_id\": ObjectId(financeiro_id), \"user_id\": user_id},
        {\"$set\": financeiro.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Registro não encontrado\")
    return await obter_financeiro(financeiro_id, user_id)

@api_router.delete(\"/financeiro/{financeiro_id}\")
async def deletar_financeiro(financeiro_id: str, user_id: str = Depends(get_current_user)):
    result = await db.financeiro.delete_one({\"_id\": ObjectId(financeiro_id), \"user_id\": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Registro não encontrado\")
    return {\"message\": \"Registro deletado com sucesso\"}

# ==================== DASHBOARD ROUTES ====================

@api_router.get(\"/dashboard\", response_model=DashboardStats)
async def obter_dashboard(user_id: str = Depends(get_current_user)):
    hoje = datetime.utcnow().date()
    fim_semana = hoje + timedelta(days=7)
    
    # Prazos
    prazos = await db.prazos.find({\"user_id\": user_id}).to_list(1000)
    prazos_hoje = sum(1 for p in prazos if p.get(\"data\", \"\").startswith(str(hoje)))
    prazos_semana = sum(1 for p in prazos if hoje <= datetime.fromisoformat(p.get(\"data\", \"\")).date() <= fim_semana)
    
    # Tarefas
    tarefas_pendentes = await db.tarefas.count_documents({\"user_id\": user_id, \"status\": {\"$ne\": \"concluido\"}})
    
    # Processos
    processos_ativos = await db.casos.count_documents({\"user_id\": user_id, \"status\": {\"$in\": [\"novo\", \"em andamento\"]}})
    
    # Financeiro
    mes_atual = hoje.replace(day=1).isoformat()
    financeiro = await db.financeiro.find({\"user_id\": user_id, \"tipo\": \"receber\"}).to_list(1000)
    contas_receber_mes = sum(f[\"valor\"] for f in financeiro if f.get(\"data_vencimento\", \"\").startswith(mes_atual[:7]) and f[\"status\"] == \"pendente\")
    contas_atrasadas = sum(f[\"valor\"] for f in financeiro if f.get(\"data_vencimento\", \"\") < str(hoje) and f[\"status\"] == \"pendente\")
    
    # Alertas
    alertas = []
    for prazo in prazos:
        try:
            data_prazo = datetime.fromisoformat(prazo.get(\"data\", \"\")).date()
            dias_restantes = (data_prazo - hoje).days
            if dias_restantes == 0:
                alertas.append({\"tipo\": \"prazo\", \"mensagem\": f\"HOJE: {prazo.get('titulo', '')}\", \"urgencia\": \"alta\"})
            elif dias_restantes == 1:
                alertas.append({\"tipo\": \"prazo\", \"mensagem\": f\"Amanhã: {prazo.get('titulo', '')}\", \"urgencia\": \"alta\"})
            elif dias_restantes <= 3:
                alertas.append({\"tipo\": \"prazo\", \"mensagem\": f\"Em {dias_restantes} dias: {prazo.get('titulo', '')}\", \"urgencia\": \"media\"})
            elif dias_restantes <= 7:
                alertas.append({\"tipo\": \"prazo\", \"mensagem\": f\"Em {dias_restantes} dias: {prazo.get('titulo', '')}\", \"urgencia\": \"baixa\"})
        except:
            pass
    
    return DashboardStats(
        prazos_hoje=prazos_hoje,
        prazos_semana=prazos_semana,
        tarefas_pendentes=tarefas_pendentes,
        processos_ativos=processos_ativos,
        contas_receber_mes=contas_receber_mes,
        contas_atrasadas=contas_atrasadas,
        alertas=alertas[:10]  # Limitar a 10 alertas
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[\"*\"],
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event(\"shutdown\")
async def shutdown_db_client():
    client.close()
"