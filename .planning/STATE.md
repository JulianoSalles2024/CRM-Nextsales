# Project State: Mídia Inbox + Notificações Bell

**Last updated:** 2026-03-20
**Active phase:** Phase 3

## Phase Status

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------||
| 1 | Renderização de Mídia no Frontend | Done | 2026-03-20 | 2026-03-20 |
| 2 | Pipeline de Mídia no n8n WF-01 | Done | 2026-03-20 | 2026-03-20 |
| 3 | Notificações Bell | In Progress | 2026-03-20 | — |

## Requirements Status

| Requirement | Description | Phase | Status |
|-------------|-------------|-------|--------|
| MEDIA-01 | Imagens renderizam como `<img>` no MessageBubble | 1 | ✅ Done |
| MEDIA-02 | Áudios renderizam como player `<audio>` | 1 | ✅ Done |
| MEDIA-03 | Transcrição aparece abaixo do player | 1 | ⏭ Skipped (sem transcrição por ora) |
| MEDIA-04 | WF-01 baixa mídia via getBase64FromMediaMessage | 2 | ✅ Done |
| MEDIA-05 | Placeholder para mídia sem URL válida | 1 | ✅ Done |
| NOTIF-01 | Query usa `recipient_user_id` | 3 | Pending |
| NOTIF-02 | Query usa `is_read` para filtrar | 3 | Pending |
| NOTIF-03 | Badge exibe contagem correta | 3 | Pending |
| NOTIF-04 | Realtime atualiza badge em tempo real | 3 | Pending |
| NOTIF-05 | Marcar como lida funciona | 3 | Pending |
| NOTIF-06 | Sellers veem apenas suas notificações | 3 | Pending |

## Decisions Made

- **data: URL em vez de Supabase Storage**: Base64 já vem no webhook da Evolution API — convertido direto para data URL, sem necessidade de upload/download
- **HTTP Request node em vez de Code node**: Sandbox do n8n bloqueia fetch e require — HTTP Request node bypassa a restrição
- **IF combinator "or"**: n8n IF v2/v3 usa `combinator: "or"` (não `combineOperation: "any"`)
- **Audio player width fixa**: `w-full` colapsa sem pai com largura definida — usar `style={{ width: '260px' }}`
- **Image click com document.write**: `window.open(data_url)` bloqueado pelo Chrome — escrever `<img>` em nova aba vazia

## Blockers

None.

## Notes

- Bucket `inbox-media` existe mas não foi necessário — data URLs funcionam direto
- WF-01 agora tem 27 nós
- Schema notifications: `recipient_user_id` (não `user_id`), `is_read` (não `read`)

---
*State initialized: 2026-03-20 | Updated: 2026-03-20*
