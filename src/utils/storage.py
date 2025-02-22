import json
import os
from datetime import datetime
from config.config import DATA_DIR, FOLLOWED_USERS_FILE, TWEET_HISTORY_FILE

class Storage:
    def __init__(self):
        # Ensure data directory exists
        os.makedirs(DATA_DIR, exist_ok=True)
        
        # Initialize storage files if they don't exist
        self._init_storage_files()
    
    def _init_storage_files(self):
        """Initialize storage files if they don't exist."""
        if not os.path.exists(FOLLOWED_USERS_FILE):
            self._save_json(FOLLOWED_USERS_FILE, {
                'users': {},
                'daily_stats': {},
                'category_stats': {}
            })
        if not os.path.exists(TWEET_HISTORY_FILE):
            self._save_json(TWEET_HISTORY_FILE, [])
    
    def _load_json(self, file_path):
        """Load data from a JSON file."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return None
        except json.JSONDecodeError:
            print(f"Error decoding JSON from {file_path}")
            return None
    
    def _save_json(self, file_path, data):
        """Save data to a JSON file."""
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            print(f"Error saving to {file_path}: {e}")
            return False
    
    def add_followed_user(self, user_id, user_data):
        """Add a user to the followed users list."""
        data = self._load_json(FOLLOWED_USERS_FILE) or {
            'users': {},
            'daily_stats': {},
            'category_stats': {}
        }
        
        # Add user to users dict
        user_id_str = str(user_id)
        data['users'][user_id_str] = {
            **user_data,
            'followed_at': datetime.now().isoformat(),
            'unfollowed': False,
            'category': user_data.get('query', 'general')
        }
        
        # Update daily stats
        today = datetime.now().date().isoformat()
        if today not in data['daily_stats']:
            data['daily_stats'][today] = {
                'followed': 0,
                'unfollowed': 0
            }
        data['daily_stats'][today]['followed'] += 1
        
        # Update category stats
        category = user_data.get('query', 'general')
        if category not in data['category_stats']:
            data['category_stats'][category] = {
                'total_followed': 0,
                'currently_following': 0,
                'unfollowed': 0
            }
        data['category_stats'][category]['total_followed'] += 1
        data['category_stats'][category]['currently_following'] += 1
        
        return self._save_json(FOLLOWED_USERS_FILE, data)
    
    def mark_user_unfollowed(self, user_id):
        """Mark a user as unfollowed."""
        data = self._load_json(FOLLOWED_USERS_FILE)
        if not data or 'users' not in data:
            return False
        
        user_id_str = str(user_id)
        if user_id_str in data['users']:
            # Update user status
            data['users'][user_id_str]['unfollowed'] = True
            data['users'][user_id_str]['unfollowed_at'] = datetime.now().isoformat()
            
            # Update daily stats
            today = datetime.now().date().isoformat()
            if today not in data['daily_stats']:
                data['daily_stats'][today] = {
                    'followed': 0,
                    'unfollowed': 0
                }
            data['daily_stats'][today]['unfollowed'] += 1
            
            # Update category stats
            category = data['users'][user_id_str].get('category', 'general')
            if category in data['category_stats']:
                data['category_stats'][category]['currently_following'] -= 1
                data['category_stats'][category]['unfollowed'] += 1
            
            return self._save_json(FOLLOWED_USERS_FILE, data)
        return False
    
    def get_followed_users(self, include_unfollowed=False):
        """Get list of followed users."""
        data = self._load_json(FOLLOWED_USERS_FILE)
        if not data or 'users' not in data:
            return {}
        
        if not include_unfollowed:
            return {k: v for k, v in data['users'].items() 
                   if not v.get('unfollowed', False)}
        return data['users']
    
    def get_follow_stats(self):
        """Get comprehensive follow statistics."""
        data = self._load_json(FOLLOWED_USERS_FILE)
        if not data:
            return {
                'total_stats': {
                    'total_followed': 0,
                    'currently_following': 0,
                    'unfollowed': 0
                },
                'daily_stats': {},
                'category_stats': {}
            }
        
        # Calculate total stats
        total_stats = {
            'total_followed': len(data['users']),
            'currently_following': len([u for u in data['users'].values() 
                                     if not u.get('unfollowed', False)]),
            'unfollowed': len([u for u in data['users'].values() 
                             if u.get('unfollowed', False)])
        }
        
        return {
            'total_stats': total_stats,
            'daily_stats': data.get('daily_stats', {}),
            'category_stats': data.get('category_stats', {})
        }
    
    def add_tweet(self, tweet_data):
        """Add a tweet to history."""
        tweets = self._load_json(TWEET_HISTORY_FILE) or []
        tweet_data['created_at'] = datetime.now().isoformat()
        tweets.append(tweet_data)
        return self._save_json(TWEET_HISTORY_FILE, tweets)
    
    def get_tweet_history(self):
        """Get tweet history."""
        return self._load_json(TWEET_HISTORY_FILE) or [] 