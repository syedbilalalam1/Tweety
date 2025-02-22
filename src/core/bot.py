import random
import time
from datetime import datetime, timedelta
import schedule
from src.api.twitter_client import TwitterClient
from src.api.openrouter_client import OpenRouterClient
from src.utils.storage import Storage
from config.config import (
    MAX_DAILY_FOLLOWS,
    TWEET_CATEGORIES,
    UNFOLLOW_AFTER_DAYS,
    CRICKET_TWEET_CATEGORIES,
    CRICKET_KEYWORDS,
    CRICKET_ENGAGEMENT_QUERIES,
    DATA_DIR,
    BOT_STATE_FILE
)
import os
import json

class TwitterBot:
    def __init__(self):
        self.twitter = TwitterClient()
        self.openrouter = OpenRouterClient()
        self.storage = Storage()
        self.daily_follow_count = 0
        self.last_follow_reset = datetime.now()
        self.last_tweet_time = None
        self.cricket_mode = False
        self.next_tweet_time = None
        self.next_follow_time = None
        self._load_state()
    
    def _load_state(self):
        """Load bot state from storage."""
        try:
            if os.path.exists(BOT_STATE_FILE):
                with open(BOT_STATE_FILE, 'r') as f:
                    state = json.load(f)
                    self.cricket_mode = state.get('cricket_mode', False)
                    self.next_tweet_time = datetime.fromisoformat(state.get('next_tweet_time')) if state.get('next_tweet_time') else None
                    self.next_follow_time = datetime.fromisoformat(state.get('next_follow_time')) if state.get('next_follow_time') else None
        except Exception as e:
            print(f"Error loading bot state: {e}")
    
    def _save_state(self):
        """Save bot state to storage."""
        try:
            state = {
                'cricket_mode': self.cricket_mode,
                'next_tweet_time': self.next_tweet_time.isoformat() if self.next_tweet_time else None,
                'next_follow_time': self.next_follow_time.isoformat() if self.next_follow_time else None
            }
            os.makedirs(os.path.dirname(BOT_STATE_FILE), exist_ok=True)
            with open(BOT_STATE_FILE, 'w') as f:
                json.dump(state, f)
        except Exception as e:
            print(f"Error saving bot state: {e}")
    
    def set_cricket_mode(self, enabled):
        """Enable or disable cricket mode."""
        self.cricket_mode = enabled
        self._save_state()
        print(f"Cricket mode {'enabled' if enabled else 'disabled'}")
    
    def get_cricket_mode(self):
        """Get current cricket mode state."""
        return self.cricket_mode
    
    def reset_daily_counts(self):
        """Reset daily counters."""
        self.daily_follow_count = 0
        self.last_follow_reset = datetime.now()
    
    def can_follow_more(self):
        """Check if we can follow more users today."""
        # Reset counter if it's a new day
        if datetime.now().date() > self.last_follow_reset.date():
            self.reset_daily_counts()
        
        return self.daily_follow_count < MAX_DAILY_FOLLOWS
    
    def should_tweet_now(self):
        """Check if enough time has passed since last tweet."""
        if not self.last_tweet_time:
            return True
        
        time_since_last = datetime.now() - self.last_tweet_time
        return time_since_last.total_seconds() >= 1500  # 25 minutes minimum
    
    def get_next_actions(self):
        """Get time until next actions."""
        now = datetime.now()
        return {
            'next_tweet_seconds': int((self.next_tweet_time - now).total_seconds()) if self.next_tweet_time and self.next_tweet_time > now else None,
            'next_follow_seconds': int((self.next_follow_time - now).total_seconds()) if self.next_follow_time and self.next_follow_time > now else None
        }
    
    def generate_and_post_tweet(self, category=None):
        """Generate and post a tweet."""
        try:
            if not self.should_tweet_now():
                print("Skipping tweet - too soon since last tweet")
                return False
            
            # Set next tweet time (30 minutes from now with slight randomization)
            next_interval = random.randint(28, 32)  # 28-32 minutes
            self.next_tweet_time = datetime.now() + timedelta(minutes=next_interval)
            self._save_state()
            print(f"Next tweet scheduled for: {self.next_tweet_time.strftime('%H:%M:%S')}")
            
            # Select category if none provided
            if category is None:
                if self.cricket_mode:
                    category = random.choice(CRICKET_TWEET_CATEGORIES)
                else:
                    # Weight categories based on time of day
                    hour = datetime.now().hour
                    if 8 <= hour <= 22:  # Day time weights
                        weights = {
                            'tech_news': 0.3,
                            'inspiration': 0.3,
                            'humor': 0.2,
                            'general': 0.2
                        }
                    else:  # Night time weights
                        weights = {
                            'tech_news': 0.25,
                            'inspiration': 0.35,
                            'general': 0.25,
                            'humor': 0.15
                        }
                    category = random.choices(
                        list(weights.keys()),
                        weights=list(weights.values())
                    )[0]
            
            print(f"Selected category: {category}")
            
            # Fetch trending topics
            trending_topics = self.twitter.get_top_trending_hashtags(count=10)
            if trending_topics:
                print(f"Current trending topics: {', '.join(trending_topics[:3])}")
            
            if self.cricket_mode and trending_topics:
                # Filter trending topics for cricket-related ones
                cricket_topics = [
                    topic for topic in trending_topics
                    if any(kw in topic.lower() for kw in CRICKET_KEYWORDS)
                ]
                if cricket_topics:
                    trending_topics = cricket_topics
            
            # Add slight random delay (1-180 seconds)
            time.sleep(random.randint(1, 180))
            
            tweet_text = self.openrouter.generate_tweet(
                category=category,
                trending_topics=trending_topics,
                cricket_mode=self.cricket_mode
            )
            
            if tweet_text:
                response = self.twitter.tweet(tweet_text)
                if response:
                    self.last_tweet_time = datetime.now()
                    self.storage.add_tweet({
                        'text': tweet_text,
                        'category': category,
                        'tweet_id': response.data['id'],
                        'trending_topics_used': trending_topics[:3] if trending_topics else [],
                        'cricket_mode': self.cricket_mode
                    })
                    print(f"Posted tweet ({category}): {tweet_text}")
                    return True
            return False
        except Exception as e:
            print(f"Error in generate_and_post_tweet: {e}")
            return False
    
    def follow_users(self, query, max_users=5):
        """Follow users based on search query."""
        try:
            if not self.can_follow_more():
                print("Daily follow limit reached")
                return
            
            # Set next follow time (20 minutes from now with slight randomization)
            next_interval = random.randint(18, 22)  # 18-22 minutes
            self.next_follow_time = datetime.now() + timedelta(minutes=next_interval)
            self._save_state()
            print(f"Next follow scheduled for: {self.next_follow_time.strftime('%H:%M:%S')}")
            
            users = self.twitter.search_users(query)
            if not users:
                return
            
            followed_count = 0
            for user in users.data[:max_users]:
                if self.can_follow_more():
                    response = self.twitter.follow_user(user.id)
                    if response:
                        self.storage.add_followed_user(user.id, {
                            'username': user.username,
                            'query': query
                        })
                        self.daily_follow_count += 1
                        followed_count += 1
                        print(f"Followed user: {user.username}")
            
            return followed_count
        except Exception as e:
            print(f"Error in follow_users: {e}")
            return 0
    
    def unfollow_inactive_users(self):
        """Unfollow users who haven't followed back after X days."""
        try:
            followed_users = self.storage.get_followed_users()
            
            for user_id, data in followed_users.items():
                followed_at = datetime.fromisoformat(data['followed_at'])
                if datetime.now() - followed_at > timedelta(days=UNFOLLOW_AFTER_DAYS):
                    response = self.twitter.unfollow_user(user_id)
                    if response:
                        self.storage.mark_user_unfollowed(user_id)
                        print(f"Unfollowed user: {data['username']}")
        except Exception as e:
            print(f"Error in unfollow_inactive_users: {e}")
    
    def engage_with_tweets(self, query, max_tweets=5):
        """Like and retweet relevant tweets."""
        try:
            tweets = self.twitter.search_tweets(query)
            if not tweets:
                return
            
            for tweet in tweets.data[:max_tweets]:
                # Randomly choose to like, retweet, or both
                if random.random() > 0.5:
                    self.twitter.like_tweet(tweet.id)
                if random.random() > 0.7:  # Less frequent retweets
                    self.twitter.retweet(tweet.id)
        except Exception as e:
            print(f"Error in engage_with_tweets: {e}")
    
    def run_scheduled_tasks(self):
        """Set up and run scheduled tasks."""
        try:
            print("Starting scheduled tasks...")
            
            # Tweet every 30 minutes with slight randomization
            for hour in range(24):
                # First half of hour (between minutes 0-3)
                schedule.every().day.at(f"{hour:02d}:00").do(self.generate_and_post_tweet)
                # Second half of hour (between minutes 30-33)
                schedule.every().day.at(f"{hour:02d}:30").do(self.generate_and_post_tweet)
            
            if self.cricket_mode:
                # Cricket-focused engagement
                # More frequent during match hours (typically afternoon/evening)
                match_hours = list(range(12, 23))  # 12 PM to 11 PM
                for hour in match_hours:
                    # Engage every 10 minutes during match hours
                    for minute in range(0, 60, 10):
                        schedule.every().day.at(f"{hour:02d}:{minute:02d}").do(
                            self.engage_with_tweets,
                            random.choice(CRICKET_ENGAGEMENT_QUERIES),
                            3
                        )
                
                # Follow cricket accounts and fans
                schedule.every().day.at("09:00").do(
                    self.follow_users, "india cricket fans", 5)
                schedule.every().day.at("14:00").do(
                    self.follow_users, "pakistan cricket fans", 5)
                schedule.every().day.at("17:00").do(
                    self.follow_users, "cricket analysis", 5)
                schedule.every().day.at("20:00").do(
                    self.follow_users, "cricket news", 5)
            else:
                # Regular tech/general engagement
                schedule.every().day.at("09:00").do(
                    self.generate_and_post_tweet, "tech_news")
                schedule.every().day.at("12:30").do(
                    self.generate_and_post_tweet, "inspiration")
                schedule.every().day.at("17:00").do(
                    self.generate_and_post_tweet, "tech_news")
                
                # Follow users four times a day
                schedule.every().day.at("08:00").do(
                    self.follow_users, "python programming", 5)
                schedule.every().day.at("12:00").do(
                    self.follow_users, "web development", 5)
                schedule.every().day.at("16:00").do(
                    self.follow_users, "artificial intelligence", 5)
                schedule.every().day.at("20:00").do(
                    self.follow_users, "tech startup", 5)
                
                # Regular engagement every 15 minutes
                queries = ["tech news", "programming tips", "web dev", "AI news", 
                          "software engineering", "data science", "tech startup", "coding tips"]
                for i, query in enumerate(queries):
                    minute = (i * 15) % 60
                    schedule.every().hour.at(f":{minute:02d}").do(
                        self.engage_with_tweets, query, 2)
            
            # Maintenance tasks
            schedule.every().day.at("00:00").do(self.unfollow_inactive_users)
            schedule.every().day.at("00:00").do(self.reset_daily_counts)
            
            # Initial tweet on startup with slight delay
            time.sleep(random.randint(1, 300))  # Random delay 1-300 seconds
            self.generate_and_post_tweet()
            
            print("Bot initialized and running...")
            print(f"Mode: {'Cricket' if self.cricket_mode else 'Regular'}")
            print("Tweet schedule: Every 30 minutes (48 tweets per day)")
            print(f"Engagement schedule: {'Every 10 minutes during match hours' if self.cricket_mode else 'Every 15 minutes'}")
            
            while True:
                schedule.run_pending()
                time.sleep(60)
                
        except Exception as e:
            print(f"Error in run_scheduled_tasks: {e}")
            # Wait for a minute before retrying
            time.sleep(60)
            self.run_scheduled_tasks()  # Restart the tasks 