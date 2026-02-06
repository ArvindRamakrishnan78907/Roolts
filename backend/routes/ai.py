import os
import re
from flask import Blueprint, jsonify, request
from services.multi_ai import MultiAIService
from routes.auth import get_current_user

ai_bp = Blueprint('ai', __name__)

def get_ai_service():
    """Get AI service configured with user's API keys."""
    user = get_current_user()
    user_keys = {}
    if user:
        user_keys = {
            'gemini': user.gemini_api_key,
            'claude': user.claude_api_key,
            'deepseek': user.deepseek_api_key,
            'qwen': user.qwen_api_key
        }
        # Filter out None values
        user_keys = {k: v for k, v in user_keys.items() if v}
    
    return MultiAIService(user_keys)


def detect_language(code):
    """Detect programming language from code patterns."""
    patterns = {
        'python': [r'\bdef\s+\w+\s*\(', r'\bimport\s+\w+', r'print\s*\(', r':\s*$'],
        'javascript': [r'\bfunction\s+\w+\s*\(', r'\bconst\s+\w+\s*=', r'\blet\s+\w+\s*=', r'=>'],
        'java': [r'\bpublic\s+class\s+', r'\bpublic\s+static\s+void\s+main', r'System\.out\.print'],
        'html': [r'<html', r'<div', r'<body', r'<!DOCTYPE'],
        'css': [r'\{[^}]*:\s*[^}]+\}', r'@media', r'\.[\w-]+\s*\{'],
    }
    
    for lang, lang_patterns in patterns.items():
        for pattern in lang_patterns:
            if re.search(pattern, code, re.MULTILINE):
                return lang
    
    return 'plaintext'


def generate_mock_explanation(code, language):
    """Generate a mock code explanation (replace with actual AI in production)."""
    lines = code.strip().split('\n')
    num_lines = len(lines)
    
    explanation = f"""## Code Analysis

**Language Detected:** {language.capitalize()}
**Lines of Code:** {num_lines}

### Overview
This code appears to be a {language} program. Here's a breakdown of what it does:

### Key Components

"""
    
    if language == 'python':
        # Find functions
        functions = re.findall(r'def\s+(\w+)\s*\([^)]*\)', code)
        if functions:
            explanation += "**Functions defined:**\n"
            for func in functions:
                explanation += f"- `{func}()` - A function that performs specific operations\n"
            explanation += "\n"
        
        # Find imports
        imports = re.findall(r'import\s+(\w+)', code)
        if imports:
            explanation += "**Libraries imported:**\n"
            for imp in imports:
                explanation += f"- `{imp}` - External library\n"
    
    elif language == 'javascript':
        functions = re.findall(r'function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)', code)
        if functions:
            explanation += "**Functions/Constants defined:**\n"
            for match in functions:
                name = match[0] or match[1]
                if name:
                    explanation += f"- `{name}` - JavaScript function or constant\n"
    
    explanation += """
### Suggestions
- Consider adding comments to explain complex logic
- Ensure proper error handling is in place
- Follow naming conventions for better readability

### Learning Resources
Check the Resources tab for relevant documentation and tutorials.
"""
    
    return explanation


def generate_mock_diagram(code, language):
    """Generate a mock Mermaid diagram (replace with actual AI in production)."""
    diagram = """graph TD
    A[Start] --> B{Input}
    B --> C[Process Data]
    C --> D{Validate}
    D -->|Valid| E[Output Result]
    D -->|Invalid| F[Handle Error]
    E --> G[End]
    F --> B
"""
    
    # Try to generate a more specific diagram based on code
    if language == 'python':
        functions = re.findall(r'def\s+(\w+)\s*\([^)]*\)', code)
        if functions:
            diagram = "graph TD\n"
            diagram += "    Start([Start]) --> Main\n"
            for i, func in enumerate(functions):
                next_node = functions[i + 1] if i < len(functions) - 1 else "End"
                if i == 0:
                    diagram += f"    Main --> {func}[{func}()]\n"
                diagram += f"    {func} --> {next_node}\n" if i < len(functions) - 1 else f"    {func} --> End([End])\n"
    
    return diagram


def generate_mock_resources(language):
    """Generate mock learning resources (replace with actual AI in production)."""
    resources = {
        'python': [
            {
                'title': 'Python Official Documentation',
                'url': 'https://docs.python.org/3/',
                'description': 'Official Python language documentation and tutorial'
            },
            {
                'title': 'Real Python Tutorials',
                'url': 'https://realpython.com/',
                'description': 'In-depth Python tutorials and guides'
            },
            {
                'title': 'Python Design Patterns',
                'url': 'https://refactoring.guru/design-patterns/python',
                'description': 'Common design patterns implemented in Python'
            }
        ],
        'javascript': [
            {
                'title': 'MDN Web Docs - JavaScript',
                'url': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
                'description': 'Comprehensive JavaScript documentation'
            },
            {
                'title': 'JavaScript.info',
                'url': 'https://javascript.info/',
                'description': 'Modern JavaScript tutorial from basics to advanced'
            },
            {
                'title': 'ES6 Features',
                'url': 'https://es6-features.org/',
                'description': 'Overview of ECMAScript 6 features'
            }
        ],
        'java': [
            {
                'title': 'Oracle Java Documentation',
                'url': 'https://docs.oracle.com/en/java/',
                'description': 'Official Java SE documentation'
            },
            {
                'title': 'Baeldung',
                'url': 'https://www.baeldung.com/',
                'description': 'Java and Spring tutorials'
            }
        ]
    }
    
    return resources.get(language, [
        {
            'title': 'Stack Overflow',
            'url': 'https://stackoverflow.com/',
            'description': 'Community Q&A for programmers'
        },
        {
            'title': 'GitHub',
            'url': 'https://github.com/',
            'description': 'Explore open source projects'
        }
    ])


