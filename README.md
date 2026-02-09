# CNAD Assignment 2 – Team 2

## 📌 Overview

This repository contains a **containerized microservices-based application** developed for **CNAD Assignment 2**.  
The system is designed with a strong emphasis on:

- Clear separation of concerns  
- Infrastructure-as-Code (IaC) principles  
- Cloud-native and DevOps best practices  

Key technologies and practices used include **Docker**, **Docker Compose**, **CI security scanning**, and **disciplined Git workflows**.

The application is composed of multiple independent services that communicate over well-defined interfaces, enabling **scalability**, **maintainability**, and **independent deployment**.

---

## 🏗️ System Architecture & Program Design

### High-Level Architecture

The system follows a **microservices architecture** consisting of the following core components:

- **Frontend Service** – User-facing web application  
- **Auth Service** – Authentication and authorization logic  
- **Task Service** – Core business logic for task management  
- **Infrastructure Layer** – Container orchestration and service wiring  

All services are containerized using Docker and orchestrated locally via Docker Compose.


---

## 🧩 Service Breakdown

### 1️⃣ Frontend Service (`frontend-service/`)

**Responsibility**
- Handles all user interactions and UI logic
- Communicates with backend services via HTTP APIs

**Key Files**
- `app.js` – Main application entry point  
- `config.js` – Environment-based configuration  
- `Dockerfile` – Container build instructions  
- `package.json` – Dependencies and scripts  

**Design Notes**
- Configuration is externalized to support multiple environments  
- Clear separation between presentation logic and backend APIs  
- Designed to be independently deployable  

---

### 2️⃣ Auth Service (`auth-service/`)

**Responsibility**
- Handles user authentication and authorization  
- Performs credential validation and access control  

**Key Files**
- `Dockerfile`  
- `package.json`  

**Design Notes**
- Authentication logic is isolated to improve security  
- Service can be scaled independently from other components  
- Reduces coupling between identity management and business logic  

---

### 3️⃣ Task Service (`task-service/`)

**Responsibility**
- Implements core application functionality related to tasks  
- Exposes APIs for task creation, updates, and retrieval  

**Key Files**
- `Dockerfile`  
- `package.json`  

**Design Notes**
- Designed as a stateless service  
- Clear API boundaries enable future extensibility  
- Core business logic is decoupled from UI and authentication  

---

## 🛠️ Infrastructure & Orchestration

### Docker Compose (`docker-compose.yml`)
- Defines all services and their interconnections  
- Simplifies local development and testing  
- Ensures consistent runtime environments  

### Infrastructure Folder (`infra/`)
- Reserved for infrastructure-related configurations  
- Supports Infrastructure-as-Code principles  
- Enables future expansion (e.g. cloud deployment configs)  

---

## 🗂️ Git Repository Organization


**Design Principles**
- Each service is self-contained  
- Clear and predictable folder structure  
- Easy onboarding for new contributors  

---

## 🔀 Git Workflow & Version Control Practices

### Branching Strategy

- **`main` branch**
  - Production-ready, stable code only  

- **Feature branches**
  - Used for developing new features or fixes  
  - Named descriptively (e.g. `feature/auth-service`, `fix/docker-build`)  

---

### Merge Strategy

- Feature branches are merged into `main` via **Pull Requests**
- Ensures:
  - Code review  
  - CI checks before integration  
  - Clean and traceable commit history  

---

## 📝 Commit Message Standards

This repository follows **Conventional Commits**:

