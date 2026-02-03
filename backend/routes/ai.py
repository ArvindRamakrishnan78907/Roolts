"""
AI Learning Features Routes
Handles code explanation, diagram generation, and resource suggestions
"""

import os
import re
from flask import Blueprint, jsonify, request

ai_bp = Blueprint('ai', __name__)

# OpenAI Configuration (for Kiro/AI features)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')


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
    
    # In production, use OpenAI/Bedrock API
    if OPENAI_API_KEY:
        try:
            import openai
            
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful coding assistant. Explain the following code in a clear, educational way. Use markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": f"Please explain this {language} code:\n\n```{language}\n{code}\n```"
                    }
                ],
                max_tokens=1000
            )
            
            explanation = response.choices[0].message.content
            
        except Exception as e:
            # Fall back to mock explanation
            explanation = generate_mock_explanation(code, language)
    else:
        explanation = generate_mock_explanation(code, language)
    
    return jsonify({
        'explanation': explanation,
        'language': language
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
    
    # In production, use AI to generate diagram
    if OPENAI_API_KEY:
        try:
            import openai
            
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a code visualization expert. Generate Mermaid.js diagram code based on the provided code. Return ONLY the Mermaid diagram code, no markdown code blocks."
                    },
                    {
                        "role": "user",
                        "content": f"Create a {diagram_type} diagram for this {language} code:\n\n{code}"
                    }
                ],
                max_tokens=500
            )
            
            diagram = response.choices[0].message.content.strip()
            
        except Exception as e:
            diagram = generate_mock_diagram(code, language)
    else:
        diagram = generate_mock_diagram(code, language)
    
    return jsonify({
        'diagram': diagram,
        'type': diagram_type,
        'language': language
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
    
    # Generate all components
    explanation = generate_mock_explanation(code, language)
    diagram = generate_mock_diagram(code, language)
    resources = generate_mock_resources(language)
    
    return jsonify({
        'explanation': explanation,
        'diagram': diagram,
        'resources': resources,
        'language': language
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
