const { Scraper } = require('agent-twitter-client');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ path: '../../.env' });

const app = express();
app.use(express.json());

const scraper = new Scraper();

async function initializeScraper() {
    try {
        await scraper.login(
            process.env.TWITTER_USERNAME,
            process.env.TWITTER_PASSWORD
        );
        console.log("✓ Twitter scraper initialized successfully!");
    } catch (error) {
        console.error("✗ Error initializing scraper:", error);
    }
}

// Search tweets by hashtag
app.get('/search/:hashtag', async (req, res) => {
    try {
        const { hashtag } = req.params;
        const { count = 10 } = req.query;
        
        console.log(`Searching tweets for hashtag: ${hashtag}`);
        const tweets = await scraper.searchTweets(hashtag, parseInt(count));
        
        res.json({
            success: true,
            data: tweets.map(tweet => ({
                text: tweet.text,
                username: tweet.username,
                timestamp: tweet.timestamp,
                likes: tweet.likes,
                retweets: tweet.retweets
            }))
        });
    } catch (error) {
        console.error("Error searching tweets:", error);
        res.json({ success: false, error: error.message });
    }
});

// Post a tweet
app.post('/tweet', async (req, res) => {
    try {
        const { text } = req.body;
        console.log(`Posting tweet: ${text}`);
        
        const result = await scraper.sendTweet(text);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("Error posting tweet:", error);
        res.json({ success: false, error: error.message });
    }
});

// Like a tweet
app.post('/like/:tweetId', async (req, res) => {
    try {
        const { tweetId } = req.params;
        console.log(`Liking tweet: ${tweetId}`);
        
        const result = await scraper.likeTweet(tweetId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("Error liking tweet:", error);
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.BRIDGE_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Twitter bridge service running on port ${PORT}`);
    initializeScraper();
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await scraper.logout();
    process.exit();
});