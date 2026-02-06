import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for adding auth tokens
api.interceptors.request.use((config) => {
    const githubToken = localStorage.getItem('github_token');
    const linkedinToken = localStorage.getItem('linkedin_token');

    if (githubToken && config.url?.includes('/github')) {
        config.headers['X-GitHub-Token'] = githubToken;
    }

    if (linkedinToken && config.url?.includes('/linkedin')) {
        config.headers['X-LinkedIn-Token'] = linkedinToken;
    }

    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// ============ File Operations ============

export const fileService = {
    list: () => api.get('/files'),
    get: (id) => api.get(`/files/${id}`),
    create: (data) => api.post('/files', data),
    update: (id, data) => api.put(`/files/${id}`, data),
    delete: (id) => api.delete(`/files/${id}`),
    save: (id) => api.post(`/files/${id}/save`)
};

// ============ GitHub Operations ============

export const githubService = {
    getAuthUrl: () => api.get('/github/auth'),
    handleCallback: (code) => api.post('/github/callback', { code }),
    getUser: () => api.get('/github/user'),
    listRepos: (page = 1, perPage = 30) =>
        api.get('/github/repos', { params: { page, per_page: perPage } }),
    createRepo: (data) => api.post('/github/repos', data),
    push: (owner, repo, data) => api.post(`/github/repos/${owner}/${repo}/push`, data),
    clone: (owner, repo, branch = 'main') =>
        api.post(`/github/repos/${owner}/${repo}/clone`, {}, { params: { branch } }),
    isAuthenticated: () => !!localStorage.getItem('github_token'),
    clearToken: () => localStorage.removeItem('github_token'),
    setToken: (token) => localStorage.setItem('github_token', token),
    getCurrentUser: () => api.get('/github/user')
};

// ============ Social Media Operations ============

export const socialService = {
    // LinkedIn
    getLinkedInAuthUrl: () => api.get('/social/linkedin/auth'),
    linkedinCallback: (code, redirectUri) =>
        api.post('/social/linkedin/callback', { code, redirect_uri: redirectUri }),
    postToLinkedIn: (content) => api.post('/social/linkedin/post', { content }),

    // Twitter
    getTwitterAuthUrl: () => api.get('/social/twitter/auth'),
    postToTwitter: (content) => api.post('/social/twitter/post', { content }),
    getTwitterUser: () => api.get('/social/twitter/user'),

    // Helper
    generateSummary: (code, projectName, platform) =>
        api.post('/social/generate-summary', { code, project_name: projectName, platform })
};

// ============ AI Learning Operations ============

export const aiService = {
    explainCode: (code, language) => api.post('/ai/explain', { code, language }),
    generateDiagram: (code, language, type = 'flowchart') =>
        api.post('/ai/diagram', { code, language, type }),
    suggestResources: (code, language) => api.post('/ai/resources', { code, language }),
    analyzeCode: (code, language) => api.post('/ai/analyze', { code, language }),
    suggestCommitMessage: (files, diff) =>
        api.post('/ai/commit-message', { files, diff })
};

// ============ Java Service (Advanced Analysis) ============

const javaApi = axios.create({
    baseURL: import.meta.env.VITE_JAVA_API_URL
        ? `${import.meta.env.VITE_JAVA_API_URL}/api`
        : 'http://localhost:8080/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const analyzerService = {
    health: () => javaApi.get('/analyze/health'),
    structure: (code, language) =>
        javaApi.post('/analyze/structure', { code, language }),
    complexity: (code, language) =>
        javaApi.post('/analyze/complexity', { code, language }),
    dependencies: (code, language) =>
        javaApi.post('/analyze/dependencies', { code, language }),
    suggestions: (code, language) =>
        javaApi.post('/analyze/suggestions', { code, language })
};

export default api;
