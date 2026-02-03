"""
Multi-AI Service with Smart Router
Integrates Gemini, Claude, DeepSeek, and Qwen with intelligent model selection
"""

import os
import re
import json
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import requests


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = None) -> Dict[str, Any]:
        """Generate a response from the AI model."""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider is properly configured."""
        pass


class GeminiProvider(AIProvider):
    """Google Gemini AI Provider."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta'
        self.model = 'gemini-1.5-flash'
    
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def generate(self, prompt: str, system_prompt: str = None) -> Dict[str, Any]:
        if not self.is_configured():
            return {'error': 'Gemini API key not configured'}
        
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        
        contents = []
        if system_prompt:
            contents.append({
                'role': 'user',
                'parts': [{'text': f"System: {system_prompt}"}]
            })
        contents.append({
            'role': 'user',
            'parts': [{'text': prompt}]
        })
        
        try:
            response = requests.post(url, json={'contents': contents})
            data = response.json()
            
            if 'candidates' in data and data['candidates']:
                text = data['candidates'][0]['content']['parts'][0]['text']
                return {
                    'response': text,
                    'model': 'gemini',
                    'provider': 'Google Gemini'
                }
            
            return {'error': data.get('error', {}).get('message', 'Unknown error')}
        except Exception as e:
            return {'error': str(e)}


class ClaudeProvider(AIProvider):
    """Anthropic Claude AI Provider."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('CLAUDE_API_KEY', '')
        self.base_url = 'https://api.anthropic.com/v1'
        self.model = 'claude-3-haiku-20240307'
    
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def generate(self, prompt: str, system_prompt: str = None) -> Dict[str, Any]:
        if not self.is_configured():
            return {'error': 'Claude API key not configured'}
        
        headers = {
            'x-api-key': self.api_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        }
        
        data = {
            'model': self.model,
            'max_tokens': 4096,
            'messages': [{'role': 'user', 'content': prompt}]
        }
        
        if system_prompt:
            data['system'] = system_prompt
        
        try:
            response = requests.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=data
            )
            result = response.json()
            
            if 'content' in result and result['content']:
                text = result['content'][0]['text']
                return {
                    'response': text,
                    'model': 'claude',
                    'provider': 'Anthropic Claude'
                }
            
            return {'error': result.get('error', {}).get('message', 'Unknown error')}
        except Exception as e:
            return {'error': str(e)}


class DeepSeekProvider(AIProvider):
    """DeepSeek AI Provider - Optimized for coding."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY', '')
        self.base_url = 'https://api.deepseek.com/v1'
        self.model = 'deepseek-coder'
    
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def generate(self, prompt: str, system_prompt: str = None) -> Dict[str, Any]:
        if not self.is_configured():
            return {'error': 'DeepSeek API key not configured'}
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})
        
        data = {
            'model': self.model,
            'messages': messages,
            'max_tokens': 4096
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data
            )
            result = response.json()
            
            if 'choices' in result and result['choices']:
                text = result['choices'][0]['message']['content']
                return {
                    'response': text,
                    'model': 'deepseek',
                    'provider': 'DeepSeek'
                }
            
            return {'error': result.get('error', {}).get('message', 'Unknown error')}
        except Exception as e:
            return {'error': str(e)}


