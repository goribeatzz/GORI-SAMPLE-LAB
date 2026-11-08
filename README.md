# GORI SAMPLE LAB

PWA mobile-first para análise local de áudio e criação procedural de ideias de samples originais.

## Estado
Primeira versão funcional em desenvolvimento. O processamento ocorre localmente no navegador; nenhum áudio é enviado a um servidor. A geração é procedural, não é IA musical.

## Executar
Abra `index.html` em um servidor HTTPS ou local. Para instalar no iPhone, publique em HTTPS e use Safari → Compartilhar → Adicionar à Tela de Início.

## Funcionalidades
- Importação local de áudio e pré-escuta.
- Análise aproximada de duração, BPM, tonalidade, energia e perfil espectral.
- Correção manual de BPM e tonalidade.
- Geração de três ideias: Warm Keys, Dark Tape e Airy Jazz.
- Reprodução e exportação WAV PCM 24-bit, 44,1 kHz, 8 compassos.
- PWA com manifesto e service worker.

## Limitações conhecidas
- A análise de BPM e tonalidade é estimativa e pode exigir correção manual.
- A geração atual é procedural e mono; não substitui uma engine de IA musical.
- Compatibilidade de formatos depende do Safari/iOS. WAV e MP3 são os formatos mais seguros para teste.
- Este MVP não baixa nem extrai áudio de links do YouTube. Importe somente arquivos que você tenha direito de usar.
