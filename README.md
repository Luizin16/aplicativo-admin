# 📊 Aplicativo Admin

## 🏢 Visão Geral

O **Aplicativo Admin** é uma aplicação web moderna desenvolvida com **React + Vite**, criada para servir como base estruturada e escalável para sistemas administrativos.

O projeto foi construído com foco em organização, performance e evolução contínua, permitindo fácil integração com APIs e expansão de funcionalidades.

---

## ⚙️ Tecnologias Utilizadas

- React 18
- Vite
- JavaScript (ESNext)
- CSS Modular
- Variáveis de Ambiente (.env)
- Arquitetura Modular por Domínio

---

## 📐 Arquitetura do Projeto

A estrutura do projeto segue boas práticas de organização e separação de responsabilidades:

aplicativo-admin/
├── public/
│ ├── favicon.ico
│ ├── manifest.json
│ └── ícones PWA
│
├── src/
│ ├── API/ # Integração com serviços externos
│ ├── Componentes/ # Componentes reutilizáveis
│ ├── ganchos/ # Hooks customizados
│ ├── utilitários/ # Funções auxiliares
│ ├── App.jsx # Componente raiz
│ ├── main.jsx # Entry point da aplicação
│ └── index.css # Estilos globais
│
├── index.html
├── vite.config.js
├── package.json
└── jsconfig.json


---

## 🎯 Objetivo

Este projeto foi concebido para:

- Servir como base para um sistema administrativo empresarial
- Permitir expansão modular de funcionalidades
- Facilitar manutenção e escalabilidade
- Integrar facilmente com APIs REST
- Evoluir para um sistema completo de gestão

---

## 🚀 Como Executar o Projeto

### Instalar dependências

```bash
npm install
Rodar em ambiente de desenvolvimento
npm run dev
A aplicação estará disponível em:

http://localhost:5173
📦 Build para Produção
npm run build
npm run preview
🔐 Configuração de Ambiente
As variáveis de ambiente devem ser configuradas no arquivo:

.env.local
Exemplo:

VITE_API_URL=
VITE_BASE44_APP_ID=
VITE_BASE44_APP_BASE_URL=
📈 Evoluções Futuras
Implementação de autenticação e controle de acesso

Dashboards administrativos

Integração completa com backend

Deploy automatizado (CI/CD)

Monitoramento e observabilidade

Transformação em PWA completa

🧠 Boas Práticas Aplicadas
Estrutura modular

Separação de responsabilidades

Configuração baseada em ambiente

Organização por domínio

Preparação para crescimento do projeto

