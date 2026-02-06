/**
 * GitHub Service
 * Comprehensive GitHub API integration for Roolts
 */

import axios from 'axios';

// Use relative path - Vite will proxy to the backend service
const GITHUB_API = 'https://api.github.com';

// Create axios instance for backend API
const api = axios.create({
    baseURL: '/api/github',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Create axios instance for direct GitHub API calls
const githubApi = axios.create({
    baseURL: GITHUB_API,
    timeout: 30000,
    headers: {
        'Accept': 'application/vnd.github.v3+json'
    }
});

// Token management
let githubToken = localStorage.getItem('github_token');

export const githubService = {
    // ============ Authentication ============

    /**
     * Set GitHub access token
     */
    setToken: (token) => {
        githubToken = token;
        localStorage.setItem('github_token', token);
        githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },

    /**
     * Clear GitHub access token
     */
    clearToken: () => {
        githubToken = null;
        localStorage.removeItem('github_token');
        delete githubApi.defaults.headers.common['Authorization'];
    },

    /**
     * Check if authenticated
     */
    isAuthenticated: () => !!githubToken,

    /**
     * Initiate GitHub OAuth
     */
    initiateAuth: async () => {
        try {
            const response = await api.get('/auth');
            return response.data;
        } catch (error) {
            console.error('Failed to initiate GitHub auth:', error);
            throw error;
        }
    },

    /**
     * Complete OAuth callback
     */
    completeAuth: async (code) => {
        try {
            const response = await api.post('/callback', { code });
            if (response.data.access_token) {
                githubService.setToken(response.data.access_token);
            }
            return response.data;
        } catch (error) {
            console.error('Failed to complete GitHub auth:', error);
            throw error;
        }
    },

    /**
     * Get current user
     */
    getCurrentUser: async () => {
        try {
            const response = await githubApi.get('/user', {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get GitHub user:', error);
            throw error;
        }
    },

    // ============ Repositories ============

    /**
     * List user's repositories
     */
    listRepositories: async (page = 1, perPage = 30) => {
        try {
            const response = await githubApi.get('/user/repos', {
                headers: { 'Authorization': `Bearer ${githubToken}` },
                params: {
                    page,
                    per_page: perPage,
                    sort: 'updated',
                    direction: 'desc'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to list repositories:', error);
            throw error;
        }
    },

    /**
     * Create a new repository
     */
    createRepository: async (name, options = {}) => {
        try {
            const response = await githubApi.post('/user/repos', {
                name,
                description: options.description || '',
                private: options.private || false,
                auto_init: options.autoInit !== false,
                gitignore_template: options.gitignoreTemplate,
                license_template: options.licenseTemplate
            }, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to create repository:', error);
            throw error;
        }
    },

    /**
     * Fork a repository
     */
    forkRepository: async (owner, repo, options = {}) => {
        try {
            const response = await githubApi.post(`/repos/${owner}/${repo}/forks`, {
                name: options.name,
                default_branch_only: options.defaultBranchOnly || false
            }, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fork repository:', error);
            throw error;
        }
    },

    /**
     * Create repository from template
     */
    createFromTemplate: async (templateOwner, templateRepo, name, options = {}) => {
        try {
            const response = await githubApi.post(`/repos/${templateOwner}/${templateRepo}/generate`, {
                name,
                owner: options.owner,
                description: options.description || '',
                include_all_branches: options.includeAllBranches || false,
                private: options.private || false
            }, {
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.baptiste-preview+json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to create from template:', error);
            throw error;
        }
    },

    /**
     * Get repository details
     */
    getRepository: async (owner, repo) => {
        try {
            const response = await githubApi.get(`/repos/${owner}/${repo}`, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get repository:', error);
            throw error;
        }
    },

    /**
     * Delete a repository
     */
    deleteRepository: async (owner, repo) => {
        try {
            await githubApi.delete(`/repos/${owner}/${repo}`, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return true;
        } catch (error) {
            console.error('Failed to delete repository:', error);
            throw error;
        }
    },

    // ============ Repository Content ============

    /**
     * Get repository contents
     */
    getContents: async (owner, repo, path = '', ref = 'main') => {
        try {
            const response = await githubApi.get(`/repos/${owner}/${repo}/contents/${path}`, {
                headers: { 'Authorization': `Bearer ${githubToken}` },
                params: { ref }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get contents:', error);
            throw error;
        }
    },

    /**
     * Create or update file
     */
    createOrUpdateFile: async (owner, repo, path, content, message, options = {}) => {
        try {
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            const data = {
                message,
                content: encodedContent,
                branch: options.branch || 'main'
            };

            if (options.sha) {
                data.sha = options.sha;
            }

            const response = await githubApi.put(`/repos/${owner}/${repo}/contents/${path}`, data, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to create/update file:', error);
            throw error;
        }
    },

    /**
     * Push multiple files
     */
    pushFiles: async (owner, repo, files, message, branch = 'main') => {
        try {
            const response = await api.post(`/repos/${owner}/${repo}/push`, {
                files,
                message,
                branch
            }, {
                headers: { 'X-GitHub-Token': githubToken }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to push files:', error);
            throw error;
        }
    },

    // ============ Repository Insights ============

    /**
     * Get repository stats
     */
    getRepoStats: async (owner, repo) => {
        try {
            const [repoData, languages, contributors] = await Promise.all([
                githubApi.get(`/repos/${owner}/${repo}`, {
                    headers: { 'Authorization': `Bearer ${githubToken}` }
                }),
                githubApi.get(`/repos/${owner}/${repo}/languages`, {
                    headers: { 'Authorization': `Bearer ${githubToken}` }
                }),
                githubApi.get(`/repos/${owner}/${repo}/contributors`, {
                    headers: { 'Authorization': `Bearer ${githubToken}` },
                    params: { per_page: 10 }
                })
            ]);

            return {
                ...repoData.data,
                languages: languages.data,
                contributors: contributors.data
            };
        } catch (error) {
            console.error('Failed to get repo stats:', error);
            throw error;
        }
    },

    /**
     * Get commit activity
     */
    getCommitActivity: async (owner, repo) => {
        try {
            const response = await githubApi.get(`/repos/${owner}/${repo}/stats/commit_activity`, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get commit activity:', error);
            throw error;
        }
    },

    // ============ Quick Actions ============

    /**
     * Star a repository
     */
    starRepo: async (owner, repo) => {
        try {
            await githubApi.put(`/user/starred/${owner}/${repo}`, null, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return true;
        } catch (error) {
            console.error('Failed to star repository:', error);
            throw error;
        }
    },

    /**
     * Unstar a repository
     */
    unstarRepo: async (owner, repo) => {
        try {
            await githubApi.delete(`/user/starred/${owner}/${repo}`, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return true;
        } catch (error) {
            console.error('Failed to unstar repository:', error);
            throw error;
        }
    },

    /**
     * Check if repo is starred
     */
    isStarred: async (owner, repo) => {
        try {
            await githubApi.get(`/user/starred/${owner}/${repo}`, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Watch a repository
     */
    watchRepo: async (owner, repo) => {
        try {
            await githubApi.put(`/repos/${owner}/${repo}/subscription`, {
                subscribed: true
            }, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return true;
        } catch (error) {
            console.error('Failed to watch repository:', error);
            throw error;
        }
    },

    // ============ Trending & Discovery ============

    /**
     * Search repositories
     */
    searchRepositories: async (query, options = {}) => {
        try {
            const params = {
                q: query,
                sort: options.sort || 'stars',
                order: options.order || 'desc',
                per_page: options.perPage || 10,
                page: options.page || 1
            };

            if (options.language) {
                params.q += ` language:${options.language}`;
            }

            const response = await githubApi.get('/search/repositories', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to search repositories:', error);
            throw error;
        }
    },

    /**
     * Get trending repositories
     */
    getTrending: async (language = '', since = 'daily') => {
        try {
            const date = new Date();
            date.setDate(date.getDate() - (since === 'weekly' ? 7 : since === 'monthly' ? 30 : 1));
            const dateStr = date.toISOString().split('T')[0];

            let query = `created:>${dateStr}`;
            if (language) {
                query += ` language:${language}`;
            }

            const response = await githubApi.get('/search/repositories', {
                params: {
                    q: query,
                    sort: 'stars',
                    order: 'desc',
                    per_page: 10
                }
            });
            return response.data.items;
        } catch (error) {
            console.error('Failed to get trending:', error);
            throw error;
        }
    },

    // ============ Gists ============

    /**
     * Create a gist
     */
    createGist: async (files, options = {}) => {
        try {
            const gistFiles = {};
            for (const [filename, content] of Object.entries(files)) {
                gistFiles[filename] = { content };
            }

            const response = await githubApi.post('/gists', {
                description: options.description || 'Created with Roolts',
                public: options.public !== false,
                files: gistFiles
            }, {
                headers: { 'Authorization': `Bearer ${githubToken}` }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to create gist:', error);
            throw error;
        }
    },

    /**
     * List user's gists
     */
    listGists: async (page = 1, perPage = 10) => {
        try {
            const response = await githubApi.get('/gists', {
                headers: { 'Authorization': `Bearer ${githubToken}` },
                params: { page, per_page: perPage }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to list gists:', error);
            throw error;
        }
    },

    // ============ Templates ============

    /**
     * Get popular templates
     */
    getTemplates: async () => {
        const templates = [
            { owner: 'github', repo: 'gitignore', name: '.gitignore Templates' },
            { owner: 'github', repo: 'choosealicense.com', name: 'License Templates' },
            { owner: 'facebook', repo: 'create-react-app', name: 'Create React App' },
            { owner: 'vitejs', repo: 'vite', name: 'Vite Template' }
        ];

        return templates;
    },

    /**
     * Get repository summary using AI (mock for now)
     */
    getRepoSummary: async (owner, repo) => {
        try {
            const repoData = await githubService.getRepoStats(owner, repo);

            // Generate summary based on repo data
            const languageList = Object.keys(repoData.languages || {}).slice(0, 3).join(', ');
            const summary = `${repoData.description || 'No description'}\n\n` +
                `📊 ${repoData.stargazers_count} stars • ${repoData.forks_count} forks\n` +
                `💻 Languages: ${languageList || 'Not specified'}\n` +
                `📅 Last updated: ${new Date(repoData.updated_at).toLocaleDateString()}`;

            return {
                summary,
                stats: {
                    stars: repoData.stargazers_count,
                    forks: repoData.forks_count,
                    watchers: repoData.watchers_count,
                    issues: repoData.open_issues_count
                },
                languages: repoData.languages,
                contributors: repoData.contributors
            };
        } catch (error) {
            console.error('Failed to get repo summary:', error);
            throw error;
        }
    }
};

export default githubService;
