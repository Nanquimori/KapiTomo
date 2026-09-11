# Nyxovira Plugin Lab Worker

Backend hospedado do [Laboratório Web de Plugins](../nyxovira/plugin-api/tester/).

- Recebe somente ZIP de até 2 MiB e uma URL pública HTTP(S).
- Inspeciona caminhos, tamanhos, executáveis e APIs de exfiltração bloqueadas.
- Carrega a página, os módulos JavaScript dinâmicos e as APIs por um proxy HTTPS temporário; `download_target.js` é executado em um iframe isolado no navegador do próprio visitante.
- Reproduz chamadas `fetch`, `XMLHttpRequest` assíncronas e a resposta previamente carregada para o `XMLHttpRequest` síncrono usado por plugins compatíveis com o WebView.
- O navegador do próprio visitante executa o teste; o backend apenas valida, busca e retransmite dados temporários.
- Escolhe o primeiro capítulo automaticamente e só aprova quadrinhos depois de baixar todas as páginas desse capítulo. Acima do limite técnico de 120 páginas/96 MiB, o teste falha em vez de aprovar uma amostra parcial.
- Não possui KV, R2, D1 ou qualquer outro binding persistente.
- O Worker não conserva ZIP, manifesto, script ou conteúdo depois de responder.

O segredo `LAB_TOKEN_SECRET` assina sessões efêmeras de 15 minutos e impede que o proxy seja usado fora dos domínios declarados pelo plugin.

O endpoint público é `https://nyxovira-plugin-lab.nanquimori-kapitomo.workers.dev`.
