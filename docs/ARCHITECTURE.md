# GORI SAMPLE LAB — Arquitetura do produto

**Direção aprovada:** gerar composições totalmente novas a partir de características musicais gerais de uma referência. A referência não será fonte de áudio, melodia, stems ou trechos para reutilização.

## 1. Princípio do produto

O GORI SAMPLE LAB não é um player de YouTube, um conversor de MIDI ou um sintetizador de acordes. É um laboratório de composição que recebe um briefing musical e entrega três gravações originais, com arranjo multi-instrumental e identidade de produção.

A referência pode contribuir com metadados musicais: BPM aproximado, tonalidade provável, energia, densidade, andamento e clima. O sistema não deve copiar nem reconstruir a música original.

**Regra de integridade:** não afirmar que um link do YouTube foi analisado em áudio se o sistema só conseguiu abrir o player. A análise acústica precisa de um arquivo de áudio fornecido pelo usuário e que ele tenha direito de usar, ou de uma fonte autorizada que entregue o áudio para processamento.

## 2. Experiência desejada

1. O usuário cola uma URL de referência ou importa um arquivo autorizado.
2. A aplicação valida a URL e, quando possível, abre o vídeo incorporado para consulta. A URL sozinha não fornece áudio ao analisador.
3. O usuário importa o áudio autorizado para análise local, ou preenche/confirma BPM, tom e características manualmente.
4. O sistema apresenta um **Reference Brief**: BPM, tom provável, energia, densidade, groove, instrumentação percebida e nível de confiança.
5. O usuário escolhe duração, família de estilo, presença de bateria e intensidade de textura.
6. O motor cria três composições independentes, sem reutilizar material da referência.
7. Cada resultado oferece prévia, WAV estéreo e, quando disponíveis, stems separados e dados do arranjo.

## 3. Arquitetura lógica

```text
PWA (iPhone / desktop)
  |
  | HTTPS: briefing, parâmetros, status, resultados
  v
API / Orchestrator
  |-- Reference Brief (metadados; sem copiar áudio)
  |-- Composition Planner
  |-- Generation Provider Adapter
  |-- Render / Master pipeline
  |-- Job queue + status
  |
  +--> Music Generation Engine (modelo/API licenciada)
  |       |
  |       +--> composição original estéreo
  |       +--> stems, se suportados
  |
  +--> Sample-based Arrangement Engine (fallback/control layer)
  |
  +--> Object Storage (WAVs e stems temporários)
          |
          v
PWA: ouvir, comparar, baixar e apagar resultados
```

A PWA atual do GitHub Pages continua sendo a interface. Segredos, chaves de API, filas e modelos não ficam no JavaScript público nem no repositório. O backend é necessário para geração robusta por modelos remotos ou processamento pesado.

## 4. Camadas do sistema

### A. Reference Analyzer

- Entrada acústica: arquivo autorizado WAV/MP3/M4A/AIFF/FLAC/OGG.
- Extrai duração, BPM aproximado, tonalidade provável, energia, brilho, densidade/transientes e dinâmica.
- Permite corrigir BPM e tom manualmente.
- Mostra confiança e deixa claro quando uma estimativa é fraca.
- Não tenta recuperar a música a partir de uma URL de YouTube nem contorna DRM, restrições ou controles da plataforma.

### B. Composition Planner

Transforma o Reference Brief e as escolhas do usuário num plano musical original:
- tonalidade e andamento alvo;
- progressão harmônica nova;
- forma (intro, tema, resposta, variação, final);
- instrumentação e função de cada instrumento;
- groove, swing e dinâmica;
- densidade, pausas, fills e variações por compasso.

O planner gera três briefs distintos. Exemplo inicial:
- **Soul / Warm Groove:** Rhodes ou piano, baixo elétrico, bateria soul, guitarra, cordas/metais sutis.
- **Dark Jazz / Drumless:** piano acústico, contrabaixo, sax/naipes discretos, ambiência; bateria ausente por padrão.
- **Funk / Deep Groove:** baixo sincopado, bateria quebrada, clavinet, guitarra rítmica e percussão.

Os nomes são direções estéticas, não imitações de artistas ou gravações específicas.

### C. Music Generation Engine

É o componente principal e ainda precisa ser selecionado e validado. Deve gerar música nova com vários instrumentos e estrutura coerente, idealmente com stems ou separação por instrumento.

Critérios obrigatórios de seleção:
- licença comercial compatível com o uso pretendido;
- permissão clara para outputs e uso em lançamentos;
- API estável e documentação;
- geração condicionada por texto e metadados musicais;
- duração adequada para loops e trechos de sample;
- qualidade estéreo e possibilidade de exportação WAV;
- custo previsível por geração;
- política clara sobre retenção e uso dos áudios enviados.