@ai_bp.route('/explain', methods=['POST'])
def explain_code():
    """Generate an AI-powered explanation of code."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', '')
    
    if not code:
        return jsonify({'error': 'Code is required'}), 400
    
    # Detect language if not provided
    if not language:
        language = detect_language(code)
    
    service = get_ai_service()
    system_prompt = "You are a helpful coding assistant. Explain the following code in a clear, educational way. Use markdown formatting."
    prompt = f"Please explain this {language} code:\n\n```{language}\n{code}\n```"
    
    result = service.chat(prompt, model='auto', system_prompt=system_prompt)
    
    if 'error' in result:
        explanation = generate_mock_explanation(code, language)
        # Add a note that it's a mock due to error
        explanation = f"> [!WARNING]\n> AI Analysis failed ({result['error']}). Showing mock analysis instead.\n\n" + explanation
    else:
        explanation = result.get('response', '')
    
    return jsonify({
        'explanation': explanation,
        'language': language,
        'provider': result.get('provider', 'Mock'),
        'model': result.get('model', 'Mock')
    })


@ai_bp.route('/diagram', methods=['POST'])
def generate_diagram():
    """Generate a visual diagram from code."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', '')
    diagram_type = data.get('type', 'flowchart')  # flowchart, sequence, class
    
    if not code:
        return jsonify({'error': 'Code is required'}), 400
    
    if not language:
        language = detect_language(code)
    
    service = get_ai_service()
    system_prompt = "You are a code visualization expert. Generate Mermaid.js diagram code based on the provided code. Return ONLY the Mermaid diagram code, no markdown code blocks."
    prompt = f"Create a {diagram_type} diagram for this {language} code:\n\n{code}"
    
    result = service.chat(prompt, model='deepseek', system_prompt=system_prompt)
    
    if 'error' in result:
        diagram = generate_mock_diagram(code, language)
    else:
        diagram = result.get('response', '').strip()
        # Clean up in case AI included code blocks
        if diagram.startswith('```'):
            diagram = re.sub(r'^```(mermaid)?\n|```$', '', diagram, flags=re.MULTILINE).strip()
    
    return jsonify({
        'diagram': diagram,
        'type': diagram_type,
        'language': language,
        'provider': result.get('provider', 'Mock')
    })


@ai_bp.route('/resources', methods=['POST'])
def suggest_resources():
    """Suggest learning resources based on code."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', '')
    
    if not language:
        language = detect_language(code)
    
    resources = generate_mock_resources(language)
    
    return jsonify({
        'resources': resources,
        'language': language
    })


@ai_bp.route('/analyze', methods=['POST'])
def analyze_code():
    """Comprehensive code analysis - explanation, diagram, and resources."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', '')
    
    if not code:
        return jsonify({'error': 'Code is required'}), 400
    
    if not language:
        language = detect_language(code)
    
    service = get_ai_service()
    
    from concurrent.futures import ThreadPoolExecutor
    
    def get_explanation():
        return service.chat(
            f"Analyze this {language} code and explain it:\n\n{code}",
            system_prompt="Analyze the code for a developer portfolio. Provide a professional explanation."
        )
    
    def get_diagram():
        return service.chat(
            f"Generate a Mermaid flowchart for this {language} code:\n\n{code}",
            model='deepseek',
            system_prompt="Return ONLY the Mermaid.js graph code. No markdown."
        )

    # Use ThreadPoolExecutor for parallelism
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_expl = executor.submit(get_explanation)
        future_diag = executor.submit(get_diagram)
        
        expl_result = future_expl.result()
        diag_result = future_diag.result()
    
    # 1. Explanation processing
    if 'error' in expl_result:
        explanation = generate_mock_explanation(code, language)
        explanation = f"> [!WARNING]\n> AI Explanation failed ({expl_result['error']}). Showing mock analysis.\n\n" + explanation
    else:
        explanation = expl_result.get('response', '')
    
    # 2. Diagram processing
    if 'error' in diag_result:
        diagram = generate_mock_diagram(code, language)
    else:
        diagram = diag_result.get('response', '')
        if diagram.startswith('```'):
            diagram = re.sub(r'^```(mermaid)?\n|```$', '', diagram, flags=re.MULTILINE).strip()
    
    # 3. Resources (Mocking for now as it's just links)
    resources = generate_mock_resources(language)
    
    return jsonify({
        'explanation': explanation,
        'diagram': diagram,
        'resources': resources,
        'language': language,
        'provider': expl_result.get('provider', 'Mock') if 'error' not in expl_result else 'Mock'
    })


