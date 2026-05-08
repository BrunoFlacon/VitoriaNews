import os
import re

skill_translations = {
    "gsd-add-tests": "Gera testes para uma fase concluída com base nos critérios de UAT e na implementação.",
    "gsd-ai-integration-phase": "Gera um contrato de design AI-SPEC.md para fases que envolvem a construção de sistemas de IA.",
    "gsd-audit-fix": "Pipeline autônomo de auditoria para correção — encontra problemas, classifica, corrige, testa e faz o commit.",
    "gsd-audit-milestone": "Audita a conclusão do marco em relação à intenção original antes do arquivamento.",
    "gsd-audit-uat": "Auditoria inter-fases de todos os itens pendentes de UAT e verificação.",
    "gsd-autonomous": "Executa todas as fases restantes de forma autônoma — discute→planeja→executa por fase.",
    "gsd-capture": "Captura ideias, tarefas, notas e sementes para seu destino.",
    "gsd-cleanup": "Arquiva diretórios de fases acumulados de marcos concluídos.",
    "gsd-code-review": "Revisa arquivos-fonte alterados durante uma fase em busca de bugs, problemas de segurança e de qualidade de código.",
    "gsd-complete-milestone": "Arquiva o marco concluído e prepara para a próxima versão.",
    "gsd-config": "Configura os ajustes do GSD — alternadores de fluxo de trabalho, botões avançados, integrações e perfil do modelo.",
    "gsd-debug": "Depuração sistemática com estado persistente em redefinições de contexto.",
    "gsd-discuss-phase": "Reúne contexto da fase por meio de questionamentos adaptativos antes do planejamento.",
    "gsd-docs-update": "Gera ou atualiza a documentação do projeto verificada com base no código-fonte.",
    "gsd-eval-review": "Audita a cobertura de avaliação de uma fase de IA executada e produz um plano de remediação EVAL-REVIEW.md.",
    "gsd-execute-phase": "Executa todos os planos em uma fase com paralelização baseada em ondas.",
    "gsd-explore": "Ideação socrática e roteamento de ideias — pense sobre as ideias antes de se comprometer com os planos.",
    "gsd-extract-learnings": "Extrai decisões, lições, padrões e surpresas dos artefatos da fase concluída.",
    "gsd-fast": "Executa uma tarefa trivial de forma alinhada — sem subagentes, sem carga de planejamento.",
    "gsd-forensics": "Investigação pós-morte de fluxos de trabalho GSD falhos — diagnostica o que deu errado.",
    "gsd-graphify": "Constrói, consulta e inspeciona o grafo de conhecimento do projeto em .planning/graphs/.",
    "gsd-health": "Diagnostica a integridade do diretório de planejamento e opcionalmente repara problemas.",
    "gsd-help": "Exibe os comandos GSD disponíveis e o guia de uso.",
    "gsd-import": "Ingere planos externos com detecção de conflitos contra decisões do projeto antes de escrever qualquer coisa.",
    "gsd-inbox": "Filtra e analisa issues e PRs abertos no GitHub de acordo com os modelos do projeto e diretrizes de contribuição.",
    "gsd-ingest-docs": "Inicializa ou mescla uma configuração .planning/ a partir de ADRs, PRDs, SPECs e documentos existentes em um repositório.",
    "gsd-manager": "Centro de comando interativo para gerenciar múltiplas fases a partir de um único terminal.",
    "gsd-map-codebase": "Analisa o código-fonte com agentes mapeadores paralelos para produzir documentos em .planning/codebase/.",
    "gsd-milestone-summary": "Gera um resumo abrangente do projeto a partir de artefatos de marcos para integração e revisão da equipe.",
    "gsd-new-milestone": "Inicia um novo ciclo de marco — atualiza PROJECT.md e direciona aos requisitos.",
    "gsd-new-project": "Inicializa um novo projeto com coleta profunda de contexto e PROJECT.md.",
    "gsd-ns-context": "inteligência da base de código | mapeamento de grafos e aprendizados",
    "gsd-ns-ideate": "captura de exploração | esboços, spikes e design de specs",
    "gsd-ns-manage": "configuração de workspace | threads, workstreams e inbox",
    "gsd-ns-project": "ciclo de vida do projeto | marcos, auditorias e resumos",
    "gsd-ns-review": "portões de qualidade | revisão de código, debug, auditoria de segurança e ui",
    "gsd-ns-workflow": "fluxo de trabalho | discutir, planejar, executar e verificar progresso da fase",
    "gsd-pause-work": "Cria um handoff de contexto ao pausar o trabalho no meio de uma fase.",
    "gsd-phase": "CRUD para fases no ROADMAP.md — adicione, insira, remova ou edite fases.",
    "gsd-plan-phase": "Cria um plano de fase detalhado (PLAN.md) com loop de verificação.",
    "gsd-plan-review-convergence": "Loop inter-IA de convergência de plano — replaneje com o feedback da revisão até não restarem preocupações.",
    "gsd-pr-branch": "Cria uma branch de PR limpa, filtrando commits de .planning/ — pronto para revisão de código.",
    "gsd-profile-user": "Gera o perfil comportamental do desenvolvedor e cria artefatos detectáveis pelo Claude.",
    "gsd-progress": "Verifica o progresso, avança o fluxo de trabalho ou despacha uma intenção em formato livre — comando situacional.",
    "gsd-quick": "Executa uma tarefa rápida com as garantias do GSD, mas pula agentes opcionais.",
    "gsd-resume-work": "Retoma o trabalho de uma sessão anterior com restauração total de contexto.",
    "gsd-review": "Solicita a revisão de planos de fase por inteligências artificiais externas.",
    "gsd-review-backlog": "Revisa e promove itens do backlog para o marco ativo.",
    "gsd-secure-phase": "Verifica retroativamente mitigações de ameaças para uma fase concluída.",
    "gsd-settings": "Configura os alternadores do fluxo de trabalho do GSD e o perfil do modelo.",
    "gsd-ship": "Cria PR, executa revisão e prepara para o merge após aprovação das verificações.",
    "gsd-sketch": "Esboça ideias de UI/design com mockups HTML descartáveis ou propõe o que esboçar a seguir.",
    "gsd-spec-phase": "Esclarece O QUE uma fase entrega através de pontuação de ambiguidade; produz um SPEC.md.",
    "gsd-spike": "Explora ideias através de provas de conceito (spikes) ou propõe a próxima investigação.",
    "gsd-stats": "Exibe estatísticas do projeto — fases, planos, requisitos, métricas git e cronograma.",
    "gsd-thread": "Gerencia threads persistentes de contexto para trabalhos entre sessões.",
    "gsd-ui-phase": "Gera um contrato de design de UI (UI-SPEC.md) para fases frontend.",
    "gsd-ui-review": "Auditoria visual retroativa de 6 pilares do código frontend implementado.",
    "gsd-ultraplan-phase": "[BETA] Transfere a fase de planejamento para a nuvem; revise no navegador e importe de volta.",
    "gsd-undo": "Reversão segura do git. Desfaz commits de planos ou fases usando checagem de dependências.",
    "gsd-update": "Atualiza o GSD para a versão mais recente com exibição do changelog.",
    "gsd-validate-phase": "Audita retroativamente e preenche lacunas de validação para uma fase concluída.",
    "gsd-verify-work": "Valida funcionalidades construídas por meio de UAT conversacional.",
    "gsd-workspace": "Gerencia espaços de trabalho do GSD — criar, listar ou remover ambientes isolados.",
    "gsd-workstreams": "Gerencia fluxos de trabalho paralelos — lista, cria, alterna, verifica status, conclui e retoma."
}