class QwenProvider(AIProvider):
    """Alibaba Qwen AI Provider - Excellent multilingual support."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('QWEN_API_KEY', '')
        self.base_url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
        self.model = 'qwen-turbo'
    
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    async def generate(self, prompt: str, system_prompt: str = None) -> Dict[str, Any]:
        if not self.is_configured():
            return {'error': 'Qwen API key not configured'}
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})
        
        data = {
            'model': self.model,
            'input': {
                'messages': messages
            }
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=data
            )
            result = response.json()
            
            if 'output' in result:
                text = result['output'].get('text', '')
                return {
                    'response': text,
                    'model': 'qwen',
                    'provider': 'Alibaba Qwen'
                }
            
            return {'error': result.get('message', 'Unknown error')}
        except Exception as e:
            return {'error': str(e)}


class AISelector:
    """
    Intelligent AI Model Selection Algorithm
    
    Selects the best AI model based on prompt characteristics:
    - DeepSeek: Best for coding, debugging, algorithms
    - Claude: Best for writing, analysis, nuanced responses
    - Gemini: Best for factual queries, multimodal, research
    - Qwen: Best for multilingual, Chinese content
    """
    
    # Keywords and patterns for each model's strengths
    CODE_KEYWORDS = [
        'code', 'function', 'debug', 'algorithm', 'python', 'java', 'javascript',
        'typescript', 'programming', 'compiler', 'syntax', 'error', 'bug', 'api',
        'class', 'method', 'variable', 'loop', 'array', 'list', 'dictionary',
        'database', 'sql', 'query', 'git', 'docker', 'kubernetes', 'aws',
        'react', 'vue', 'angular', 'node', 'flask', 'django', 'spring'
    ]
    
    WRITING_KEYWORDS = [
        'write', 'essay', 'story', 'blog', 'article', 'creative', 'poem',
        'narrative', 'content', 'copywriting', 'draft', 'rewrite', 'summarize',
        'explain', 'describe', 'elaborate', 'persuade', 'argue', 'analyze',
        'review', 'critique', 'edit', 'proofread', 'tone', 'style'
    ]
    
    RESEARCH_KEYWORDS = [
        'what is', 'how does', 'explain', 'define', 'compare', 'difference',
        'facts', 'history', 'science', 'research', 'data', 'statistics',
        'study', 'analysis', 'report', 'information', 'learn', 'understand',
        'search', 'find', 'look up', 'reference', 'source', 'cite'
    ]
    
    MULTILINGUAL_PATTERNS = [
        # Chinese characters
        r'[\u4e00-\u9fff]',
        # Japanese
        r'[\u3040-\u309f\u30a0-\u30ff]',
        # Korean
        r'[\uac00-\ud7af]',
        # Arabic
        r'[\u0600-\u06ff]',
        # Hindi/Devanagari
        r'[\u0900-\u097f]'
    ]
    
    def __init__(self, available_models: list = None):
        """
        Initialize with available models.
        
        Args:
            available_models: List of model names that are configured.
                            If None, assumes all are available.
        """
        self.available = available_models or ['gemini', 'claude', 'deepseek', 'qwen']
    
    def _count_keyword_matches(self, text: str, keywords: list) -> int:
        """Count how many keywords appear in the text."""
        text_lower = text.lower()
        return sum(1 for kw in keywords if kw in text_lower)
    
    def _has_non_latin(self, text: str) -> bool:
        """Check if text contains non-Latin scripts."""
        for pattern in self.MULTILINGUAL_PATTERNS:
            if re.search(pattern, text):
                return True
        return False
    
    def _calculate_scores(self, prompt: str) -> Dict[str, float]:
        """Calculate suitability scores for each model."""
        scores = {
            'deepseek': 0.0,
            'claude': 0.0,
            'gemini': 0.0,
            'qwen': 0.0
        }
        
        prompt_lower = prompt.lower()
        prompt_length = len(prompt)
        
        # === DeepSeek: Coding tasks ===
        code_matches = self._count_keyword_matches(prompt, self.CODE_KEYWORDS)
        if code_matches > 0:
            scores['deepseek'] += code_matches * 2.0
        
        # Check for code blocks
        if '```' in prompt or 'def ' in prompt or 'function ' in prompt:
            scores['deepseek'] += 5.0
        
        # === Claude: Writing and nuanced analysis ===
        writing_matches = self._count_keyword_matches(prompt, self.WRITING_KEYWORDS)
        if writing_matches > 0:
            scores['claude'] += writing_matches * 2.0
        
        # Long-form content preference
        if prompt_length > 500:
            scores['claude'] += 2.0
        
        # === Gemini: Research and factual queries ===
        research_matches = self._count_keyword_matches(prompt, self.RESEARCH_KEYWORDS)
        if research_matches > 0:
            scores['gemini'] += research_matches * 1.5
        
        # Question patterns
        if prompt_lower.startswith(('what', 'how', 'why', 'when', 'where', 'who')):
            scores['gemini'] += 2.0
        
        # === Qwen: Multilingual content ===
        if self._has_non_latin(prompt):
            scores['qwen'] += 10.0  # Strong preference for non-Latin text
        
        # Base scores (so no model gets 0)
        for model in scores:
            scores[model] += 1.0
        
        # Filter to only available models
        return {k: v for k, v in scores.items() if k in self.available}
    
    def select_best_model(self, prompt: str) -> str:
        """
        Select the best AI model for the given prompt.
        
        Args:
            prompt: The user's prompt
            
        Returns:
            The name of the best model ('gemini', 'claude', 'deepseek', or 'qwen')
        """
        if not self.available:
            raise ValueError("No AI models available")
        
        scores = self._calculate_scores(prompt)
        
        if not scores:
            return self.available[0]
        
        return max(scores, key=scores.get)
    
    def explain_selection(self, prompt: str) -> Dict[str, Any]:
        """
        Explain why a particular model was selected.
        
        Args:
            prompt: The user's prompt
            
        Returns:
            Dict with selected model and explanation
        """
        scores = self._calculate_scores(prompt)
        selected = max(scores, key=scores.get) if scores else self.available[0]
        
        explanations = {
            'deepseek': 'Best for coding and technical tasks',
            'claude': 'Best for writing and nuanced analysis',
            'gemini': 'Best for research and factual queries',
            'qwen': 'Best for multilingual content'
        }
        
        return {
            'selected_model': selected,
            'reason': explanations.get(selected, 'Default selection'),
            'scores': scores
        }


class MultiAIService:
    """
    Unified service for interacting with multiple AI providers.
    Supports automatic model selection or manual override.
    """
    
    def __init__(self, user_api_keys: Dict[str, str] = None):
        """
        Initialize the Multi-AI service.
        
        Args:
            user_api_keys: Optional dict of user-specific API keys
                          {'gemini': 'key', 'claude': 'key', ...}
        """
        user_api_keys = user_api_keys or {}
        
        self.providers = {
            'gemini': GeminiProvider(user_api_keys.get('gemini')),
            'claude': ClaudeProvider(user_api_keys.get('claude')),
            'deepseek': DeepSeekProvider(user_api_keys.get('deepseek')),
            'qwen': QwenProvider(user_api_keys.get('qwen'))
        }
        
        # Determine which models are available
        available = [name for name, provider in self.providers.items() 
                    if provider.is_configured()]
        
        self.selector = AISelector(available)
    
    def get_available_models(self) -> list:
        """Get list of configured AI models."""
        return [name for name, provider in self.providers.items() 
                if provider.is_configured()]
    
    async def chat(
        self, 
        prompt: str, 
        model: str = 'auto',
        system_prompt: str = None
    ) -> Dict[str, Any]:
        """
        Send a prompt to an AI model.
        
        Args:
            prompt: The user's prompt
            model: Model to use ('auto', 'gemini', 'claude', 'deepseek', 'qwen')
            system_prompt: Optional system instructions
            
        Returns:
            Dict with response, model used, and any errors
        """
        if not prompt:
            return {'error': 'Prompt is required'}
        
        # Auto-select model if not specified
        if model == 'auto':
            selection = self.selector.explain_selection(prompt)
            model = selection['selected_model']
            auto_selected = True
        else:
            auto_selected = False
            selection = None
        
        # Validate model
        if model not in self.providers:
            return {'error': f'Unknown model: {model}'}
        
        provider = self.providers[model]
        
        if not provider.is_configured():
            # Fallback to any available model
            available = self.get_available_models()
            if not available:
                return {'error': 'No AI models configured. Please add API keys.'}
            
            model = available[0]
            provider = self.providers[model]
        
        # Generate response
        result = await provider.generate(prompt, system_prompt)
        
        # Add metadata
        if 'error' not in result:
            result['auto_selected'] = auto_selected
            if selection:
                result['selection_reason'] = selection['reason']
                result['all_scores'] = selection['scores']
        
        return result
    
    async def suggest(self, partial_text: str) -> Dict[str, Any]:
        """
        Get AI suggestions while user is typing.
        
        Args:
            partial_text: The text user has typed so far
            
        Returns:
            Suggestions for completing the text
        """
        if len(partial_text) < 10:
            return {'suggestions': []}
        
        # Use the fastest available model for suggestions
        available = self.get_available_models()
        if not available:
            return {'suggestions': [], 'error': 'No AI models configured'}
        
        # Prefer Gemini for speed, then others
        model = 'gemini' if 'gemini' in available else available[0]
        provider = self.providers[model]
        
        system_prompt = (
            "You are a helpful assistant providing quick suggestions. "
            "Based on the partial text, provide 3 brief completions or improvements. "
            "Return only a JSON array of 3 strings, no explanation."
        )
        
        prompt = f"Suggest completions for: \"{partial_text}\""
        
        result = await provider.generate(prompt, system_prompt)
        
        if 'error' in result:
            return {'suggestions': [], 'error': result['error']}
        
        # Parse suggestions from response
        try:
            text = result['response']
            # Try to extract JSON array
            match = re.search(r'\[.*?\]', text, re.DOTALL)
            if match:
                suggestions = json.loads(match.group())
            else:
                suggestions = [text.strip()]
        except:
            suggestions = [result['response'].strip()]
        
        return {
            'suggestions': suggestions[:3],
            'model': model
        }
