# AchaServiço - Product Requirements Document

## Visão Geral
AchaServiço é uma aplicação mobile-first para conectar clientes a prestadores de serviços locais em cidades específicas do Brasil (Três Lagoas-MS, Andradina-SP, Brasilândia-MS).

## Tipos de Usuário
- **Clientes**: Acesso gratuito para buscar prestadores
- **Prestadores de Serviço**: Assinatura paga (R$ 15/mês) para ter perfil visível

## Stack Tecnológico
- **Frontend**: React Native + Expo + Expo Router
- **Backend**: Python + FastAPI (hospedado no Render)
- **Database**: MongoDB Atlas
- **Autenticação**: Emergent Google Social Login
- **Pagamentos**: Stripe (cartão de crédito) + PIX manual

## Funcionalidades Implementadas

### Autenticação ✅
- Login social com Google via Emergent Auth

### Cadastro de Prestador ✅
- Foto de perfil
- Múltiplas categorias de serviço
- Múltiplas cidades de atuação
- Bairro
- Descrição
- Telefone WhatsApp

### Dashboard do Prestador ✅
- Edição de perfil completo
- Galeria de fotos de serviços (até 6 fotos)
- Status da assinatura
- Estatísticas (avaliação, reviews)

### Sistema de Assinatura ✅
- Stripe para cartão de crédito (ativação automática)
- PIX manual (aprovação admin)
- Painel admin para gerenciar assinaturas pendentes

### Busca de Prestadores ✅
- Filtro por categoria
- Filtro por cidade
- Botão "Chamar no WhatsApp"

### Painel Admin ✅
- Gerenciamento de usuários
- Aprovação de pagamentos PIX
- Status de assinaturas

## Categorias Disponíveis
- Eletricista, Encanador, Pedreiro, Pintor, Jardineiro
- Faxineira, Marceneiro, Serralheiro, Vidraceiro, Gesseiro
- Técnico de Ar Condicionado, Dedetizador, Chaveiro, Motorista
- Montador de Móveis, Taxista

## Cidades Disponíveis
- Três Lagoas - MS
- Andradina - SP
- Brasilândia - MS

---

## Changelog

### 2025-03-08
- **BUG FIX**: Corrigido bug de edição de categorias e cidades no dashboard do prestador
  - Problema: Ao marcar/desmarcar categoria ou cidade, a seleção resetava automaticamente
  - Causa: useEffect sincronizava estado mesmo durante edição
  - Solução: Refatorado para inicializar form apenas ao clicar "Editar" (função `startEditing`)
  - Arquivo: `/app/frontend/app/provider/dashboard.tsx`

- **FEATURE**: Ativação automática de assinatura via Webhook Stripe ✅
  - Configurado webhook no Stripe (modo teste) apontando para Render
  - URL: `https://achaservico-backend.onrender.com/api/stripe/webhook`
  - Evento: `checkout.session.completed`
  - Assinatura ativa automaticamente após pagamento!

- **DEPLOY**: Backend atualizado no Render
  - Variáveis de ambiente configuradas: `APP_DOMAIN`, `STRIPE_WEBHOOK_SECRET`
  
- **APK**: Versão funcional disponível
  - Link: https://expo.dev/accounts/israel_moraes/projects/achaservico/builds/30c93583-b02b-4709-92e2-5e5c0f6c8329

---

## Tarefas Pendentes

### P0 (Crítico)
- [x] ~~Corrigir bug de edição de categorias/cidades~~ (FEITO - aguardando validação do usuário)

### P1 (Alta Prioridade)
- [ ] Deploy das últimas alterações no Render (novas categorias + multi-cidade)
- [ ] Gerar novo APK após validação

### P2 (Média Prioridade)  
- [ ] Implementar assistente IA para suporte/ajuda

### P3 (Baixa Prioridade)
- [ ] Preparar app para publicação na Google Play Store
- [ ] Trocar chaves Stripe para produção
- [ ] Gerar build .aab de produção

---

## Padrões de Código Importantes

### ⚠️ NUNCA usar Alert.alert para confirmações
O `Alert.alert` causa problemas no Expo Web/Preview, travando ações subsequentes.
**Solução**: Usar modais customizados para confirmação.

### URLs e Endpoints
- Backend Render: https://achassertico-backend.onrender.com
- Preview Emergent: https://acha-notif-hub.preview.emergentagent.com

---

## Credenciais de Teste
- **Admin**: israel.moraes03@gmail.com / Rael9661#
