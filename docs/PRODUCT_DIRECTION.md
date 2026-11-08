# GORI SAMPLE LAB — decisão de produto: referência e três interpretações

Data: 08/11/2026

## Decisão aprovada pelo usuário

A direção escolhida é a **Opção A**: a partir de uma referência musical, criar três novas interpretações que preservem características musicais reconhecíveis da referência, sem copiar o fonograma, samples, melodia ou arranjo protegido.

O usuário também quer um módulo de **pesquisa de samples e fontes sonoras**.

## Experiência-alvo

1. Receber uma URL do YouTube como identificação/atalho para a referência e, quando disponível, um arquivo de áudio autorizado para análise. A URL do YouTube, sozinha, não significa que o aplicativo obteve ou analisou o áudio.
2. Analisar a gravação autorizada e montar um Reference Brief com:
   - BPM e confiança da estimativa;
   - tonalidade provável e confiança;
   - métrica, groove, swing e densidade rítmica;
   - progressão/acordes prováveis, quando a análise suportar;
   - instrumentação percebida e confiança por família;
   - timbre, textura, energia, dinâmica e clima;
   - momentos/trechos relevantes com timestamps, quando possível.
3. Mostrar ao usuário o que foi detectado, com rótulos de confiança e possibilidade de correção.
4. Pesquisar possíveis fontes sonoras e samples relacionados: instrumentos, famílias de timbre, períodos/estéticas, técnicas de gravação, bibliotecas e catálogos licenciados. Resultados devem ser apresentados como **pistas/sugestões**, nunca como identificação factual de um sample sem evidência verificável.
5. Gerar três interpretações originais da mesma referência:
   - **Interpretação 1 — Essência:** preservar o clima, a função harmônica, o groove e a instrumentação percebida, com material musical novo.
   - **Interpretação 2 — Releitura:** preservar as características centrais, alterando voicings, instrumentação, dinâmica e arranjo.
   - **Interpretação 3 — Desconstrução:** manter a identidade de groove/atmosfera, reconstruindo o arranjo de forma mais livre e experimental.
6. Oferecer prévia, comparação A/B/C, download WAV estéreo e, em fases posteriores, stems e MIDI quando o motor fornecer ou o arranjo permitir.

## Limites importantes

- Não extrair nem baixar áudio do YouTube, não contornar DRM ou restrições da plataforma.
- A análise acústica exige arquivo autorizado enviado pelo usuário ou fonte licenciada/autorizada.
- Não prometer reconhecer o disco exato, músico, gravação ou sample original sem uma base de fingerprinting/catálogo e correspondência verificável.
- O módulo de pesquisa pode sugerir fontes e caminhos de busca, mas deve distinguir claramente hipótese, correspondência provável e confirmação.
- Não enviar o fonograma de referência ao motor de geração até que o método, os direitos e o suporte da API estejam confirmados. A estratégia inicial é gerar a partir de um Reference Brief textual estruturado.
- A composição gerada deve ser nova; não copiar melodias, gravações ou samples da referência.

## Estado atual do repositório

- PWA publicada no GitHub Pages.
- Cloudflare Worker implantado.
- Turnstile validado no navegador.
- ElevenLabs Music API conectada para geração por prompts fixos.
- A implementação atual ainda **não** envia Reference Brief para o Worker nem produz as três interpretações condicionadas à referência.
- A análise atual no navegador estima principalmente BPM, tonalidade, energia e brilho; não faz reconhecimento confiável de instrumentos, acordes completos ou origem de samples.
- O link do YouTube apenas abre o player incorporado; não fornece o áudio para análise.

## Plano incremental

### Fase 1 — Reference Brief confiável
- Melhorar a análise do arquivo autorizado.
- Separar valores medidos, estimados e informados manualmente.
- Incluir confiança, correção manual e uma ficha musical legível.
- Adicionar descrição de groove, densidade, textura e instrumentação percebida com apoio de um analisador de áudio apropriado.

### Fase 2 — Pesquisa de samples e fontes
- Criar uma seção de hipóteses de fontes sonoras.
- Sugerir instrumentos, famílias, técnicas, épocas/estéticas e bibliotecas/catálogos licenciados.
- Não identificar um sample exato sem correspondência verificável.
- Exibir termos de busca e fontes para o usuário investigar.

### Fase 3 — Três interpretações condicionadas
- Enviar Reference Brief estruturado ao backend.
- Construir três prompts/plans derivados da mesma referência e com diferenças controladas.
- Comparar resultados e manter a ligação entre cada resultado e os atributos da referência.
- Validar a qualidade musical e os direitos do provedor.

### Fase 4 — Produção
- WAV estéreo como exportação principal.
- Stems e MIDI quando tecnicamente suportados.
- Comparação A/B/C, regeneração seletiva, histórico e remoção dos arquivos temporários.

## Dependências técnicas a validar

- Análise semântica de áudio: a Gemini API documenta entrada de áudio e respostas descritivas; requer avaliar qualidade real para análise musical e configurar uma chave secreta própria no backend antes de qualquer integração.
- Geração: a ElevenLabs Music API atual do Worker recebe prompt ou composition_plan. A documentação da API consultada não expõe um campo de áudio de referência no endpoint de composição. A função Audio Reference documentada na experiência Music do ElevenLabs permite orientar o som a partir de uma faixa curta, mas não deve ser presumida como disponível no endpoint público usado pelo Worker.
- Pesquisa de sample exato: exige avaliar bases/catalogação e licenças específicas; não faz parte da análise acústica genérica.

## Critério de conclusão da primeira entrega

O usuário importa um arquivo autorizado, recebe um Reference Brief com estimativas e confiança, corrige BPM/tom se necessário, vê sugestões de fontes sonoras claramente identificadas como hipóteses e consegue solicitar três novas composições que incorporam o Brief. O sistema não afirma ter analisado o áudio de um link que apenas abriu no player.
