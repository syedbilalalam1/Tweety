# Tweety - AI-Powered Twitter Bot Dashboard

Tweety is an advanced Twitter bot that automatically generates and posts engaging content about backend development, programming tips, and trending topics. It features a secure dashboard for monitoring and controlling tweet generation.

![Image](https://github.com/user-attachments/assets/0ca9a05f-fef9-46d3-afad-526a6768af23)

## Features

- 🤖 **AI-Powered Content Generation**
  - Automated tweet generation for backend development topics
  - Code snippet generation with syntax highlighting
  - Real-time trend analysis and contextual tweets
  - Smart content scheduling system

- 📊 **Interactive Dashboard**
  - Real-time monitoring of tweet schedules
  - Trending topics display for multiple countries
  - Tweet history with status tracking
  - Manual tweet generation controls

- 🌍 **Multi-Country Trend Tracking**
  - Pakistan
  - United Kingdom
  - India
  - United States

- 🔐 **Secure Access**
  - Authentication system
  - Session management
  - Protected API endpoints

## Tech Stack

- Backend: NestJS (Node.js)
- Frontend: Handlebars (HBS) with TailwindCSS
- AI Integration: OpenRouter API
- Twitter API v2
- Database: In-memory storage with persistence

## Prerequisites

- Node.js 18.x
- Twitter Developer Account with API credentials
- OpenRouter API key
- RapidAPI key (for trend tracking)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/PersonalTweety.git
cd PersonalTweety
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example` and fill in your credentials.

4. Build the project:
```bash
npm run build
```

5. Start the server:
```bash
npm run start:prod
```

## Configuration

The application uses several environment variables for configuration. Copy `.env.example` to `.env` and fill in your credentials:

- Twitter API credentials
- OpenRouter API key
- RapidAPI key
- Authentication credentials
- Other configuration options

## Usage

1. Access the dashboard at `http://localhost:3000`
2. Log in using your configured credentials
3. Monitor tweet generation and trending topics
4. Use pause/reset controls as needed

## Tweet Generation Schedule

- **Trending Tweets**: Sequential hourly posts rotating through configured countries
- **Random Tweets**: 6 tweets per day (mix of code and text content)
- **Minimum Gap**: 2 hours between random tweets

## Development

```bash
# Development mode
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

The project includes a `render.yaml` configuration file for easy deployment to Render.com. You can also deploy to other platforms that support Node.js applications.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Twitter API v2
- OpenRouter AI
- NestJS Framework
- TailwindCSS

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Made with ❤️ by [Your Name] 