@ai_bp.route('/commit-message', methods=['POST'])
def suggest_commit_message():
    """Generate a smart commit message based on code changes."""
    data = request.get_json()
    files_changed = data.get('files', [])
    diff = data.get('diff', '')
    
    if not files_changed and not diff:
        return jsonify({'error': 'Files or diff required'}), 400
    
    # Mock commit message generation
    if files_changed:
        file_names = [f.get('name', 'unknown') for f in files_changed]
        primary_file = file_names[0] if file_names else 'files'
        
        suggestions = [
            f"feat: update {primary_file}",
            f"fix: improve {primary_file} implementation",
            f"refactor: clean up {primary_file}",
            f"docs: update {primary_file}",
            f"chore: maintain {primary_file}"
        ]
    else:
        suggestions = [
            "feat: add new feature",
            "fix: resolve issue",
            "refactor: improve code structure",
            "docs: update documentation",
            "chore: miscellaneous updates"
        ]
    
    return jsonify({
        'suggestions': suggestions,
        'recommended': suggestions[0]
    })


@ai_bp.route('/review', methods=['POST'])
def review_code():
    """Analyze code for bugs, security issues, and style improvements."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'plaintext')

    if not code:
        return jsonify({'error': 'Code is required'}), 400
    
    # Initialize Multi-AI Service
    service = MultiAIService()
    
    # Strict System Prompt for JSON Output
    system_prompt = (
        "You are a strict automated code review agent. Your job is to analyze the provided code "
        "for bugs, security vulnerabilities, and code style issues. "
        "You MUST return the result EXACTLY as a valid JSON object with the following structure: "
        "{ 'issues': [ { 'type': 'error'|'warning'|'info', 'line': <number_or_null>, "
        "'message': '<concise_description>', 'fix': '<suggested_fix_code_or_explanation>' } ] }. "
        "Do not include any markdown formatting (like ```json), commentary, or extra text outside the JSON. "
        "If the code is perfect, return { 'issues': [] }."
    )
    
    prompt = f"Review this {language} code:\n\n{code}"
    
    try:
        # Prefer 'deepseek' or 'claude' for reasoning, fall back to 'auto'
        # Since we don't have explicit model selection in the request, we rely on the service's smart router
        # But we can hint via the system prompt context. 
        # For now, we will use 'auto' which should pick a strong model for coding.
        result = service.chat(prompt, model='deepseek', system_prompt=system_prompt)
        
        # The service returns a dict, we need to extract the content and parse it as JSON
        # The MultiAIService.chat returns: { 'content': ..., 'provider': ..., 'model': ... }
        content = result.get('content', '')
        
        # Clean up potential markdown formatting if the AI ignores strict instructions
        content = content.strip()
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        
        import json
        try:
            review_data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback if AI fails to generate valid JSON
            review_data = {
                'issues': [
                    {
                        'type': 'warning',
                        'line': None,
                        'message': 'AI failed to generate structured review. Raw output attached.',
                        'fix': content
                    }
                ]
            }
            
        return jsonify({
            'review': review_data,
            'provider': result.get('provider'),
            'model': result.get('model')
        })

    except Exception as e:
        print(f"Code review failed: {str(e)}")
        return jsonify({'error': str(e)}), 500
@ai_bp.route('/chat', methods=['POST'])
def chat_with_ai():
    """Handle interactive chat about code."""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', '')
    query = data.get('query', '')
    history = data.get('history', []) # List of {role: 'user'|'assistant', content: '...'}
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    if not language and code:
        language = detect_language(code)
    
    service = get_ai_service()
    
    # Construct context-aware system prompt
    system_prompt = (
        "You are an expert full-stack developer and technical mentor. "
        "Your goal is to help the user understand, debug, and optimize their code. "
        "Provide specific, technical, and actionable advice. "
        "Always use markdown for code snippets. "
        "If the user asks for changes, explain why they are beneficial."
    )
    
    if code:
        system_prompt += f"\n\nContext Code ({language}):\n```{language}\n{code}\n```"
    
    # Format history for the prompt
    history_context = ""
    for msg in history[-5:]: # Keep last 5 messages for context
        role = "User" if msg.get('role') == 'user' else "AI"
        history_context += f"{role}: {msg.get('content')}\n"
    
    full_prompt = f"{history_context}User: {query}\nAI:"
    
    result = service.chat(full_prompt, model='deepseek', system_prompt=system_prompt)
    
    if 'error' in result:
        return jsonify({'error': result['error']}), 500
        
    return jsonify({
        'response': result.get('response', ''),
        'provider': result.get('provider'),
        'model': result.get('model')
    })
