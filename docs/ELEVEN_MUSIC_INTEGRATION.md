# GORI SAMPLE LAB — integração Eleven Music (backend)

## Objetivo

Adicionar geração de três composições instrumentais originais via Eleven Music API, mantendo a chave secreta exclusivamente no backend.

## API confirmada

- Base URL: https://api.elevenlabs.io
- Endpoint: POST /v1/music
- Header: xi-api-key
- Modelo inicial: music_v2_5
- Duração PoC: 45.000 ms por faixa
- Modo instrumental: force_instrumental=true
- Formato de teste: mp3_48000_320 (confirmar suporte no plano/conta)
- Prompt: até 4.100 caracteres
- Alternativa estruturada: POST /v1/music/plan e depois POST /v1/music com composition_plan.

Documentação:
- https://elevenlabs.io/docs/api-reference/music/compose
- https://elevenlabs.io/docs/api-reference/music/create-composition-plan

## Limite conhecido

A API pública de composição aceita prompt ou composition_plan, não ambos. O schema consultado não confirma uma entrada de áudio de referência para composição nova. A versão inicial usa um Reference Brief textual criado a partir da análise local ou de dados manuais: BPM, tom, energia, densidade, groove e clima. Não envia nem copia a gravação original.

## Três presets originais

### soul_warm_groove
Instrumental soul-jazz com Rhodes, baixo elétrico orgânico, bateria acústica com swing e ghost notes, guitarra limpa, cordas e metais discretos. Harmonia rica, interação de banda, dinâmica humana, gravação vintage. Sem vocais, sem imitar artistas ou músicas.

### dark_jazz_drumless
Jazz escuro instrumental sem bateria/percussão, piano acústico com extensões harmônicas, contrabaixo, sax tenor expressivo, vibrafone discreto e ambiência de sala. Dinâmica natural e gravação envelhecida. Sem vocais, sem imitar artistas ou músicas.

### funk_deep_groove
Funk instrumental com baixo sincopado, bateria acústica seca e viva, ghost notes, clavinet, guitarra rítmica, percussão manual e metais pontuais. Groove forte, fills e variação de arranjo. Sem vocais, sem imitar artistas ou músicas.

## Contrato de backend

### POST /api/generations

Request:
```json
{
  "referenceBrief": {
    "bpm": 88,
    "key": "D minor",
    "energy": "medium",
    "density": "medium",
    "groove": "loose swung pocket",
    "mood": "warm and dusty"
  },
  "durationMs": 45000,
  "variants": ["soul_warm_groove", "dark_jazz_drumless", "funk_deep_groove"]
}
```

Response:
```json
{
  "jobId": "opaque-id",
  "status": "queued",
  "variants": [
    {"id": "soul_warm_groove", "status": "pending"},
    {"id": "dark_jazz_drumless", "status": "pending"},
    {"id": "funk_deep_groove", "status": "pending"}
  ]
}
```

### GET /api/generations/:jobId

Retorna status e URLs temporárias dos arquivos quando prontos.

## Requisitos de segurança

- ELEVENLABS_API_KEY somente em variável secreta do backend.
- Nunca colocar chave em HTML, app.js, arquivos versionados, GitHub Pages ou parâmetros de URL.
- Validar duração e lista de presets no servidor.
- Limitar taxa de chamadas e número de jobs por usuário.
- Não aceitar prompts livres irrestritos no MVP; usar presets e campos controlados.
- Não expor erros internos nem conteúdo da chave.
- Arquivos de áudio devem ser servidos por URLs temporárias e expirar.
- Não usar enable_logging=false como se estivesse disponível para qualquer plano: documentação informa que zero retention exige Enterprise.

## Decisão de hospedagem

GitHub Pages é estático e não executa o backend. A API deve ser hospedada separadamente em um serviço com Node.js/serverless e gerenciamento de secrets. O domínio do frontend chamará a API via HTTPS com CORS restrito.

Não publicar backend como se estivesse funcional até:
1. usuário criar conta e obter chave API;
2. escolher hospedagem backend;
3. configurar a variável secreta no painel da hospedagem;
4. testar uma única geração de 45 segundos;
5. validar custo, duração, áudio e termos comerciais;
6. só então habilitar os três botões no app.

## Próximo passo do usuário

Criar uma conta ElevenLabs e gerar uma API key em Developer/API Keys. Não enviar a chave no chat e não colocá-la no GitHub. Informar apenas quando a chave estiver criada; a configuração será feita no painel seguro do backend escolhido.
