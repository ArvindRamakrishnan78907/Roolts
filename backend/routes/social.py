"""
Social Media Integration Routes
Handles LinkedIn and Twitter/X posting
"""

import os
from flask import Blueprint, jsonify, request
import requests
from routes.auth import require_auth
from models import SocialToken

social_bp = Blueprint('social', __name__)

# Constants
LINKEDIN_API_URL = 'https://api.linkedin.com/v2'
TWITTER_API_URL = 'https://api.twitter.com/2'

# ============ LinkedIn Routes ============

# auth routes moved to auth.py

@social_bp.route('/linkedin/post', methods=['POST'])
@require_auth
def linkedin_post(user):
    """Create a LinkedIn post."""
    # Get token from DB
    token_entry = SocialToken.query.filter_by(user_id=user.id, platform='linkedin').first()
    
    if not token_entry or not token_entry.is_valid():
        return jsonify({'error': 'LinkedIn not connected or token expired'}), 401
        
    token = token_entry.access_token
    
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return jsonify({'error': 'Post content is required'}), 400
    
    # Get user URN (cached in DB ideally, but for now fetch or use stored)
    user_urn = f"urn:li:person:{token_entry.platform_user_id}"
    
    # If platform_user_id is missing, fetch it
    if not token_entry.platform_user_id:
        profile_response = requests.get(
            f'{LINKEDIN_API_URL}/me',
            headers={'Authorization': f'Bearer {token}'}
        )
        if profile_response.status_code == 200:
            profile = profile_response.json()
            token_entry.platform_user_id = profile.get('id')
            user_urn = f"urn:li:person:{profile.get('id')}"
            # Save to DB? Implicitly handled next commit
        else:
             return jsonify({'error': 'Failed to get LinkedIn profile'}), 400

    # Create post
    post_data = {
        'author': user_urn,
        'lifecycleState': 'PUBLISHED',
        'specificContent': {
            'com.linkedin.ugc.ShareContent': {
                'shareCommentary': {
                    'text': content
                },
                'shareMediaCategory': 'NONE'
            }
        },
        'visibility': {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    }
    
    response = requests.post(
        f'{LINKEDIN_API_URL}/ugcPosts',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        json=post_data
    )
    
    if response.status_code not in [200, 201]:
        return jsonify({
            'error': 'Failed to create LinkedIn post',
            'details': response.text
        }), response.status_code
    
    return jsonify({
        'message': 'LinkedIn post created successfully',
        'post_id': response.headers.get('x-restli-id')
    })


# ============ Twitter Routes ============

# auth routes moved to auth.py

@social_bp.route('/twitter/post', methods=['POST'])
@require_auth
def twitter_post(user):
    """Create a Twitter/X post."""
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return jsonify({'error': 'Tweet content is required'}), 400
    
    if len(content) > 280:
        return jsonify({
            'error': 'Tweet exceeds 280 characters',
            'length': len(content)
        }), 400
    
    # Get token from DB
    token_entry = SocialToken.query.filter_by(user_id=user.id, platform='twitter').first()
    
    if not token_entry or not token_entry.is_valid():
        return jsonify({'error': 'Twitter not connected or token expired'}), 401
        
    access_token = token_entry.access_token

    try:
        import tweepy
        
        # Use Client for OAuth 2.0 (assuming access_token is Bearer token or similar from OAuth2 flow)
        # Note: auth.py implements OAuth 2.0 flow which returns an access_token.
        # Tweepy Client with access_token uses OAuth 2.0 Bearer Token.
        
        client = tweepy.Client(access_token=access_token)
        
        response = client.create_tweet(text=content)
        
        return jsonify({
            'message': 'Tweet posted successfully',
            'tweet_id': response.data['id']
        })
    except ImportError:
        return jsonify({
            'error': 'Tweepy not installed',
            'message': 'Please install tweepy: pip install tweepy'
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'Failed to post tweet',
            'details': str(e)
        }), 500


@social_bp.route('/twitter/user', methods=['GET'])
@require_auth
def twitter_user(user):
    """Get authenticated Twitter user info."""
    token_entry = SocialToken.query.filter_by(user_id=user.id, platform='twitter').first()
    
    if not token_entry:
        return jsonify({'error': 'Twitter not connected'}), 400
        
    return jsonify({
        'user': {
            'id': token_entry.platform_user_id,
            'username': token_entry.platform_username
        }
    })


# ============ Helper Routes ============

@social_bp.route('/generate-summary', methods=['POST'])
def generate_social_summary():
    """Generate a social media-friendly summary of code/project."""
    data = request.get_json()
    code = data.get('code', '')
    project_name = data.get('project_name', 'My Project')
    platform = data.get('platform', 'linkedin')  # linkedin or twitter
    
    # For now, return a template. In production, use AI to generate.
    if platform == 'twitter':
        summary = f"🚀 Just built {project_name}!\n\n"
        summary += "Check out my latest code on GitHub 👇\n"
        summary += "#coding #developer #opensource"
    else:
        summary = f"🎉 Excited to share my latest project: {project_name}!\n\n"
        summary += "I've been working on this for a while and I'm thrilled with the results.\n\n"
        summary += "Key highlights:\n"
        summary += "• Clean, maintainable code\n"
        summary += "• Built with modern best practices\n"
        summary += "• Open source on GitHub\n\n"
        summary += "Would love to hear your thoughts! #coding #developer #opensource"
    
    return jsonify({
        'summary': summary,
        'platform': platform,
        'character_count': len(summary)
    })
