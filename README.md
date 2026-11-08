# GORI SAMPLE LAB

PWA mobile-first para pesquisa musical, análise de referências autorizadas e criação de novas interpretações instrumentais.

## Direção do produto

A direção aprovada é criar **três novas interpretações de uma mesma referência**, preservando características musicais reconhecíveis (clima, groove, função harmônica, instrumentação e textura), sem copiar a gravação, a melodia ou samples protegidos.

O projeto também terá um módulo de pesquisa de possíveis samples e fontes sonoras. As sugestões serão apresentadas como hipóteses, não como identificação confirmada sem evidência verificável.

## Estado atual

- Frontend PWA publicado no GitHub Pages.
- Backend Cloudflare Worker publicado.
- Cloudflare Turnstile integrado.
- ElevenLabs Music API conectada para geração por prompts fixos.
- Importação de arquivo de áudio e análise local aproximada de BPM, tonalidade, energia e brilho.
- Link do YouTube abre o player incorporado; não baixa nem disponibiliza o áudio para análise.
- A geração atual ainda não é condicionada pela análise da referência. Os três presets atuais são prompts fixos.

## Próximas fases

1. Criar um Reference Brief confiável, com confiança das estimativas e correção manual.
2. Acrescentar análise descritiva de groove, densidade, timbre e instrumentação.
3. Criar pesquisa de possíveis samples/fontes sonoras, com distinção entre hipótese e confirmação.
4. Enviar o Reference Brief ao backend e gerar três interpretações originais condicionadas à mesma referência.
5. Evoluir exportação para WAV estéreo e, quando suportado, stems e MIDI.

## Privacidade e direitos

- Importar apenas arquivos de áudio que o usuário tenha direito de usar.
- Não extrair áudio de links do YouTube nem contornar proteções da plataforma.
- Não expor chaves de API no frontend ou no repositório.
- Não afirmar que uma fonte ou sample foi identificado sem evidência verificável.

## Documentação

- [Decisão de produto e fluxo de referência](docs/PRODUCT_DIRECTION.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Integração Eleven Music](docs/ELEVEN_MUSIC_INTEGRATION.md)
- [Avaliação de provedores](docs/PROVIDER_EVALUATION.md)
