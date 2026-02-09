// const API_URL = "http://localhost:8080";

// frontend-service/public/js/config.js\
window.AUTH_BASE_URL = window.AUTH_BASE_URL || (typeof process !== 'undefined' ? process.env.AUTH_BASE_URL : "http://localhost:8080/auth");
window.TASK_BASE_URL = window.TASK_BASE_URL || (typeof process !== 'undefined' ? process.env.TASK_BASE_URL : "http://localhost:8081/tasks");