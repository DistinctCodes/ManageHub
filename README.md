# **ManageHub**

**A Comprehensive Coworking and Workspace Management System**

ManageHub is a full-stack platform designed to streamline **coworking and workspace management** for hubs, coworking spaces and workspaces. It includes features like **biometric clock-in/clock-out functionality**, enhancing operational efficiency, security, and administrative oversight. The backend is structured for real-world usage and the frontend is designed for intuitive interaction.

---

## Table of Contents

1. **About**
2. **Features**
3. **Tech Stack**
4. **Getting Started**
   - Prerequisites
   - Installation
   - Environment Variables

5. **Usage**
6. **Project Structure**
7. **Contributing**
8. **Roadmap**
9. **License**
10. **Acknowledgements**

---

## About

ManageHub is structured to handle everyday operational needs of tech hubs, from managing members to tracking workspace usage and attendance using biometric authentication. The platform is modular, scalable, and designed with real-world enterprise needs in mind.

Live Demo: [https://managehub.vercel.app/](https://managehub.vercel.app/)

---

## Key Features

- **Biometric Authentication** — Supports biometric clock-ins/outs for users and staff.
- **User & Role Management** — Manage accounts, roles, and permissions.
- **Workspace Tracking** — Monitor usage of workspaces, seats, and resources.
- **Analytics & Logs** — View attendance and activity logs.
- **Team Collaboration** — Support for teams with admin roles.
- **Modular Architecture** — Easy to extend or customize for future needs.

---

## Tech Stack

ManageHub uses a modern full-stack technology stack:

| Layer                  | Technology                                     |     |
| ---------------------- | ---------------------------------------------- | --- |
| Frontend               | **Next.js**, React, Tailwind CSS               |     |
| Backend                | **NestJS**, Node.js                            |     |
| Database               | **PostgreSQL**                                 |     |
| Blockchain / Contracts | Rust, Stellar _(planned — see [CT-42](https://github.com/DistinctCodes/ManageHub/labels/contracts) tracking)_ |     |
| Deployment             | Vercel 🚀 (Frontend & possibly Serverless API) |     |

> Side note: Using NestJS for API and backend services alongside Next.js for the frontend is a powerful combination for maintainable, scalable projects, especially when complex business logic or multi-client access is needed — something Next.js alone doesn’t fully optimize for in large systems.

---

## Getting Started

These instructions help you run the project locally for development or testing.

### Prerequisites

Make sure you have the following installed:

- Node.js ≥ 18.x
- npm or yarn
- PostgreSQL database
- Rust toolchain (only if/when you work on the _contracts_ workspace, which is planned but **not yet part of the repository**)

---

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/DistinctCodes/ManageHub.git
cd ManageHub
```

2. **Install dependencies**

```bash
# frontend
cd frontend
npm install

# backend
cd ../backend
npm install
```

---

### Environment Variables

Copy the example environment variables and configure them:

```bash
cp .env.example .env
```

Update variables such as:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / other secrets
- Any API keys for external services

---

## Usage

**Run backend:**

```bash
cd backend
npm run start:dev
```

**Run frontend:**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Project Structure

```plaintext
ManageHub/
├── backend/            # NestJS backend API
├── frontend/           # Next.js client application
├── contracts/          # Rust & Stellar contract modules — **planned**, not yet in the repo (see CT-42 tracking)
├── .github/            # CI/CD workflows
├── README.md           # Project readme (this file)
```

- **backend/** — Contains controllers, services, modules, database logic.
- **frontend/** — UI components, pages, API integrations.
- **contracts/** — *(planned)* Smart contract or blockchain/logic modules (Rust). This workspace does not exist in the repository yet; it is tracked under the [CT-42 series of issues](https://github.com/DistinctCodes/ManageHub/labels/contracts) and will be added with the contracts scaffold.

---

## Contributing

We love contributions! Whether it’s documentation, bug fixes, new features, or tests — your help is appreciated.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/YourFeature`)
3. Commit your changes
4. Push and open a pull request

Please follow the existing code style and architecture when contributing.

---

## Acknowledgements

Thanks to all contributors and maintainers on this project — there are **96+ contributors** helping shape this repository.