Não presumir que qualquer modelo/API ofereça stems, BPM/key controlados ou direitos comerciais. Esses pontos precisam ser testados antes da contratação.

### D. Arrangement Engine / fallback

Quando o provedor não entregar stems ou controle instrumental suficiente, usar uma camada baseada em bibliotecas de áudio licenciadas e arranjos MIDI para complementar ou criar alternativas:
- instrumentos acústicos e elétricos multisample;
- articulações e variações de velocity;
- humanização de timing e dinâmica;
- bateria com padrões e ghost notes;
- baixo com variações e antecipações;
- voicings, inversões, tensões e condução de vozes.

Essa camada não deve voltar a ser apenas um oscilador simples tocando acordes. Os instrumentos devem vir de gravações/sample libraries licenciadas.

### E. Render / Texture / Master

- render estéreo 44.1 kHz, 24-bit WAV como formato principal;
- duração configurável (começar com 8 e 16 compassos; avaliar 30–60 s);
- textura de fita/vinil sutil e controlável, sem destruir transientes;
- saturação, EQ, compressão, reverb e largura estéreo;
- fades e verificação de clipping/true peak;
- normalização consistente, sem prometer master final de streaming;
- prévia comprimida para reprodução rápida.

### F. Jobs, storage e privacidade

- Geração é assíncrona: criar job, consultar progresso e baixar quando pronto.
- Áudios temporários com expiração configurável.
- Não armazenar referência ou resultado por padrão além do necessário para concluir o job.
- Não expor tokens/chaves no cliente.
- Oferecer exclusão dos resultados.
- Registrar somente metadados técnicos necessários para diagnóstico.

## 5. Contrato de dados inicial

### ReferenceBrief
- `source_type`: `uploaded_audio` ou `manual`
- `duration_seconds`
- `bpm`, `bpm_confidence`
- `key`, `key_confidence`
- `energy`, `brightness`, `density`
- `groove_notes`
- `user_corrections`

Não incluir áudio bruto da referência no pedido ao gerador de composição. O brief contém atributos gerais e não uma transcrição da obra.

### GenerationRequest
- `reference_brief`
- `style_direction`
- `target_bpm`, `target_key`
- `duration_bars`
- `drums_mode`: `full`, `light`, `drumless`
- `texture`: `clean`, `tape`, `dusty`
- `instrument_preferences`
- `variation_seed`

### GenerationResult
- `job_id`, `status`
- `variants[]`: nome, descrição, duração, BPM, tom
- `preview_url`, `wav_url`
- `stems[]` quando suportados
- `license/provider metadata`

## 6. MVP por fases

### Fase 0 — fundação e decisão de tecnologia
- preservar a PWA atual como protótipo de interface;
- corrigir a comunicação sobre URL do YouTube: player incorporado não significa análise do áudio;
- comparar provedores/modelos e confirmar licenças, API, custos, duração e stems;
- criar backend separado com adapter para trocar de provedor sem refazer a interface.

### Fase 1 — primeiro resultado musical real
- upload autorizado + Reference Brief;
- três briefs de composição;
- gerar três trechos originais com um provedor validado;
- ouvir e baixar WAV estéreo;
- mostrar claramente duração, parâmetros e limitações.

### Fase 2 — produção e controle
- stems ou multitrack;
- controles de bateria/drumless, swing, instrumentação e forma;
- variações por seção e regeneração seletiva;
- renderização com textura e master de prévia.

### Fase 3 — identidade GORI
- biblioteca licenciada própria;
- arranjo híbrido e humanização;
- presets de Soul, Jazz, Funk, Drumless e Boom Bap;
- sessões, histórico e exportação de stems.

## 7. Critérios de aceitação

Uma geração só será considerada válida se:
1. soar como um arranjo musical multi-instrumental, não apenas acordes de sintetizador;
2. tiver pelo menos três funções instrumentais distinguíveis;
3. apresentar variações e dinâmica ao longo do trecho;
4. não reutilizar áudio ou melodia da referência;
5. entregar WAV estéreo reproduzível e sem clipping audível;
6. as três opções tiverem diferenças perceptíveis de arranjo e timbre;
7. direitos de uso do modelo, bibliotecas e resultado estiverem documentados.

## 8. Decisões ainda abertas

- Provedor/modelo de geração musical e licença comercial.
- Hospedagem do backend e custo por geração.
- Duração padrão e limite de gerações por job.
- Disponibilidade real de stems.
- Se a primeira versão será 100% cloud ou terá renderização local complementar.

**Recomendação:** não implementar mais camadas de sintetizador no app atual tentando simular uma banda. Primeiro validar um motor de geração musical com direitos adequados; depois conectar esse motor à PWA por uma API segura.