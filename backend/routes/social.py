"""
Social Media Integration Routes
Handles LinkedIn and Twitter/X posting
"""

import os
from flask import Blueprint, jsonify, request
import requests

social_bp = Blueprint('social', __name__)

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID = os.getenv('LINKEDIN_CLIENT_ID', '')
LINKEDIN_CLIENT_SECRET = os.getenv('LINKEDIN_CLIENT_SECRET', '')
LINKEDIN_OAUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
LINKEDIN_API_URL = 'https://api.linkedin.com/v2'

# Twitter OAuth Configuration
TWITTER_API_KEY = os.getenv('TWITTER_API_KEY', '')
TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET', '')
TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN', '')
TWITTER_ACCESS_TOKEN_SECRET = os.getenv('TWITTER_ACCESS_TOKEN_SECRET', '')
TWITTER_API_URL = 'https://api.twitter.com/2'


# ============ LinkedIn Routes ============

@social_bp.route('/linkedin/auth', methods=['GET'])
def linkedin_auth():
    """Initiate LinkedIn OAuth flow."""
    if not LINKEDIN_CLIENT_ID:
        return jsonify({
            'error': 'LinkedIn OAuth not configured',
            'message': 'Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET'
        }), 400
    
    callback_url = request.args.get('callback', 'http://localhost:3000/callback/linkedin')
    scope = 'r_liteprofile w_member_social'
    
    auth_url = (
        f'{LINKEDIN_OAUTH_URL}?'
        f'response_type=code&'
        f'client_id={LINKEDIN_CLIENT_ID}&'
        f'redirect_uri={callback_url}&'
        f'scope={scope}'
    )
    
    return jsonify({
        'auth_url': auth_url,
        'message': 'Redirect user to auth_url to complete authentication'
    })


@social_bp.route('/linkedin/callback', methods=['POST'])
def linkedin_callback():
    """Handle LinkedIn OAuth callback."""
    data = request.get_json()
    code = data.get('code')
    redirect_uri = data.get('redirect_uri', 'http://localhost:3000/callback/linkedin')
    
    if not code:
        return jsonify({'error': 'Authorization code is required'}), 400
    
    # Exchange code for access token
    response = requests.post(
        LINKEDIN_TOKEN_URL,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': LINKEDIN_CLIENT_ID,
            'client_secret': LINKEDIN_CLIENT_SECRET
        }
    )
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to exchange code for token'}), 400
    
    token_data = response.json()
    access_token = token_data.get('access_token')
    
    # Get user profile
    profile_response = requests.get(
        f'{LINKEDIN_API_URL}/me',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    profile = profile_response.json()
    
    return jsonify({
        'message': 'LinkedIn authentication successful',
        'access_token': access_token,
        'user': {
            'id': profile.get('id'),
            'first_name': profile.get('localizedFirstName'),
            'last_name': profile.get('localizedLastName')
        }
    })


@social_bp.route('/linkedin/post', methods=['POST'])
def linkedin_post():
    """Create a LinkedIn post."""
    token = request.headers.get('X-LinkedIn-Token')
    
    if not token:
        return jsonify({'error': 'LinkedIn token required'}), 401
    
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return jsonify({'error': 'Post content is required'}), 400
    
    # Get user URN
    profile_response = requests.get(
        f'{LINKEDIN_API_URL}/me',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    if profile_response.status_code != 200:
        return jsonify({'error': 'Failed to get LinkedIn profile'}), 400
    
    profile = profile_response.json()
    user_urn = f"urn:li:person:{profile.get('id')}"
    
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

@social_bp.route('/twitter/auth', methods=['GET'])
def twitter_auth():
    """Get Twitter OAuth status/info."""
    if not TWITTER_API_KEY:
        return jsonify({
            'error': 'Twitter OAuth not configured',
            'message': 'Please set TWITTER_API_KEY and related credentials'
        }), 400
    
    # Twitter OAuth 2.0 with PKCE would go here
    # For simplicity, we'll use stored credentials approach
    return jsonify({
        'message': 'Twitter API configured',
        'note': 'Using application credentials for posting'
    })


@social_bp.route('/twitter/post', methods=['POST'])
def twitter_post():
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
    
    if not TWITTER_API_KEY:
        return jsonify({
            'error': 'Twitter API not configured',
            'message': 'Please set TWITTER_API_KEY and related credentials'
        }), 400
    
    # Using OAuth 1.0a for posting
    try:
        import tweepy
        
        auth = tweepy.OAuthHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
        auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)
        
        api = tweepy.API(auth)
        client = tweepy.Client(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET
        )
        
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
def twitter_user():
    """Get authenticated Twitter user info."""
    if not TWITTER_API_KEY:
        return jsonify({'error': 'Twitter API not configured'}), 400
    
    try:
        import tweepy
        
        client = tweepy.Client(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET
        )
        
        user = client.get_me(user_fields=['profile_image_url', 'description'])
        
        return jsonify({
            'user': {
                'id': user.data.id,
                'username': user.data.username,
                'name': user.data.name
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
