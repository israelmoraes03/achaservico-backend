# AchaServiço - Product Requirements Document

## Visão Geral
AchaServiço é uma aplicação mobile-first para conectar clientes a prestadores de serviços locais em cidades específicas do Brasil (Três Lagoas-MS, Andradina-SP, Brasilândia-MS, e outras).

## Tipos de Usuário
- **Clientes**: Acesso gratuito para buscar prestadores
- **Prestadores de Serviço**: Cadastro 100% GRATUITO (fase de crescimento)

## Stack Tecnológico
- **Frontend**: React Native + Expo + Expo Router
- **Backend**: Python + FastAPI (hospedado no Render)
- **Database**: MongoDB Atlas
- **Autenticação**: Emergent Google Social Login
- **Pagamentos**: Stripe + PIX manual (dormant - app é 100% gratuito)

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
- Toggle de visibilidade (ativo/inativo)
- Estatísticas (avaliação, reviews)

### Sistema 100% Gratuito ✅
- Todos os prestadores são ativados automaticamente
- Sem expiração de assinatura
- UI de pagamentos removida/oculta

### Busca de Prestadores ✅
- Filtro por categoria
- Filtro por cidade
- Filtro por bairro (dinâmico baseado na cidade)
- Botão "Chamar no WhatsApp"
- Botões de favoritar e compartilhar

### Centro de Notificações ✅ (NOVO)
- Ícone de sino no header da home com badge de não lidas
- Tela de listagem de notificações
- Marcar como lida automaticamente ao abrir
- Endpoint de broadcast para admin enviar notificações

### Painel Admin ✅
- Gerenciamento de usuários
- Filtro de busca por nome
- Aprovação de pagamentos PIX
- Broadcast de notificações para todos os prestadores

### Favoritos ✅
- Usuários podem favoritar prestadores
- Lista de favoritos no perfil do usuário

---

## Changelog

### 2025-03-14
- **FEATURE**: Centro de Notificações completo ✅
  - Adicionado ícone de sino (bell) no header da tela principal
  - Badge vermelho mostra contagem de notificações não lidas
  - Tela `/notifications` lista todas as notificações recebidas
  - Notificações são marcadas como lidas automaticamente ao abrir a tela
  - Backend: Endpoints GET /api/notifications, GET /api/notifications/unread-count, POST /api/notifications/mark-read
  - Backend: POST /api/admin/broadcast-notification salva notificação para cada provider

### 2025-03-08
- **BUG FIX**: Corrigido bug de edição de categorias e cidades no dashboard do prestador
- **FEATURE**: Ativação automática de assinatura via Webhook Stripe ✅
- **DEPLOY**: Backend atualizado no Render

---

## Tarefas Pendentes

### P0 (Crítico)
- [x] ~~Centro de Notificações~~ (CONCLUÍDO)

### P1 (Alta Prioridade)
- [ ] Implementar "Faixa de Preço" para prestadores
- [ ] Badge "Atendimento 24h"
- [ ] Histórico de contatos do usuário

### P2 (Média Prioridade)
- [ ] Bug: Google Login abre Gmail em alguns dispositivos
- [ ] Implementar Plano de Monetização (quando decidir ativar modo pago)

### P3 (Baixa Prioridade)
- [ ] Preparar app para publicação na Google Play Store
- [ ] Trocar chaves Stripe para produção

---

## Padrões de Código Importantes

### ⚠️ NUNCA usar Alert.alert para confirmações
O `Alert.alert` causa problemas no Expo Web/Preview, travando ações subsequentes.
**Solução**: Usar modais customizados para confirmação.

### URLs e Endpoints
- Backend Render: https://achaservico-backend.onrender.com
- Preview Emergent: https://service-finder-416.preview.emergentagent.com

---

## Credenciais de Teste
- **Admin**: israel.moraes03@gmail.com

---

## Arquivos Principais
- `/app/backend/server.py` - Backend principal
- `/app/frontend/app/index.tsx` - Tela principal com ícone de sino
- `/app/frontend/app/notifications.tsx` - Tela de notificações
- `/app/frontend/app/admin.tsx` - Painel admin com broadcast
- `/app/frontend/app/provider/dashboard.tsx` - Dashboard do prestador
