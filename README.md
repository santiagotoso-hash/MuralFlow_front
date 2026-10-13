<img width="1038" height="787" alt="mural flow" src="https://github.com/user-attachments/assets/df338f35-4b99-407c-9bfe-cf4698d85402" />

<img width="1017" height="792" alt="mural flow2" src="https://github.com/user-attachments/assets/67ef00e2-1d81-4252-9569-c96be6180cdb" />

# MuralFlow — Front

Comunicação entre a escola e as famílias dos alunos: **comunicados com confirmação de leitura**, **agenda escolar** e **mensagens diretas** entre responsáveis e professores.

API: repositório `scholar-day-backend` (precisa estar rodando).

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Lucide · porta 3001.

## Como rodar

Pré-requisitos: Node 20+ e a API rodando.

```bash
cp .env.example .env.local  # NEXT_PUBLIC_API_URL aponta para a API
npm install
npm run dev                 # http://localhost:3001
```

Usuários de demonstração: ver o README do `scholar-day-backend`.
