# CNAD Assignment 2 – Team 2

## 📌 Project Overview

Persons with Intellectual Disabilities (PWIDs) often require support in completing **Activities of Daily Living (ADLs)** such as personal hygiene, medication intake, meal preparation, and household tasks. While existing solutions attempt to address these needs, many rely heavily on **invasive monitoring techniques** such as cameras or constant supervision, which can compromise privacy, dignity, and autonomy.

Our project aims to explore how **technology can support and empower PWIDs** in managing their daily routines **without unnecessarily infringing on their privacy**. Rather than continuous surveillance, the system focuses on **intentional, low-resolution interactions** that indicate task completion while preserving independence.

---

## 💡 Solution Overview

We designed a **privacy-preserving, task-based support system** that assists PWIDs with daily self-care and household routines while providing caregivers with **high-level visibility** into task progress and long-term trends.

### Key Design Principles
- **Non-intrusive support** – No cameras or continuous monitoring
- **User dignity & autonomy** – Tasks are completed through intentional actions
- **Caregiver reassurance** – Aggregated progress and trends, not surveillance
- **Scalable architecture** – Microservices-based and cloud-native

### How the System Works
- PWIDs complete tasks through **intentional interactions** (e.g. NFC-based actions)
- Task completion is inferred and logged without capturing sensitive data
- Caregivers access a dashboard that shows:
  - Daily task progress
  - Monthly completion trends
  - Calendar-based task views
  - Direct call functionality for manual check-ins

To validate system behaviour without relying on physical hardware, **sensor interactions are simulated using structured JSON events**, allowing backend logic, task inference, and analytics to be demonstrated clearly and ethically.

---

## 🏗️ System Architecture & Program Design


### System Architecture Diagram

![System Architecture Diagram](archi-diagram.png)

---

## 🧩 Service Breakdown

### 1️⃣ Frontend Service (`frontend-service/`)

**Responsibility**
- Handles all user interactions and UI logic
- Provides PWID and caregiver dashboards
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
- Manages user roles (PWID vs caregiver)
- Controls access to protected resources

**Key Files**
- `Dockerfile`  
- `package.json`  

**Design Notes**
- Authentication logic is isolated to improve security  
- Can be scaled independently from other services  
- Reduces coupling between identity management and business logic  

---

### 3️⃣ Task Service (`task-service/`)

**Responsibility**
- Implements core task management functionality
- Handles task creation, updates, logging, and analytics
- Provides APIs for progress tracking and trend analysis

**Key Files**
- `Dockerfile`  
- `package.json`  

**Design Notes**
- Stateless service design  
- Clear API boundaries for extensibility  
- Core business logic decoupled from UI and authentication  

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

```markdown
```text
CNAD_ASG2_Team2/
├── auth-service/
├── frontend-service/
├── task-service/
├── infra/
├── k8s/
├── docker-compose.yml
├── .gitignore
└── README.md

```
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

### Merge Strategy
- Feature branches merged via **Pull Requests**
- Ensures code review, CI checks, and clean history  

---

## 📝 Commit Message Standards

This repository follows **Conventional Commits**:
<type>(scope): <short description>


Common types include `feat`, `fix`, `docs`, `chore`, `refactor`, and `ci`.

---

## 🚫 `.gitignore` Configuration

Excludes:
- `node_modules/`
- Environment files (`.env`)
- Build artifacts
- OS-specific files  

This ensures a clean, secure repository.

---

## 🔐 DevOps & Security Practices

- Containerization using **Docker**
- Service orchestration via **Docker Compose**
- CI-based security scanning (SAST, DAST, SCA)
- Strong separation of concerns across services

These practices align with **cloud-native and DevSecOps standards**.

---

## ▶️ How to Run the Project

Ensure Docker and Docker Compose are installed:

```bash
docker-compose up --build

kubernetes
Deployment Steps

Ensure you have kubectl and a Kubernetes cluster ready (e.g., Minikube, Kind, or cloud provider cluster).

Apply ConfigMaps and Secrets:

kubectl apply -f k8s/configmaps-secrets.yaml


Deploy services:

kubectl apply -f k8s/auth-deployment.yaml
kubectl apply -f k8s/task-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml


Expose services via Ingress:

kubectl apply -f k8s/ingress.yaml


Verify pods and services:

kubectl get pods
kubectl get svc

Benefits of Kubernetes Deployment

Scalability: Services can be scaled independently via replicas.

High Availability: Kubernetes automatically restarts failed pods and distributes them across nodes.

Configuration Management: Centralized ConfigMaps and Secrets for environment-specific variables.

Cloud-Native Readiness: Easier to deploy in AWS EKS, GCP GKE, or Azure AKS with minimal changes.
