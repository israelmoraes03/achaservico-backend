# Plano de Monetização - AchaServiço

## Data de Criação: 10 de março de 2025

---

## 📊 Estratégia Atual: Crescimento (Fase Grátis)

### Duração: 3-4 meses após lançamento
### Meta: 100+ profissionais cadastrados

### O que está configurado:
- ✅ App 100% gratuito para todos
- ✅ Cadastro = ativo automaticamente
- ✅ Código de pagamento preservado (mas oculto)
- ✅ Área Admin funcionando

---

## 💰 Sistema de Planos (Fase Paga - Futuro)

| Plano | Valor | Benefícios |
|-------|-------|------------|
| 🔵 **Básico** | R$ 7/mês | Perfil listado |
| 🟡 **Profissional** | R$ 15/mês | Aparece primeiro nas buscas |
| 🟣 **Premium** | R$ 29/mês | Destaque + Selo ✓ Verificado + Prioridade |

### Sistema de Selos:
- ⭐ **Verificado** (Estrela Azul): Automático após 5+ avaliações positivas OU plano Premium
- 👑 **Premium** (Coroa Dourada): Plano R$29/mês

---

## 🎯 Prestadores VIP (Gratuito Vitalício)

- **Quantidade**: Até 50 prestadores
- **Critério**: Selecionados manualmente pelo admin
- **Benefício**: Não precisam pagar assinatura nunca
- **Implementação**: Flag `is_vip: true` no banco de dados

---

## 📅 Cronograma de Implementação

### Fase 1: Lançamento (Agora)
- [x] App 100% gratuito
- [x] Todos cadastros ativos automaticamente
- [x] Ocultar modal de pagamento
- [ ] Implementar selo "Verificado" (5+ avaliações)

### Fase 2: Preparação (1 mês antes de cobrar)
- [ ] Atualizar app com sistema de 3 planos
- [ ] Criar botão no Admin: "Ativar Modo Pago"
- [ ] Selecionar 50 prestadores VIP
- [ ] Criar campo `is_vip` no banco de dados
- [ ] Testar fluxo completo de pagamento

### Fase 3: Transição (2 semanas antes)
- [ ] Enviar Push notification: "Novidade! Conheça nossos planos"
- [ ] Enviar Email para todos prestadores explicando mudança
- [ ] Aviso no app: "Aproveite o período gratuito até [DATA]"

### Fase 4: Ativação do Modo Pago
- [ ] Admin clica em "Ativar Modo Pago"
- [ ] Prestadores sem plano = perfil invisível (não excluído)
- [ ] Prestadores VIP = continuam ativos sem pagar
- [ ] Modal de assinatura aparece para todos não-VIP

---

## 🔧 Implementação Técnica Necessária

### Backend (server.py):

```python
# Novos campos no modelo Provider:
class Provider(BaseModel):
    # ... campos existentes ...
    is_vip: bool = False  # VIP = grátis vitalício
    plan_type: str = "free"  # free, basic, professional, premium
    plan_expires_at: Optional[datetime] = None

# Novo campo global:
PAYMENT_MODE_ACTIVE = False  # Admin ativa quando quiser cobrar

# Endpoint para Admin ativar modo pago:
@api_router.post("/admin/activate-payment-mode")
async def activate_payment_mode():
    global PAYMENT_MODE_ACTIVE
    PAYMENT_MODE_ACTIVE = True
    # Desativar todos prestadores que não são VIP e não têm plano
    await db.providers.update_many(
        {"is_vip": {"$ne": True}, "plan_type": "free"},
        {"$set": {"is_active": False}}
    )
    return {"success": True}

# Modificar busca de providers:
@api_router.get("/providers")
async def get_providers():
    query = {"is_active": True}
    if PAYMENT_MODE_ACTIVE:
        query["$or"] = [
            {"is_vip": True},
            {"plan_type": {"$ne": "free"}}
        ]
    # ...
```

### Frontend (dashboard.tsx):

```typescript
// Verificar se deve mostrar modal de pagamento
const shouldShowPaymentModal = !provider.is_vip && provider.plan_type === 'free' && PAYMENT_MODE_ACTIVE;

// Se modo pago ativo e não é VIP, mostrar modal obrigatório
if (shouldShowPaymentModal) {
    // Mostrar modal sem opção de fechar
    // Usuário DEVE escolher um plano
}
```

---

## 📱 Notificações de Transição

### Push Notification (2 semanas antes):
```
Título: "Novidade no AchaServiço! 🚀"
Corpo: "Conheça nossos novos planos e continue recebendo clientes. Acesse o app para saber mais!"
```

### Email (1 semana antes):
```
Assunto: "Importante: Mudanças no AchaServiço"

Olá [Nome],

Temos uma novidade importante para você!

A partir de [DATA], o AchaServiço terá planos de assinatura para prestadores.

Escolha o plano ideal para você:
- Básico (R$ 7/mês): Perfil listado
- Profissional (R$ 15/mês): Destaque nas buscas
- Premium (R$ 29/mês): Máxima visibilidade + Selo Verificado

Seu perfil será mantido, mas ficará invisível para clientes até escolher um plano.

Acesse o app agora e escolha seu plano!

Atenciosamente,
Equipe AchaServiço
```

---

## ⚠️ Considerações Legais

1. **Termos de Uso já incluem**:
   > "O AchaServiço pode oferecer funcionalidades gratuitas durante período promocional. Reservamo-nos o direito de introduzir ou modificar planos pagos para prestadores de serviço, mediante aviso prévio aos usu��rios cadastrados."

2. **Aviso Prévio**: Mínimo 15 dias antes de ativar cobrança

3. **Transparência**: Nunca deletar perfil, apenas ocultar

---

## 📞 Contato para Dúvidas
- Email: israel.moraes03@gmail.com
- WhatsApp: (66) 99684-1531
