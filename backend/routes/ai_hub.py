"""
Multi-AI Chat Routes
Provides endpoints for the AI Hub with smart model routing
"""

import asyncio
from flask import Blueprint, jsonify, request

from routes.auth import get_current_user, require_auth
from models import User
from services.multi_ai import MultiAIService, AISelector

ai_hub_bp = Blueprint('ai_hub', __name__)


def get_user_ai_service():
    """Get AI service configured with user's API keys."""
    user = get_current_user()
    
    if user:
        user_keys = {
            'gemini': user.gemini_api_key,
            'claude': user.claude_api_key,
            'deepseek': user.deepseek_api_key,
            'qwen': user.qwen_api_key
        }
        # Filter out None values
        user_keys = {k: v for k, v in user_keys.items() if v}
    else:
        user_keys = {}
    
    return MultiAIService(user_keys)


@ai_hub_bp.route('/models', methods=['GET'])
def list_models():
    """List available AI models."""
    service = get_user_ai_service()
    available = service.get_available_models()
    
    models_info = {
        'gemini': {
            'name': 'Google Gemini',
            'icon': '💎',
            'description': 'Best for multimodal content, research, and factual queries',
            'strengths': ['Research', 'Facts', 'Multimodal'],
            'available': 'gemini' in available
        },
        'claude': {
            'name': 'Anthropic Claude',
            'icon': '🎭',
            'description': 'Best for nuanced writing, analysis, and long-form content',
            'strengths': ['Writing', 'Analysis', 'Creativity'],
            'available': 'claude' in available
        },
        'deepseek': {
            'name': 'DeepSeek',
            'icon': '🔍',
            'description': 'Best for coding, debugging, and technical explanations',
            'strengths': ['Code', 'Debugging', 'Algorithms'],
            'available': 'deepseek' in available
        },
        'qwen': {
            'name': 'Alibaba Qwen',
            'icon': '🌐',
            'description': 'Best for multilingual content and Asian languages',
            'strengths': ['Multilingual', 'Chinese', 'Translation'],
            'available': 'qwen' in available
        }
    }
    
    return jsonify({
        'models': models_info,
        'available': available,
        'has_any': len(available) > 0
    })


@ai_hub_bp.route('/chat', methods=['POST'])
def chat():
    """
    Send a message to an AI model.
    
    Request body:
    - prompt: The message to send (required)
    - model: 'auto', 'gemini', 'claude', 'deepseek', or 'qwen' (default: 'auto')
    - system_prompt: Optional system instructions
    """
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    model = data.get('model', 'auto')
    system_prompt = data.get('system_prompt')
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    service = get_user_ai_service()
    
    # Run async function in sync context
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            service.chat(prompt, model, system_prompt)
        )
    finally:
        loop.close()
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result)


@ai_hub_bp.route('/suggest', methods=['POST'])
def suggest():
    """
    Get AI suggestions while typing.
    For real-time suggestions as user composes messages.
    
    Request body:
    - text: Partial text to get suggestions for
    """
    data = request.get_json()
    text = data.get('text', '').strip()
    
    if len(text) < 10:
        return jsonify({'suggestions': []})
    
    service = get_user_ai_service()
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(service.suggest(text))
    finally:
        loop.close()
    
    return jsonify(result)


@ai_hub_bp.route('/analyze-prompt', methods=['POST'])
def analyze_prompt():
    """
    Analyze a prompt to explain which AI would be best.
    Useful for showing users why a particular model was selected.
    
    Request body:
    - prompt: The prompt to analyze
    """
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    service = get_user_ai_service()
    available = service.get_available_models()
    
    selector = AISelector(available)
    analysis = selector.explain_selection(prompt)
    
    # Add human-readable explanations
    reasons = {
        'deepseek': 'This prompt contains coding-related content. DeepSeek excels at programming tasks.',
        'claude': 'This prompt is suited for writing or detailed analysis. Claude is great for nuanced responses.',
        'gemini': 'This prompt is a research or factual query. Gemini is optimized for information retrieval.',
        'qwen': 'This prompt contains multilingual content. Qwen excels at non-English languages.'
    }
    
    analysis['detailed_reason'] = reasons.get(
        analysis['selected_model'],
        'Selected based on overall compatibility.'
    )
    
    return jsonify(analysis)


@ai_hub_bp.route('/stream', methods=['POST'])
def stream_chat():
    """
    Stream a chat response (for real-time display).
    Note: This is a placeholder - full streaming requires SSE or WebSocket.
    """
    # For now, return the same as regular chat
    # Real implementation would use Server-Sent Events
    return chat()
