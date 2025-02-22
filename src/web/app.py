from flask import Flask, render_template, jsonify, request
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.utils.storage import Storage
from src.core.bot import TwitterBot

app = Flask(__name__)
storage = Storage()
bot = TwitterBot()

@app.route('/')
def dashboard():
    """Main dashboard view."""
    return render_template('dashboard.html')

@app.route('/api/tweets')
def get_tweets():
    """Get tweet history."""
    tweets = storage.get_tweet_history()
    return jsonify(tweets)

@app.route('/api/followers')
def get_followers():
    """Get follower statistics."""
    stats = storage.get_follow_stats()
    return jsonify(stats)

@app.route('/api/followers/daily')
def get_daily_followers():
    """Get daily follower statistics."""
    stats = storage.get_follow_stats()
    return jsonify(stats['daily_stats'])

@app.route('/api/followers/categories')
def get_category_followers():
    """Get category-wise follower statistics."""
    stats = storage.get_follow_stats()
    return jsonify(stats['category_stats'])

@app.route('/api/cricket-mode', methods=['GET'])
def get_cricket_mode():
    """Get cricket mode status."""
    return jsonify({'enabled': bot.get_cricket_mode()})

@app.route('/api/cricket-mode', methods=['POST'])
def set_cricket_mode():
    """Set cricket mode status."""
    enabled = request.json.get('enabled', False)
    bot.set_cricket_mode(enabled)
    return jsonify({'success': True, 'enabled': enabled})

@app.route('/api/generate-tweet', methods=['POST'])
def generate_tweet():
    """Generate a new tweet."""
    category = request.json.get('category', 'general')
    tweet_text = bot.generate_and_post_tweet(category)
    return jsonify({'success': bool(tweet_text)})

@app.route('/api/next-actions')
def get_next_actions():
    """Get time until next actions."""
    return jsonify(bot.get_next_actions())

@app.route('/api/tweet-now', methods=['POST'])
def tweet_now():
    """Generate and post a tweet immediately without affecting schedule."""
    try:
        print("\n=== Starting Tweet Now Process ===")
        category = request.json.get('category', 'general')
        print(f"Selected category: {category}")
        
        # Get trending topics
        print("Fetching trending topics...")
        trending_topics = bot.twitter.get_top_trending_hashtags(count=10)
        print(f"Trending topics received: {trending_topics}")
        
        # Generate tweet
        print("Generating tweet with OpenRouter...")
        tweet_text = bot.openrouter.generate_tweet(
            category=category,
            trending_topics=trending_topics,
            cricket_mode=bot.cricket_mode
        )
        
        if tweet_text:
            print(f"Generated tweet text: {tweet_text}")
            # Post tweet
            print("Posting tweet to Twitter...")
            response = bot.twitter.tweet(tweet_text)
            if response:
                print("Tweet posted successfully!")
                # Add to history without affecting schedule
                bot.storage.add_tweet({
                    'text': tweet_text,
                    'category': category,
                    'tweet_id': response.data['id'],
                    'trending_topics_used': trending_topics[:3] if trending_topics else [],
                    'cricket_mode': bot.cricket_mode
                })
                return jsonify({'success': True, 'message': 'Tweet posted successfully!'})
            else:
                error_msg = "Failed to post tweet to Twitter API"
                print(f"Error: {error_msg}")
                return jsonify({'success': False, 'message': error_msg})
        else:
            error_msg = "Failed to generate tweet text"
            print(f"Error: {error_msg}")
            return jsonify({'success': False, 'message': error_msg})
            
    except Exception as e:
        error_msg = f"Error in tweet_now: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify({'success': False, 'message': error_msg})

if __name__ == '__main__':
    app.run(debug=True, port=5000) 