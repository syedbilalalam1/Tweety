import requests
from typing import List, Dict, Optional

class TwitterBridgeClient:
    def __init__(self, bridge_url: str = "http://localhost:3000"):
        self.bridge_url = bridge_url
    
    def search_tweets(self, hashtag: str, count: int = 10) -> List[Dict]:
        """Search for recent tweets containing the hashtag."""
        try:
            response = requests.get(
                f"{self.bridge_url}/search/{hashtag.strip('#')}",
                params={"count": count}
            )
            data = response.json()
            if data["success"]:
                return data["data"]
            print(f"Error searching tweets: {data.get('error')}")
            return []
        except Exception as e:
            print(f"Error in search_tweets: {str(e)}")
            return []
    
    def post_tweet(self, text: str) -> Optional[Dict]:
        """Post a tweet using the bridge service."""
        try:
            response = requests.post(
                f"{self.bridge_url}/tweet",
                json={"text": text}
            )
            data = response.json()
            if data["success"]:
                print("✓ Tweet posted successfully!")
                return data["data"]
            print(f"✗ Error posting tweet: {data.get('error')}")
            return None
        except Exception as e:
            print(f"✗ Error in post_tweet: {str(e)}")
            return None
    
    def like_tweet(self, tweet_id: str) -> bool:
        """Like a tweet using the bridge service."""
        try:
            response = requests.post(f"{self.bridge_url}/like/{tweet_id}")
            data = response.json()
            return data["success"]
        except Exception as e:
            print(f"Error liking tweet: {str(e)}")
            return False