def main():
    # Caminho do diretório de skills expandindo ~
    skills_dir = os.path.expanduser("~/.gemini/antigravity/skills")
    
    if not os.path.exists(skills_dir):
        print(f"Diretório não encontrado: {skills_dir}")
        return

    count = 0
    for skill_name, pt_desc in skill_translations.items():
        skill_file = os.path.join(skills_dir, skill_name, "SKILL.md")
        if not os.path.exists(skill_file):
            print(f"Skipping (not found): {skill_name}")
            continue
            
        with open(skill_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Extrair o frontmatter (YAML entre --- e --- no topo)
        match = re.match(r'^(---[\s\S]*?\n---\n)', content)
        if not match:
            print(f"Skipping (no frontmatter): {skill_name}")
            continue
            
        frontmatter = match.group(1)
        body = content[len(frontmatter):]
        
        # Regex para substituir o bloco 'description:' inteiro (lidando com strings multilinha no YAML)
        # Busca 'description:' e captura tudo até encontrar uma linha que comece com uma letra ou '---'
        new_frontmatter = re.sub(
            r'^(description:.*?\n)(?=^[a-zA-Z\-]|^---)', 
            f'description: "{pt_desc}"\n', 
            frontmatter, 
            flags=re.MULTILINE | re.DOTALL
        )
        
        # Só escreve se houve alteração
        if frontmatter != new_frontmatter:
            with open(skill_file, 'w', encoding='utf-8') as f:
                f.write(new_frontmatter + body)
            print(f"Tradução concluída: {skill_name}")
            count += 1
        else:
            print(f"Já estava traduzido ou formato não esperado: {skill_name}")
            
    print(f"\nFinalizado! {count} descrições de skills traduzidas para o português.")

if __name__ == "__main__":
    main()
