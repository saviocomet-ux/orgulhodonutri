

## Plano: App de Controle de Dieta para Acompanhamento de Emagrecimento

### Visão Geral
Aplicativo web multi-paciente com visual claro e minimalista (estilo Apple Health), usando Supabase (Lovable Cloud) para banco de dados/autenticação e Lovable AI para análise de refeições por foto.

---

### 1. Autenticação e Perfis
- Login/cadastro por email + senha
- Tabela `profiles` com dados fixos (altura, idade) e variáveis (peso, % gordura)
- Tabela `user_roles` para diferenciar nutricionista/admin de paciente
- Cálculo automático de metas diárias (kcal e água) baseado no perfil
- Tela de perfil para editar métricas e visualizar metas recalculadas

### 2. Dashboard Principal
- Visual limpo com cards mostrando:
  - **Calorias**: barra de progresso circular com consumo atual vs meta (ex: 1.200 / 2.800 kcal)
  - **Água**: barra de progresso linear com consumo vs meta (ex: 3L / 5L)
  - **Macros do dia**: proteínas, carboidratos e gorduras em gráfico simples
- Resumo das refeições registradas no dia

### 3. Módulo de Água
- Barra de progresso diária que reseta à meia-noite
- Botões de atalho rápido na tela principal: "+250ml", "+500ml", "+1L"
- Registro com um clique, feedback visual instantâneo
- Histórico de hidratação por dia

### 4. Módulo de Refeições com IA (Visão Computacional)
- Botão "Registrar Refeição" com opção de tirar foto ou fazer upload
- Edge function que envia a imagem para Lovable AI (Gemini) com system prompt rígido
- A IA retorna JSON estruturado: calorias estimadas + macros (proteína, carbs, gordura)
- Soma automática ao consumo diário e atualização em tempo real do dashboard
- Lista de refeições do dia com detalhes de cada análise

### 5. Histórico e Evolução
- Gráfico de evolução de peso ao longo do tempo
- Histórico diário de calorias e água consumidos
- Registro periódico de peso e % gordura para acompanhar progresso

### 6. Estrutura do Banco de Dados
- `profiles`: altura, idade, peso_atual, percentual_gordura, meta_kcal, meta_agua
- `user_roles`: controle de acesso (admin/paciente)
- `water_logs`: registros de água com timestamp
- `meals`: foto, calorias, proteina, carbs, gordura, timestamp
- RLS para cada paciente ver apenas seus dados

