import os
import sys
import threading
import time
import schedule
import random
from dotenv import load_dotenv
from src.core.bot import TwitterBot
from src.web.app import app
from datetime import datetime, timedelta

def check_environment():
    """Check if all required environment variables are set."""
    load_dotenv()
    
    required_vars = [
        'TWITTER_CLIENT_ID',
        'TWITTER_CLIENT_SECRET',
        'TWITTER_BEARER_TOKEN',
        'OPENROUTER_API_KEY',
        'RAPIDAPI_KEY'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)

def run_scheduled_tasks(bot):
    """Run scheduled tasks in a loop."""
    while True:
        schedule.run_pending()
        time.sleep(1)

def run_bot():
    """Run the Twitter bot in a separate thread."""
    try:
        bot = TwitterBot()
        print("\nTwitter Bot initialized successfully!")
        
        # Set initial next action times with randomization
        now = datetime.now()
        
        # Initial tweet delay: random between 1-30 minutes
        initial_tweet_delay = random.randint(60, 1800)  # 1-30 minutes in seconds
        initial_tweet_time = now + timedelta(seconds=initial_tweet_delay)
        bot.next_tweet_time = initial_tweet_time
        
        # Initial follow delay: random between 2-15 minutes
        initial_follow_delay = random.randint(120, 900)  # 2-15 minutes in seconds
        initial_follow_time = now + timedelta(seconds=initial_follow_delay)
        bot.next_follow_time = initial_follow_time
        
        # Save initial state
        bot._save_state()
        
        print("\n=== Scheduled Actions ===")
        print(f"Initial tweet scheduled for: {initial_tweet_time.strftime('%H:%M:%S')} ({initial_tweet_delay} seconds)")
        print(f"Initial follow scheduled for: {initial_follow_time.strftime('%H:%M:%S')} ({initial_follow_delay} seconds)")
        
        # Schedule initial tweet
        def delayed_first_tweet():
            print(f"\n=== Executing Initial Tweet (Delay: {initial_tweet_delay}s) ===")
            time.sleep(initial_tweet_delay)
            bot.generate_and_post_tweet()
            # Schedule next tweet (30 minutes ± 5 minutes)
            next_interval = random.randint(25, 35)
            bot.next_tweet_time = datetime.now() + timedelta(minutes=next_interval)
            bot._save_state()
            print(f"Next tweet scheduled for: {bot.next_tweet_time.strftime('%H:%M:%S')}")
        
        # Schedule initial follow
        def delayed_first_follow():
            print(f"\n=== Executing Initial Follow (Delay: {initial_follow_delay}s) ===")
            time.sleep(initial_follow_delay)
            if bot.cricket_mode:
                print("Cricket mode active - Following cricket-related accounts...")
                bot.follow_users("cricket fans", 5)
            else:
                categories = ["python programming", "web development", 
                            "artificial intelligence", "tech startup"]
                selected_category = random.choice(categories)
                print(f"Following users from category: {selected_category}")
                bot.follow_users(selected_category, 5)
            # Schedule next follow (20 minutes ± 3 minutes)
            next_interval = random.randint(17, 23)
            bot.next_follow_time = datetime.now() + timedelta(minutes=next_interval)
            bot._save_state()
            print(f"Next follow scheduled for: {bot.next_follow_time.strftime('%H:%M:%S')}")
        
        # Start initial action threads
        tweet_thread = threading.Thread(target=delayed_first_tweet)
        tweet_thread.daemon = True
        tweet_thread.start()
        
        follow_thread = threading.Thread(target=delayed_first_follow)
        follow_thread.daemon = True
        follow_thread.start()
        
        print("\n=== Setting Up Regular Schedule ===")
        # Regular tweet schedule (30 minutes ± 5 minutes)
        def scheduled_tweet():
            bot.generate_and_post_tweet()
            next_interval = random.randint(25, 35)
            bot.next_tweet_time = datetime.now() + timedelta(minutes=next_interval)
            bot._save_state()
            print(f"Next tweet scheduled for: {bot.next_tweet_time.strftime('%H:%M:%S')}")
        
        # Regular follow schedule (20 minutes ± 3 minutes)
        def scheduled_follow():
            if bot.cricket_mode:
                bot.follow_users("cricket fans", 5)
            else:
                categories = ["python programming", "web development", 
                            "artificial intelligence", "tech startup"]
                bot.follow_users(random.choice(categories), 5)
            next_interval = random.randint(17, 23)
            bot.next_follow_time = datetime.now() + timedelta(minutes=next_interval)
            bot._save_state()
            print(f"Next follow scheduled for: {bot.next_follow_time.strftime('%H:%M:%S')}")
        
        # Set up regular schedules with randomization
        schedule.every(25).to(35).minutes.do(scheduled_tweet)
        schedule.every(17).to(23).minutes.do(scheduled_follow)
        
        # Maintenance tasks
        schedule.every().day.at("00:00").do(bot.reset_daily_counts)
        schedule.every(7).days.do(bot.unfollow_inactive_users)
        
        print("\n=== Bot Configuration ===")
        print(f"Mode: {'Cricket' if bot.cricket_mode else 'Regular'}")
        print("Tweet schedule: Every 30 minutes (±5 minutes)")
        print("Follow schedule: Every 20 minutes (±3 minutes)")
        print("Daily follow limit:", MAX_DAILY_FOLLOWS)
        
        print("\n=== Starting Scheduled Tasks ===")
        while True:
            schedule.run_pending()
            time.sleep(1)
            
    except Exception as e:
        print(f"\n✗ Error running bot: {e}")
        sys.exit(1)

def run_dashboard():
    """Run the Flask dashboard."""
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

def main():
    """Main function to run both bot and dashboard."""
    try:
        # Check environment variables
        check_environment()
        
        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)
        
        print("\n=== Starting Twitter Bot ===")
        # Start bot in a separate thread
        bot_thread = threading.Thread(target=run_bot)
        bot_thread.daemon = True
        bot_thread.start()
        print("✓ Bot thread started")
        
        # Run Flask app in main thread
        print("\n=== Starting Dashboard ===")
        run_dashboard()
        
    except KeyboardInterrupt:
        print("\n\nShutting down gracefully...")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Error in main: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 