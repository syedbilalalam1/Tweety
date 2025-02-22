import requests
import random
from config.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_API_URL,
    OPENROUTER_SITE_URL,
    OPENROUTER_SITE_NAME
)
from .cricket_client import CricketClient

class OpenRouterClient:
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.api_url = OPENROUTER_API_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": OPENROUTER_SITE_URL,
            "X-Title": OPENROUTER_SITE_NAME,
            "Content-Type": "application/json"
        }
        self.cricket_client = CricketClient()
    
    def generate_tweet(self, category, context="", trending_topics=None, cricket_mode=False):
        """Generate a tweet using OpenRouter API."""
        if not trending_topics:
            trending_topics = []
        
        # Extract trends and trend_data if available
        trends = trending_topics.get('trends', []) if isinstance(trending_topics, dict) else trending_topics
        trend_data = trending_topics.get('trend_data', []) if isinstance(trending_topics, dict) else []
        
        if cricket_mode:
            # Find cricket-related hashtags and keep their original ranking
            cricket_tags = []
            for i, tag in enumerate(trends):
                if any(x in tag.lower() for x in ['cricket', 'ipl', 'test', 't20', 'odi', 'worldcup', 'ind', 'pak']):
                    cricket_tags.append({
                        'tag': tag,
                        'rank': i + 1  # Adding 1 to make rank 1-based
                    })
            
            # Sort by rank (lower number = higher rank)
            cricket_tags.sort(key=lambda x: x['rank'])
            
            # Get the highest-ranking cricket hashtag if available
            primary_tag = cricket_tags[0]['tag'] if cricket_tags else None
            
            # Set up base prompts for different scenarios
            base_prompts = {
                'cricket_stats': (
                    "Share a brief, engaging cricket stat about {topic}. "
                    "Consider the public reaction in the recent posts. "
                    "Keep it under 200 characters!"
                ),
                'cricket_history': (
                    "Share a quick, exciting cricket moment about {topic}. "
                    "Connect it with the current public sentiment. "
                    "Keep it under 200 characters!"
                ),
                'cricket_news': (
                    "Share the latest cricket news about {topic}. "
                    "Reflect the trending public opinion. "
                    "Keep it under 200 characters!"
                ),
                'general': (
                    "Share a quick, exciting update about {topic}. "
                    "Capture the current public mood. "
                    "Keep it under 200 characters!"
                )
            }
            
            # Select prompt and prepare content
            if primary_tag:
                # Clean the tag for prompt insertion (remove # and convert to readable form)
                topic = primary_tag.replace('#', '').replace('vs', ' vs ')
                prompt = base_prompts.get(category, base_prompts['general']).format(topic=topic)
                
                # Add context from recent posts if available
                relevant_trend_data = next(
                    (data for data in trend_data if data['hashtag'] == primary_tag),
                    None
                )
                
                if relevant_trend_data and relevant_trend_data['recent_posts']:
                    prompt += "\n\nRecent public posts about this topic:"
                    for i, post in enumerate(relevant_trend_data['recent_posts'][:5], 1):
                        prompt += f"\n{i}. {post['text']}"
                    prompt += "\n\nCreate a tweet that reflects the general public sentiment from these posts."
                
                system_content = (
                    "You are a cricket enthusiast creating short, impactful tweets! "
                    "Analyze the recent posts to understand public sentiment. "
                    "Keep tweets concise (under 200 chars), engaging, and focused on the main topic. "
                    "Use minimal emojis (max 2-3) and avoid hashtags in the text. "
                    "Write naturally like a fan sharing exciting cricket news!"
                )
            else:
                # Fallback to general cricket content if no cricket hashtags are trending
                prompt = (
                    "Share a quick, exciting cricket update! Focus on recent matches, "
                    "upcoming games, or player performances. Keep it under 200 characters!"
                )
                system_content = (
                    "You are a cricket fan sharing quick updates! Keep tweets concise, "
                    "engaging, and natural. Use minimal emojis and avoid hashtags in the text."
                )
            
            # Select hashtags to use
            selected_hashtags = []
            if cricket_tags:
                # Use the top 2 ranked cricket hashtags
                selected_hashtags = [tag['tag'] for tag in cricket_tags[:2]]
            else:
                # Fallback to default cricket hashtags
                selected_hashtags = ['#Cricket', '#CricketTwitter']
                
        else:
            # Non-cricket mode remains unchanged
            base_prompts = {
                'inspiration': "Generate a brief inspiring tweet. Keep it under 200 characters.",
                'tech_news': "Share a quick tech update or innovation. Keep it under 200 characters.",
                'humor': "Share a light, witty observation. Keep it under 200 characters.",
                'general': "Share an interesting fact or update. Keep it under 200 characters."
            }
            prompt = base_prompts.get(category, base_prompts['general'])
            system_content = (
                "You are creating concise, engaging tweets. Keep them under 200 characters, "
                "use minimal emojis, and write naturally without hashtags in the text."
            )
            # Select 2 trending hashtags for non-cricket mode
            selected_hashtags = trends[:2] if trends else []
        
        if context:
            prompt = f"{prompt} Context: {context}"
        
        try:
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json={
                    "model": "qwen/qwen2.5-vl-72b-instruct:free",
                    "messages": [
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": prompt}
                    ],
                    "top_p": 1,
                    "temperature": 0.7,
                    "repetition_penalty": 1.1
                }
            )
            
            if response.status_code == 200:
                tweet_text = response.json()['choices'][0]['message']['content']
                tweet_text = tweet_text.strip().strip('"')
                
                # Clean up the tweet text
                tweet_text = tweet_text.replace('  ', ' ').strip()
                
                # Format tweet with hashtags
                if selected_hashtags:
                    # Always put hashtags on a new line for better readability
                    tweet_text = f"{tweet_text}\n\n{' '.join(selected_hashtags)}"
                
                return tweet_text
            else:
                print(f"Error generating tweet: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error calling OpenRouter API: {e}")
            return None 