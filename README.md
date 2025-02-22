# Tweety 🐦

A powerful, customizable Twitter bot built with Python that supports both regular and cricket-focused tweeting modes. Features an elegant web dashboard for real-time monitoring and control.

## Features 🌟

- **Dual Mode Operation**
  - Regular Mode: Tech, programming, and general content
  - Cricket Mode: Live match updates, stats, and cricket news
  
- **Smart Tweet Generation**
  - Context-aware tweets using OpenRouter AI
  - Trending hashtag integration
  - Public sentiment analysis
  - Automatic categorization

- **Intelligent Following System**
  - Smart user targeting based on interests
  - Automatic unfollowing of inactive users
  - Daily follow limits for safety
  - Category-based following

- **Real-time Web Dashboard**
  - Live tweet monitoring
  - Follow/unfollow statistics
  - Mode switching
  - Manual tweet triggering
  - Beautiful UI with Tailwind CSS

- **Cricket Features** 🏏
  - Live match commentary
  - Real-time score updates
  - Match statistics
  - Player performance tracking

## Prerequisites 📋

- Python 3.9+
- Twitter Developer Account with API v2 access
- OpenRouter API key
- RapidAPI key (for cricket features)

## Installation 🚀

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tweety.git
   cd tweety
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys and configuration.

## Configuration ⚙️

Required environment variables:

```env
# Twitter API Credentials
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_SITE_URL=your_site_url
OPENROUTER_SITE_NAME=your_site_name

# RapidAPI Configuration
RAPIDAPI_KEY=your_rapidapi_key
```

## Usage 🎯

1. Start the bot:
   ```bash
   # Windows
   start.bat
   
   # Linux/Mac
   ./start.sh
   ```

2. Access the dashboard:
   ```
   http://localhost:5000
   ```

3. Monitor and control through the web interface:
   - Switch between Regular/Cricket modes
   - View tweet history
   - Check following statistics
   - Trigger manual tweets

## Deployment 🚀

The bot is configured for deployment on Render using the included `render.yaml`:

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Add your environment variables
5. Deploy!

## Features in Detail 📝

### Tweet Generation
- Smart context understanding
- Trending topic integration
- Category-based content
- Sentiment analysis
- Automatic hashtag selection

### Following Strategy
- Interest-based targeting
- Daily follow limits
- Automatic unfollowing
- Engagement tracking
- Category statistics

### Cricket Mode
- Live match updates
- Real-time scores
- Player statistics
- Match commentary
- Tournament tracking

### Dashboard Features
- Real-time monitoring
- Interactive controls
- Statistical graphs
- Tweet history
- Follow/unfollow tracking

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Twitter API v2
- OpenRouter AI
- RapidAPI Cricket API
- Flask
- Tweepy
- Chart.js
- Tailwind CSS 