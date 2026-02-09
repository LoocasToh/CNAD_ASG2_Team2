CNAD Assignment 2 – Team 2
Overview
This repository contains a containerized microservices-based application developed for CNAD Assignment 2. The system is designed with clear separation of concerns, infrastructure-as-code principles, and DevOps best practices such as Docker, Docker Compose, CI security scanning, and Git workflow discipline.
The application consists of multiple services that communicate over well-defined interfaces, enabling scalability, maintainability, and independent deployment.
________________________________________
System Architecture & Program Design
High-Level Architecture
The program follows a microservices architecture composed of the following main components:
•	Frontend Service – User-facing web application
•	Auth Service – Authentication and authorization logic
•	Task Service – Core business logic for task management
•	Infrastructure Layer – Container orchestration and service wiring
All services are containerized using Docker and orchestrated locally using Docker Compose.
┌──────────────┐
│   Frontend   │
│   Service    │
└──────┬───────┘
       │ HTTP/API
┌──────▼───────┐
│  Auth Service│
└──────┬───────┘
       │
┌──────▼───────┐
│ Task Service │
└──────────────┘
________________________________________
Service Breakdown
1. Frontend Service (frontend-service/)
Responsibility:
•	Handles user interactions and UI logic
•	Sends API requests to backend services
Key Files:
•	app.js – Main application entry point
•	config.js – Environment-based configuration
•	Dockerfile – Container build instructions
•	package.json – Dependencies and scripts
Design Notes:
•	Configuration is externalized to support multiple environments
•	Clean separation between UI logic and backend APIs
________________________________________
2. Auth Service (auth-service/)
Responsibility:
•	User authentication and authorization
•	Credential validation and access control
Key Files:
•	Dockerfile
•	package.json
Design Notes:
•	Isolated authentication logic improves security
•	Can be scaled independently from other services
________________________________________
3. Task Service (task-service/)
Responsibility:
•	Handles core application functionality related to tasks
•	Business logic and API endpoints
Key Files:
•	Dockerfile
•	package.json
Design Notes:
•	Stateless service design
•	Clear API boundary for future extensibility
________________________________________
Infrastructure & Orchestration
Docker Compose (docker-compose.yml)
•	Defines all services and their interconnections
•	Simplifies local development and testing
•	Ensures consistent runtime environments
Infrastructure Folder (infra/)
•	Reserved for infrastructure-related configurations
•	Supports Infrastructure-as-Code principles
________________________________________
Git Repository Organization
CNAD_ASG2_Team2/
├── auth-service/
├── frontend-service/
├── task-service/
├── infra/
├── docker-compose.yml
├── .gitignore
└── README.md
•	Each service is self-contained
•	Clear, predictable folder structure
•	Easy onboarding for new contributors
________________________________________
Git Workflow & Version Control Practices
Branching Strategy
•	main branch
o	Production-ready, stable code only
•	Feature branches
o	Used for developing new features or fixes
o	Named descriptively (e.g. feature/auth-service, fix/docker-build)
Merge Strategy
•	Feature branches are merged into main using pull requests
•	Ensures:
o	Code review
o	CI checks before integration
o	Clean and traceable history
________________________________________
Commit Message Standards
This repository follows Conventional Commits for clarity and automation readiness:
<type>(scope): <short description>
Common Types
•	feat – New feature
•	fix – Bug fix
•	docs – Documentation changes
•	chore – Maintenance tasks
•	refactor – Code restructuring without behavior change
•	ci – CI/CD related changes
Examples
•	feat(frontend): add login page
•	fix(auth): resolve token validation bug
•	docs(readme): add architecture documentation
•	ci(actions): add SAST and DAST workflows
This results in a logical, readable, and well-scoped commit history.
________________________________________
.gitignore Configuration
The .gitignore file is configured to exclude:
•	node_modules/
•	Environment files (.env)
•	Build artifacts
•	OS-specific files
This ensures:
•	Cleaner repository history
•	No accidental commits of sensitive or generated files
•	Smaller and more secure repository
________________________________________
DevOps & Security Practices
•	Containerization with Docker
•	Service orchestration using Docker Compose
•	CI security scanning (SAST, DAST, SCA) via GitHub Actions
•	Separation of concerns across services
These practices align with real-world cloud-native and DevSecOps standards.
________________________________________
How to Run the Project
docker-compose up --build
Ensure Docker and Docker Compose are installed before running.
________________________________________
Conclusion
This project demonstrates:
•	Thoughtful program and system design
•	Strong Git discipline and collaboration practices
•	Clean repository organization
•	Practical application of containerization and DevOps principles
The structure and workflow are scalable, maintainable, and aligned with industry best practices.
