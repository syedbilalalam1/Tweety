import tweepy
import time
import random
import http.client
import json
from datetime import datetime
from config.config import (
    TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET,
    TWITTER_BEARER_TOKEN,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_TOKEN_SECRET,
    MIN_DELAY_BETWEEN_ACTIONS,
    MAX_DELAY_BETWEEN_ACTIONS,
    RAPIDAPI_KEY,
    RAPIDAPI_TRENDS_HOST,
    RAPIDAPI_TRENDS_BASE_URL
)

class TwitterClient:
    # WOEID (Where On Earth ID) for locations
    LOCATION_WOEIDS = {
        'india': 23424848,    # India
        'pakistan': 23424922, # Pakistan
        'mumbai': 2295411,    # Mumbai
        'delhi': 20070458,    # Delhi
        'karachi': 2211096,   # Karachi
        'lahore': 2211177     # Lahore
    }
    
    # RapidAPI Location IDs
    RAPIDAPI_LOCATIONS = {
        'india': 'd2c5d61cecd034eb91fda2134a615be1',    # India
        'pakistan': 'd476c7ff73003334ad5a8e9830743ec3'   # Pakistan
    }
    
    # Tournament schedules for event-based hashtags
    TOURNAMENTS = {
        # (start_month, end_month): [hashtags]
        (1, 4): ['#IPL', '#IPL2024', '#TATAIPL'],
        (2, 3): ['#PSL', '#PSL2024', '#HBLPSL'],
        (12, 2): ['#BBL', '#BBL24', '#BigBash'],
        (6, 8): ['#TheHundred', '#Hundred2024'],
        (9, 11): ['#T20WorldCup', '#T20WC', '#WorldT20']
    }
    
    def __init__(self):
        """Initialize Twitter API clients with proper authentication and connection settings."""
        try:
            print("\n=== Initializing Twitter API Clients ===")
            
            # Validate credentials format
            print("\nValidating API credentials...")
            credentials = {
                'Client ID': TWITTER_CLIENT_ID,
                'Client Secret': TWITTER_CLIENT_SECRET,
                'Bearer Token': TWITTER_BEARER_TOKEN,
                'Access Token': TWITTER_ACCESS_TOKEN,
                'Access Token Secret': TWITTER_ACCESS_TOKEN_SECRET
            }
            
            for name, value in credentials.items():
                if not value:
                    raise ValueError(f"{name} is missing")
                if len(value) < 10:  # Basic length check
                    raise ValueError(f"{name} appears to be incomplete")
            
            print("✓ All required credentials are present")
            
            # Configure retry settings
            retry_count = 3
            retry_delay = 5
            timeout = 30
            
            # Initialize API v1.1 first (needed for trends)
            print("\nInitializing OAuth 1.0a authentication...")
            try:
                auth = tweepy.OAuth1UserHandler(
                    TWITTER_CLIENT_ID,
                    TWITTER_CLIENT_SECRET,
                    TWITTER_ACCESS_TOKEN,
                    TWITTER_ACCESS_TOKEN_SECRET
                )
                print("✓ OAuth 1.0a handler created successfully")
            except Exception as e:
                print(f"✗ Error creating OAuth 1.0a handler: {str(e)}")
                raise
            
            print("\nSetting up API with retry settings...")
            self.api = tweepy.API(
                auth,
                retry_count=retry_count,
                retry_delay=retry_delay,
                timeout=timeout,
                wait_on_rate_limit=True
            )
            
            # Test v1.1 authentication with error handling
            print("Testing v1.1 API authentication...")
            try:
                user = self.api.verify_credentials()
                print(f"✓ V1.1 API authentication successful!")
                print(f"✓ Authenticated as: @{user.screen_name}")
            except tweepy.errors.Unauthorized as e:
                print("✗ V1.1 API authentication failed: Invalid credentials")
                print("  Please check your Client ID, Client Secret, Access Token, and Access Token Secret")
                print(f"  Error details: {str(e)}")
            except Exception as e:
                print(f"✗ V1.1 API authentication failed: {str(e)}")
                print("  Check your internet connection and VPN status")

            # Initialize v2 client
            print("\nInitializing v2 API client...")
            try:
                self.client = tweepy.Client(
                    bearer_token=TWITTER_BEARER_TOKEN,
                    consumer_key=TWITTER_CLIENT_ID,
                    consumer_secret=TWITTER_CLIENT_SECRET,
                    access_token=TWITTER_ACCESS_TOKEN,
                    access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
                    wait_on_rate_limit=True
                )
                print("✓ V2 Client initialized successfully")
            except Exception as e:
                print(f"✗ Error initializing v2 client: {str(e)}")
                raise
            
            # Test v2 authentication with error handling
            print("Testing v2 API authentication...")
            try:
                me = self.client.get_me()
                print(f"✓ V2 API authentication successful!")
                if me and me.data:
                    print(f"✓ Authenticated as: @{me.data.username}")
            except tweepy.errors.Unauthorized as e:
                print("✗ V2 API authentication failed: Invalid credentials")
                print("  Please check your Bearer Token and other credentials")
                print(f"  Error details: {str(e)}")
            except Exception as e:
                print(f"✗ V2 API authentication failed: {str(e)}")
                print("  Check your internet connection and VPN status")
            
        except ValueError as e:
            print(f"\n✗ Credential validation error: {str(e)}")
            print("\nPlease follow these steps to fix your credentials:")
            print("1. Go to https://developer.twitter.com/en/portal/dashboard")
            print("2. Select your project and app")
            print("3. Go to 'Keys and Tokens' section")
            print("4. Generate new keys and tokens if needed")
            print("5. Update your .env file with the new credentials")
            print("\nMake sure your app has:")
            print("- Read and Write permissions enabled")
            print("- OAuth 1.0a enabled")
            print("- OAuth 2.0 enabled")
            raise
        except Exception as e:
            print(f"\n✗ Error initializing Twitter API: {str(e)}")
            print("\nTroubleshooting steps:")
            print("1. Verify your API credentials in .env file")
            print("2. Check if your Twitter Developer App has required permissions")
            print("3. Ensure your VPN is connected and stable")
            print("4. Verify your internet connection")
            raise

    def random_delay(self):
        """Add random delay between actions to simulate human behavior."""
        delay = random.uniform(MIN_DELAY_BETWEEN_ACTIONS, MAX_DELAY_BETWEEN_ACTIONS)
        time.sleep(delay)
    
    def get_recent_hashtag_posts(self, hashtag, max_posts=10):
        """Get recent posts for a hashtag."""
        try:
            # Remove # from hashtag if present
            query = hashtag.replace('#', '')
            response = self.client.search_recent_tweets(
                query=query,
                max_results=max_posts,
                tweet_fields=['text', 'created_at', 'public_metrics']
            )
            
            if not response or not response.data:
                return []
            
            # Extract relevant info from tweets
            posts = []
            for tweet in response.data:
                posts.append({
                    'text': tweet.text,
                    'metrics': tweet.public_metrics,
                    'created_at': tweet.created_at.isoformat()
                })
            return posts
        except Exception as e:
            print(f"Error fetching posts for {hashtag}: {e}")
            return []

    def get_trending_topics(self, locations=None, max_trends=5):
        """Get trending topics using RapidAPI Twitter Trends service with robust error handling."""
        print("\n=== Fetching Trending Topics ===")
        
        if not RAPIDAPI_KEY:
            print("Error: RAPIDAPI_KEY not found in environment variables")
            return self._get_default_trends(max_trends)
        
        try:
            # Initialize connection with timeout
            conn = http.client.HTTPSConnection(RAPIDAPI_TRENDS_HOST, timeout=10)
            headers = {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_TRENDS_HOST
            }
            
            all_trends = []
            locations_to_check = locations or ['india', 'pakistan']
            
            for location in locations_to_check:
                try:
                    location_id = self.RAPIDAPI_LOCATIONS.get(location.lower())
                    if not location_id:
                        print(f"No location ID found for {location}")
                        continue
                    
                    print(f"Fetching trends for {location}...")
                    
                    conn.request("GET", f"/location/{location_id}", headers=headers)
                    response = conn.getresponse()
                    
                    if response.status == 429:  # Too Many Requests
                        print(f"Rate limit exceeded for {location}, waiting 1 second...")
                        time.sleep(1)
                        continue
                        
                    if response.status != 200:
                        print(f"Error fetching trends for {location}: HTTP {response.status}")
                        continue
                    
                    data = json.loads(response.read().decode("utf-8"))
                    
                    if data.get('status') == 'SUCCESS' and data.get('trending', {}).get('trends'):
                        trends = data['trending']['trends']
                        location_trends = []
                        for trend in trends:
                            name = trend.get('name', '')
                            # Skip financial trends and empty names
                            if name and not name.startswith('$'):
                                # Convert non-hashtag trends to hashtags if they're not URLs or mentions
                                if not name.startswith('#') and not name.startswith('@') and not name.startswith('http'):
                                    name = f"#{name.replace(' ', '')}"
                                location_trends.append(name)
                        print(f"Found {len(location_trends)} trends for {location}")
                        all_trends.extend(location_trends)
                    else:
                        print(f"Invalid response format or no trends for {location}")
                    
                    time.sleep(1)  # Add delay between requests
                    
                except (http.client.HTTPException, json.JSONDecodeError) as e:
                    print(f"Error processing trends for {location}: {str(e)}")
                    continue
                except Exception as e:
                    print(f"Unexpected error for {location}: {str(e)}")
                    continue
            
            conn.close()
            
            if all_trends:
                # Remove duplicates while preserving order
                unique_trends = list(dict.fromkeys(all_trends))
                # Filter out any malformed hashtags and ensure they start with #
                valid_trends = [t for t in unique_trends if len(t) > 1 and t.startswith('#')]
                final_trends = valid_trends[:max_trends]
                
                if final_trends:
                    print(f"Using live trends: {final_trends}")
                    
                    # Get recent posts for top 3 trends
                    trend_data = []
                    for trend in final_trends[:3]:
                        recent_posts = self.get_recent_hashtag_posts(trend)
                        trend_data.append({
                            'hashtag': trend,
                            'recent_posts': recent_posts
                        })
                    
                    return {
                        'trends': final_trends,
                        'trend_data': trend_data
                    }
            
            print("No valid trends found from API")
            return self._get_default_trends(max_trends)
            
        except Exception as e:
            print(f"Error fetching trends from RapidAPI: {str(e)}")
            return self._get_default_trends(max_trends)
        
    def _get_default_trends(self, max_trends):
        """Get default cricket hashtags when API fails."""
        print("Using default cricket hashtags...")
        default_trends = [
            '#Cricket', '#CricketTwitter', '#LoveCricket', '#CricketFever',
            '#T20WorldCup', '#IPL2024', '#PSL2024', '#CT25', '#ChampionsTrophy',
            '#INDvENG', '#PAKvNZ', '#AUSvWI', '#SAvIND', '#PAKvIND',
            '#TeamIndia', '#BackTheBoysInGreen', '#Aussies', '#Proteas',
            '#TestCricket', '#T20Cricket', '#ODICricket',
            '#CricketIsLife', '#CricketLover', '#CricketFamily',
            '#IPL', '#PSL', '#BBL', '#CPL', '#SA20',
            '#CricketAnalysis', '#CricketStats'
        ]
        
        # Return random selection from default trends
        selected_trends = random.sample(default_trends, min(max_trends, len(default_trends)))
        print(f"Selected default hashtags: {selected_trends}")
        return selected_trends
    
    def get_top_trending_hashtags(self, count=5):
        """Get top trending hashtags from India and Pakistan."""
        trends = self.get_trending_topics(max_trends=count)
        return trends  # Already filtered to hashtags in get_trending_topics
    
    def tweet(self, text):
        """Post a tweet with proper error handling."""
        try:
            # Clean and format the tweet text
            cleaned_text = text.strip()
            
            # Ensure tweet length is within limits (280 characters)
            if len(cleaned_text) > 280:
                cleaned_text = cleaned_text[:277] + "..."
            
            print(f"\nAttempting to post tweet:\n{cleaned_text}\n")
            
            try:
                response = self.client.create_tweet(text=cleaned_text)
                print("✓ Tweet posted successfully!")
                self.random_delay()
                return response
            except tweepy.errors.Forbidden as e:
                print(f"✗ Permission error: {str(e)}")
                print("  Please check if your Twitter API tokens have write permissions enabled")
                return None
            except tweepy.errors.TooManyRequests as e:
                print(f"✗ Rate limit exceeded: {str(e)}")
                print("  Waiting before trying again...")
                time.sleep(60)  # Wait for 60 seconds before next attempt
                return None
            except Exception as e:
                print(f"✗ Error posting tweet: {str(e)}")
                return None
                
        except Exception as e:
            print(f"✗ Unexpected error in tweet method: {str(e)}")
            return None
    
    def follow_user(self, user_id):
        """Follow a user by their ID."""
        try:
            response = self.client.follow_user(user_id)
            self.random_delay()
            return response
        except Exception as e:
            print(f"Error following user: {e}")
            return None
    
    def unfollow_user(self, user_id):
        """Unfollow a user by their ID."""
        try:
            response = self.client.unfollow_user(user_id)
            self.random_delay()
            return response
        except Exception as e:
            print(f"Error unfollowing user: {e}")
            return None
    
    def like_tweet(self, tweet_id):
        """Like a tweet by its ID."""
        try:
            response = self.client.like(tweet_id)
            self.random_delay()
            return response
        except Exception as e:
            print(f"Error liking tweet: {e}")
            return None
    
    def retweet(self, tweet_id):
        """Retweet a tweet by its ID."""
        try:
            response = self.client.retweet(tweet_id)
            self.random_delay()
            return response
        except Exception as e:
            print(f"Error retweeting: {e}")
            return None
    
    def search_users(self, query, max_results=10):
        """Search for users based on a query."""
        try:
            # Use users.search endpoint in v2
            response = self.client.search_users(
                query=query,
                max_results=max_results,
                user_fields=['id', 'username', 'name', 'description']
            )
            self.random_delay()
            return response
        except AttributeError:
            # Fallback to v1.1 API if v2 not available
            try:
                users = self.api.search_users(
                    q=query,
                    count=max_results
                )
                self.random_delay()
                return users
            except Exception as e:
                print(f"Error searching users (v1.1 fallback): {e}")
                return None
        except Exception as e:
            print(f"Error searching users: {e}")
            return None
    
    def search_tweets(self, query, max_results=10):
        """Search for tweets based on a query."""
        try:
            response = self.client.search_recent_tweets(query=query, max_results=max_results)
            self.random_delay()
            return response
        except Exception as e:
            print(f"Error searching tweets: {e}")
            return None 