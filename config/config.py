import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Twitter API Configuration
TWITTER_CLIENT_ID = os.getenv('TWITTER_CLIENT_ID')
TWITTER_CLIENT_SECRET = os.getenv('TWITTER_CLIENT_SECRET')
TWITTER_BEARER_TOKEN = os.getenv('TWITTER_BEARER_TOKEN')
TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN')
TWITTER_ACCESS_TOKEN_SECRET = os.getenv('TWITTER_ACCESS_TOKEN_SECRET')

# OpenRouter API Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_SITE_URL = os.getenv('OPENROUTER_SITE_URL')
OPENROUTER_SITE_NAME = os.getenv('OPENROUTER_SITE_NAME')

# RapidAPI Configuration
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
RAPIDAPI_TRENDS_HOST = "twitter-trends-by-location.p.rapidapi.com"
RAPIDAPI_TRENDS_BASE_URL = "https://twitter-trends-by-location.p.rapidapi.com"

# Bot Configuration
MAX_DAILY_FOLLOWS = 50  # Starting conservative
MIN_DELAY_BETWEEN_ACTIONS = 30  # seconds
MAX_DELAY_BETWEEN_ACTIONS = 120  # seconds
UNFOLLOW_AFTER_DAYS = 7  # days to wait before unfollowing non-followers

# Cricket Mode Configuration
CRICKET_KEYWORDS = [
    'cricket', 'ipl', 'bcci', 'pcb', 't20', 'test match', 'odi',
    'wicket', 'batting', 'bowling', 'cricinfo', 'icc',
    'team india', 'pakistan cricket', 'ind vs', 'pak vs',
    'virat', 'kohli', 'rohit', 'babar', 'rizwan', 'shaheen',
    'asia cup', 'world cup', 'ipl', 'psl',
    'bleed blue', 'pakistan zindabad', 'men in blue', 'green shirts'
]

CRICKET_ACCOUNTS_TO_MONITOR = [
    'BCCI', 'TheRealPCB', 'ICC', 'cricbuzz', 'ESPNcricinfo',
    'imVkohli', 'ImRo45', 'babarazam258', 'iMRizwanPak',
    'wasimakramlive', 'shoaib100mph', 'sachin_rt', 'virendersehwag',
    'StarSportsIndia', 'PakistanCricket', 'ICCCricketWorld'
]

# Tweet Generation Settings
TWEET_CATEGORIES = [
    'tech_news',
    'humor',
    'general'
]

# Cricket Tweet Categories
CRICKET_TWEET_CATEGORIES = [
    'match_update',   # Live match reactions
    'cricket_stats',  # Interesting statistics and records
    'cricket_news',   # Team updates, selections, announcements
    'cricket_history' # Memorable moments and nostalgia
]

# Cricket Engagement Queries
CRICKET_ENGAGEMENT_QUERIES = [
    'india cricket',
    'pakistan cricket',
    'ind vs pak',
    'cricket news',
    'cricket stats',
    'ipl',
    'psl',
    'world cup cricket'
]

# API Endpoints
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
TWITTER_API_BASE = "https://api.twitter.com/2"

# Logging Configuration
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_FILE = 'bot_activity.log'

# Storage Configuration
STORAGE_TYPE = 'json'  # Can be 'json' or 'sqlite' or 'postgresql'
DATA_DIR = 'data'
FOLLOWED_USERS_FILE = os.path.join(DATA_DIR, 'followed_users.json')
TWEET_HISTORY_FILE = os.path.join(DATA_DIR, 'tweet_history.json')
BOT_STATE_FILE = os.path.join(DATA_DIR, 'bot_state.json') 