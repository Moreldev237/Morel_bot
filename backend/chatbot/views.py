import os
import requests
import json
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.views.decorators.http import require_POST

def index(request):
    """Serve the frontend index.html"""
    frontend_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'index.html')
    return FileResponse(open(frontend_path, 'rb'), content_type='text/html')

def api_root(request):
    """API root endpoint"""
    return JsonResponse({
        'message': 'Welcome to MorelBot API',
        'endpoints': {
            'chat': '/api/chat/',
            'models': '/api/models/'
        }
    })

@csrf_exempt
@require_POST
def chat(request):
    """Endpoint pour gérer les messages du chatbot"""
    try:
        data = json.loads(request.body)
        message = data.get('message', '')
        conversation_history = data.get('history', [])

        if not message:
            return JsonResponse({'error': 'Message vide'}, status=400)

        # Préparer l'historique pour l'API
        messages = []
        
        # Ajouter l'historique de conversation
        for msg in conversation_history[-10:]:  # Limiter à 10 derniers messages
            messages.append({
                "role": "user" if msg.get('sender') == 'user' else "assistant",
                "content": msg.get('content', '')
            })
        
        # Ajouter le nouveau message
        messages.append({
            "role": "user",
            "content": message
        })

        # Appeler l'API OpenRouter
        response = call_openrouter_api(messages)
        
        return JsonResponse({
            'response': response,
            'status': 'success'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Données JSON invalides'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def call_openrouter_api(messages):
    """Appeler l'API OpenRouter"""
    api_key = settings.OPENROUTER_API_KEY
    model = settings.OPENROUTER_MODEL
    
    if not api_key:
        raise ValueError("Clé API OpenRouter non configurée")

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:8000',
        'X-Title': 'MorelBot'
    }

    # Ajouter le message système
    system_message = {
        "role": "system",
        "content": "Tu es MorelBot, l'assistant IA de MOREL. Quand on te demande qui tu es, réponds : 'Je suis MorelBot, l'assistant de MOREL. En quoi puis-je vous aider ?'"
    }
    full_messages = [system_message] + messages

    payload = {
        'model': model,
        'messages': full_messages,
        'temperature': 0.7,
        'max_tokens': 1000,
    }

    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"API Response Status: {response.status_code}")
        print(f"API Response Text: {response.text}")
        
        response.raise_for_status()
        result = response.json()
        
        return result['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        print(f"API Error: {str(e)}")
        raise Exception(f"Erreur API OpenRouter: {str(e)}")
    except (KeyError, IndexError) as e:
        raise Exception(f"Erreur de format de réponse: {str(e)}")

def get_models(request):
    """Récupérer les modèles disponibles"""
    return JsonResponse({
        'current_model': settings.OPENROUTER_MODEL,
        'available_models': [
            'anthropic/claude-3-haiku',
            'openai/gpt-4o',
            'openai/gpt-4',
            'openai/gpt-3.5-turbo',
            'meta-llama/llama-3.1-70b-instruct'
        ]
    })