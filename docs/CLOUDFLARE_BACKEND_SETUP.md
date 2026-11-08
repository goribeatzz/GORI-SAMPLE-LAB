# GORI SAMPLE LAB — backend Cloudflare Workers

## Objetivo

Hospedar a API de geração musical fora do GitHub Pages. A interface continua no GitHub Pages; a chave ElevenLabs fica como secret criptografado no Worker, nunca no JavaScript público.

## O que foi preparado

- `backend/worker.js`: API com rota de saúde e geração de uma faixa instrumental por chamada.
- `backend/wrangler.toml`: configuração do Worker.
- `.github/workflows/deploy-worker.yml`: publicação manual pelo GitHub Actions.
- Presets fixos: Soul Warm Groove, Dark Jazz Drumless e Funk Deep Groove.
- Duração de teste limitada a 45 segundos.
- Verificação Cloudflare Turnstile antes de cada geração.
- CORS limitado ao domínio GitHub Pages do projeto.

## Secrets necessários no GitHub

No repositório, abrir Settings → Secrets and variables → Actions e cadastrar:

- `CLOUDFLARE_API_TOKEN`: token Cloudflare com permissão para editar Workers.
- `CLOUDFLARE_ACCOUNT_ID`: identificador da conta Cloudflare.
- `ELEVENLABS_API_KEY`: chave criada na ElevenLabs.
- `TURNSTILE_SECRET_KEY`: chave secreta do widget Turnstile.

Nunca cadastrar valores em arquivos versionados, issues, comentários ou mensagens públicas.

## Turnstile

Criar um widget Turnstile para o domínio `goribeatzz.github.io`. O site key é público e será usado na interface; a secret key é privada e deve ser cadastrada no GitHub Actions como `TURNSTILE_SECRET_KEY`.

## Publicação

Depois de cadastrar os quatro secrets, abrir Actions → Deploy GORI SAMPLE LAB API → Run workflow.

O deploy usa Wrangler para publicar o Worker e enviar os dois secrets de execução ao Cloudflare como secrets criptografados.

## Rotas

- `GET /api/health`: verifica disponibilidade e indica se os secrets estão configurados.
- `POST /api/generate`: recebe `preset`, `bpm`, `key`, `durationMs` e `turnstileToken`; retorna áudio MP3 instrumental.

## Atenção

O backend ainda não está publicado e a interface ainda precisa ser integrada ao endpoint. O domínio CORS está fixado para o GitHub Pages atual. O endpoint de geração deve ser liberado somente depois de configurar o Turnstile e testar os limites/custos da conta ElevenLabs.

A primeira prova de conceito deve gerar apenas uma faixa de 45 segundos. Não dispare as três variações automaticamente até confirmar custo e qualidade.
