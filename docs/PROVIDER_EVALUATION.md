# GORI SAMPLE LAB — avaliação inicial de motores musicais

Data da avaliação: 08/11/2026

## Decisão de arquitetura

Candidato prioritário para prova de conceito: **Eleven Music API (ElevenLabs)**. Alternativa para comparação: **Google Lyria 3.5 (Gemini API)**.

Esta é uma recomendação para teste, não uma integração aprovada nem uma garantia de resultado. Nenhuma chave de API foi criada ou armazenada.

## 1. Eleven Music API

Documentação oficial consultada:
- Compose music: https://elevenlabs.io/docs/api-reference/music/compose
- Create composition plan: https://elevenlabs.io/docs/api-reference/music/create-composition-plan
- Upload music: https://elevenlabs.io/docs/api-reference/music/upload
- Stem separation: https://elevenlabs.io/docs/api-reference/music/separate-stems
- Termos de música: https://elevenlabs.io/music-terms
- Página comercial/API: https://elevenlabs.io/eleven-music-api

Capacidades confirmadas na documentação:
- `POST /v1/music` aceita prompt ou composition_plan.
- Modelos documentados: `music_v1`, `music_v2`, `music_v2_5`.
- Geração instrumental pode ser explicitada com `force_instrumental=true` quando usando prompt.
- Duração por prompt: 3.000 a 600.000 ms.
- A saída pode ser MP3 ou outro formato de saída disponível no parâmetro `output_format`.
- Existe endpoint separado para criar plano de composição.
- Existe endpoint separado de separação de stems.
- A página comercial anuncia streaming, stems e edição; disponibilidade e limites dependem do plano/endpoint.

**Atenção importante sobre referência de áudio:** a documentação geral do produto descreve Audio Reference nos modelos Music v2/v2.5 na experiência de produto. Porém, o schema público de `POST /v1/music` consultado não apresenta campo de áudio de referência. O endpoint `POST /v1/music/upload` é descrito como upload para uso posterior em *inpainting*, não como entrada de referência para compor uma música nova. Portanto, NÃO presumir que a API pública permite passar a referência musical diretamente ao gerador. Confirmar com ElevenLabs antes de implementar esse fluxo.

Licenciamento:
- A ElevenLabs anuncia uso comercial amplo, mas os direitos dependem do plano e dos termos de música.
- Verificar os termos aplicáveis ao plano/API e o uso permitido pelos usuários finais do GORI SAMPLE LAB antes de lançar comercialmente.
- O endpoint documenta que zero retention via `enable_logging=false` é reservado a clientes Enterprise.

## 2. Google Lyria 3.5

Documentação oficial:
- https://ai.google.dev/gemini-api/docs/music-generation

Capacidades descritas:
- `lyria-3-clip-preview`: clipes de 30 segundos.
- `lyria-3.5`: músicas de alguns minutos.
- Áudio estéreo de alta fidelidade, 44,1 kHz.
- Geração a partir de prompts; instrumental pode ser solicitado.
- A documentação consultada informa que a edição iterativa multi-turno não é suportada atualmente e que os resultados variam entre chamadas.
- A documentação consultada não confirma um parâmetro de referência de áudio para guiar a geração.

Licenciamento e disponibilidade:
- Verificar termos comerciais, disponibilidade regional, preços e condições de uso do Gemini API antes de qualquer integração.

## 3. Matriz de decisão

| Critério | Eleven Music | Google Lyria 3.5 |
|---|---|---|
| Composição completa | Documentada | Documentada |
| Instrumental | `force_instrumental` na API | Prompt instrumental |
| Plano/estrutura | Endpoint próprio | Controle por prompt/estrutura |
| Duração | 3 s a 10 min no endpoint de composição | Clipe 30 s ou alguns minutos |
| Referência de áudio na API pública | Não confirmada no schema consultado | Não confirmada na documentação consultada |
| Stems | Endpoint específico e oferta comercial; validar plano | Não confirmado na documentação consultada |
| Direitos comerciais | Dependem do plano/termos | Validar termos do Gemini API |
| Recomendação | Primeiro candidato para PoC | Benchmark comparativo |

## 4. Prova de conceito proposta

Antes de escrever integração de produção:
1. Obter uma conta e chave API de teste do provedor escolhido. A chave deve ficar somente no backend/secret manager, nunca no repositório ou no navegador.
2. Criar um backend mínimo com endpoint autenticado `POST /api/generations`.
3. Enviar três prompts instrumentais originais e contrastantes:
   - Soul de 1970s com Rhodes, baixo elétrico, bateria acústica com ghost notes, guitarra limpa e cordas discretas.
   - Jazz escuro drumless com piano acústico, contrabaixo, sax tenor discreto e ambiência de fita.
   - Funk orgânico com baixo sincopado, bateria seca, clavinet, guitarra rítmica e percussão.
4. Solicitar trechos de 30–45 segundos, sem vocais, sem imitar artistas ou gravações identificáveis.
5. Avaliar musicalidade, realismo instrumental, groove, variação, qualidade do áudio, latência, custo e licença.
6. Só depois integrar o provedor à PWA.

## 5. Arquitetura de segurança obrigatória

- GitHub Pages hospeda apenas a PWA.
- Backend separado mantém API keys e faz chamadas ao provedor.
- Nunca colocar chave de API em `app.js`, HTML, variáveis públicas do build ou commits.
- O backend deve limitar tamanho/duração, validar parâmetros, autenticar usuários e controlar custo por job.
- Não baixar áudio do YouTube nem contornar proteções. O link pode servir como metadado/atalho; a análise acústica requer arquivo autorizado.
- Não enviar a gravação de referência ao gerador se a estratégia escolhida for composição totalmente nova baseada apenas em atributos gerais.

## 6. Próxima decisão bloqueante

Precisamos confirmar se o ElevenLabs oferece Audio Reference pela API para o plano pretendido. Se não oferecer, a primeira versão do GORI SAMPLE LAB continuará usando análise local do arquivo autorizado para produzir um Reference Brief (BPM, tom, energia, densidade e clima), que será convertido em instruções textuais para composições novas. Isso mantém a proposta aprovada sem alegar uma integração inexistente.
