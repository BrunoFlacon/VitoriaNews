# PRD: Módulo Editor de Design Nativo

## 1. Visão Geral
O objetivo deste módulo é implementar um editor gráfico embutido diretamente no painel da aplicação. A solução combina a usabilidade intuitiva e a experiência de arrastar-e-soltar do **LidoJS (Canva Clone)** com a robustez e precisão do motor gráfico **IMG.LY (CE.SDK)**. Todo projeto criado operará no cliente, sendo posteriormente salvo, renderizado e vinculado de forma relacional ao ID do usuário autenticado no painel.

## 2. Usabilidade e Interface (Inspirado no LidoJS)
* **Gestão de Templates Visuais:** Um catálogo de modelos pré-definidos (ex: miniaturas de vídeo, posts para redes sociais) que podem ser instanciados com um clique.
* **Barra Lateral de Recursos:** Uma interface amigável para navegação e injeção de elementos (textos, imagens, vetores) utilizando drag-and-drop para dentro do canvas.
* **Curva de Aprendizado Minimizada:** Controles flutuantes de acesso rápido para as propriedades mais comuns (cor, tamanho, transparência), focando na agilidade de produção de conteúdo.

## 3. Motor Gráfico e Precisão (Inspirado no CE.SDK)
* **Arquitetura Modular:** Configuração da interface do usuário separada por arquivos (`config/ui/canvas.ts`, `dock.ts`, `inspectorBar.ts`), permitindo ocultar ou exibir ferramentas complexas de acordo com a necessidade.
* **Controle Avançado de Camadas:** Gestão profissional de sobreposição, agrupamento e travamento de objetos, essencial para documentos multipáginas e composições detalhadas.
* **Processamento e Exportação:** Suporte a recorte, ajustes finos de tipografia, integração do plugin de remoção de fundo local (`plugins/background-removal.ts`) e saídas em alta resolução usando as diretrizes do `config/actions.ts`.

## 4. Integração Técnica e Persistência
* **Front-end em React:** O canvas do CE.SDK será encapsulado em componentes React, permitindo que o estado do editor converse nativamente com as rotas do painel.
* **Gerenciamento de Caminhos e Segurança:** O `resolveAssetPath.ts` garantirá que os recursos vitais (fontes, elementos de interface) sejam servidos respeitando as políticas de segurança de conteúdo (CSP) e o tráfego HTTPS do servidor.
* **Armazenamento de Estado Relacional:** As definições de cena geradas pelo editor (JSON) e os arquivos exportados (PNG/PDF) serão persistidos no PostgreSQL e no Storage via Supabase, garantindo que o progresso seja salvo automaticamente no perfil de quem está logado.