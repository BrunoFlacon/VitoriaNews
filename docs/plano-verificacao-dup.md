# Plano de Verificação — Duplicidade de Plataformas

## Escopo

Verificar se **Google News Search API** (`googlenews`, social) e **Google Workspace / OAuth Client** (`google`, tool) são duplicatas parciais ou totais dos serviços já agregados no **Google Cloud Hub** (`google_cloud`, tool).

---

## 1. Google News Search API (`googlenews`) vs Google Cloud Hub (`google_cloud`)

| Aspecto | Google News Search API | Google Cloud Hub |
|---|---|---|
| ID | `googlenews` | `google_cloud` |
| Tipo | `social` | `tool` |
| Descrição | "Google News Search API" | "Google Cloud (Maps, YouTube, Ads, News)" |
| OAuth | ❌ | ❌ |

### 1.1 Verificar no código-fonte

- [x] `SettingsView.tsx:211-220` — `googlenews` é listado como plataforma social separada
- [ ] `ApiCredentialsTab.tsx` — checar se as credenciais de `googlenews` usam campos distintos de `google_cloud`
- [ ] `platform-metadata.ts` — verificar se `googlenews` tem metadata própria ou compartilha com `google_cloud`

### 1.2 Verificar na integração Supabase

- [ ] Executar SQL para contar registros: `SELECT id, COUNT(*) FROM api_credentials WHERE id IN ('googlenews', 'google_cloud') GROUP BY id`
- [ ] Se `googlenews` tiver 0 registros E `google_cloud` tiver >0, considerar unificação
- [ ] Se ambos tiverem registros, verificar se as credenciais são copiadas/redundantes

### 1.3 Verificar na UI

- [ ] Navegar até Configurações > APIs > Aba de redes sociais: `googlenews` aparece como card separado?
- [ ] Se o usuário configurou `google_cloud`, o badge de conexão também acende para `googlenews`? (não deveria se são independentes)

### 1.4 Recomendação

- Se `googlenews` é estritamente um subconjunto (só News) do Google Cloud Hub, **manter separado** pois a API key do Google Cloud cobre múltiplos serviços — News API pode ter chave/quota diferente.
- Acção: apenas documentar, sem unificar.

---

## 2. Google Workspace / OAuth Client (`google`) vs Google Cloud Hub (`google_cloud`)

| Aspecto | Google Workspace / OAuth | Google Cloud Hub |
|---|---|---|
| ID | `google` | `google_cloud` |
| Tipo | `tool` | `tool` |
| OAuth | ✅ | ❌ |
| Descrição | "Google Workspace / OAuth Client" | "Google Cloud (Maps, YouTube, Ads, News)" |

### 2.1 Verificar no código-fonte

- [x] `SettingsView.tsx:231-240` — `google` é tool com suporte OAuth
- [x] `SettingsView.tsx:51-60` — `google_cloud` é tool sem OAuth
- [ ] `useApiCredentials.ts` — verificar se as funções `saveGoogleCredentials` tratam ambos separadamente
- [ ] `SocialIcons.tsx` — `GoogleIcon` é usado para AMBOS (`google` e `google_cloud`)

### 2.2 Diferenças funcionais

| Funcionalidade | `google` | `google_cloud` |
|---|---|---|
| OAuth (login Google) | ✅ Sim | ❌ Não |
| API Keys (Maps, YouTube, etc.) | ❌ Não | ✅ Sim |
| Escopo | Workspace / autenticação | Serviços Google Cloud individuais |

### 2.3 Verificar na UI

- [ ] Ambos aparecem na aba "APIs" como cards separados — isso é **correto** pois têm propósito diferente
- [ ] Verificar se ao configurar OAuth em `google`, a UI permite também colocar API keys (não deveria)

### 2.4 Recomendação

- **Manter separados** — OAuth Client (login/Workspace) é distinto de API Keys (Google Cloud services).
- Acção: apenas documentar.

---

## 3. Meta Marketing & Ads API (`meta_ads`) vs Facebook (`facebook`)

| Aspecto | Meta Ads | Facebook |
|---|---|---|
| ID | `meta_ads` | `facebook` |
| Tipo | `tool` | `social` |
| OAuth | ❌ | ✅ |

### 3.1 Recomendação

- `meta_ads` é uma ferramenta auxiliar (Pixel Manager, Ads API) — **manter separado**.

---

## Checklist Final

- [ ] 1.1 — Campos de credenciais distintos entre `googlenews` e `google_cloud`
- [ ] 1.2 — Contagem de registros no Supabase
- [ ] 2.1 — Código-fonte: `google` (OAuth) vs `google_cloud` (API Keys)
- [ ] 2.2 — UI: ambos aparecem com ícone Google, mas em seções diferentes (tools)
- [ ] 3 — `meta_ads` não conflita com `facebook`

> **Conclusão preliminar**: Nenhuma duplicata crítica identificada. Google News é subserviço do ecossistema Google Cloud mas usa chave/quota separada. Google Workspace OAuth é funcionalidade distinta de API Keys. Manter todos os 4 cards separados.
