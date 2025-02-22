import os
import sys
from dotenv import load_dotenv
from core.bot import TwitterBot

def main():
    # Load environment variables
    load_dotenv()
    
    # Check if required environment variables are set
    required_vars = [
        'TWITTER_CLIENT_ID',
        'TWITTER_CLIENT_SECRET',
        'TWITTER_BEARER_TOKEN',
        'OPENROUTER_API_KEY'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)
    
    try:
        # Initialize and run the bot
        bot = TwitterBot()
        print("Twitter Bot initialized successfully!")
        print("Starting scheduled tasks...")
        bot.run_scheduled_tasks()
    except KeyboardInterrupt:
        print("\nBot stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"Error running bot: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 