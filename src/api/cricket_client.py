import requests
import json
import time
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CricketClient:
    def __init__(self):
        self.base_url = "https://cricbuzz-cricket.p.rapidapi.com"
        self.headers = {
            "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com",
            "X-RapidAPI-Key": os.getenv('RAPIDAPI_KEY')
        }
        self.last_commentary = None
        self.match_id = None
        self.last_api_call = 0
        self.min_delay = 0.2  # Minimum 200ms between API calls (5 per second limit)
    
    def _rate_limit_wait(self):
        """Ensure we don't exceed API rate limits."""
        current_time = time.time()
        time_since_last_call = current_time - self.last_api_call
        if time_since_last_call < self.min_delay:
            time.sleep(self.min_delay - time_since_last_call)
        self.last_api_call = time.time()
    
    def _make_request(self, endpoint, params=None):
        """Make an API request with rate limiting and error handling."""
        try:
            self._rate_limit_wait()
            response = requests.get(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                params=params,
                timeout=10
            )
            
            if response.status_code == 404:
                print(f"Not found: {endpoint}")
                return None
            
            if response.status_code != 200:
                print(f"Error accessing {endpoint}: {response.status_code}")
                return None
            
            return response.json()
        except Exception as e:
            print(f"Error making request to {endpoint}: {e}")
            return None
    
    def find_active_match(self):
        """Find any ongoing international cricket match."""
        try:
            # Get list of matches
            matches_data = self._make_request('mcenter/v1/matches')
            if not matches_data:
                return self._get_default_match_response()
            
            matches = matches_data.get('typeMatches', [])
            active_match = None
            
            # Priority order: 1. Live matches 2. International 3. League matches
            for match_type in matches:
                match_type_name = match_type.get('matchType', '').lower()
                
                for match in match_type.get('seriesMatches', []):
                    series_name = match.get('seriesAdWrapper', {}).get('seriesName', '')
                    
                    for game in match.get('seriesAdWrapper', {}).get('matches', []):
                        state = game.get('matchInfo', {}).get('state', '').lower()
                        match_id = str(game.get('matchInfo', {}).get('matchId'))
                        
                        # Check if match is live or about to start
                        if state in ['in progress', 'live', 'tea break', 'lunch break', 'innings break', 'stumps']:
                            # Get detailed match info
                            detailed_info = self._make_request(f'mcenter/v1/{match_id}/info')
                            if not detailed_info:
                                continue
                            
                            active_match = {
                                'match_id': match_id,
                                'team1': game.get('matchInfo', {}).get('team1', {}).get('teamSName', ''),
                                'team2': game.get('matchInfo', {}).get('team2', {}).get('teamSName', ''),
                                'state': state,
                                'status': game.get('matchInfo', {}).get('status', ''),
                                'series': series_name,
                                'format': game.get('matchInfo', {}).get('matchFormat', ''),
                                'venue': detailed_info.get('venueInfo', {}).get('ground', ''),
                                'start_time': detailed_info.get('matchStartTimestamp')
                            }
                            
                            # If it's an international match, prioritize it
                            if any(x in series_name.lower() for x in ['icc', 'world cup', 'trophy', 'international']):
                                self.match_id = match_id
                                return active_match
            
            # If no international match found, use any active match
            if active_match:
                self.match_id = active_match['match_id']
                return active_match
            
            return self._get_default_match_response()
            
        except Exception as e:
            print(f"Error finding match: {e}")
            return self._get_default_match_response()
    
    def _get_default_match_response(self):
        """Return default response when no match is found."""
        return {
            'match_id': None,
            'team1': 'No Match',
            'team2': 'In Progress',
            'state': 'no match',
            'status': 'No active matches',
            'series': 'No ongoing series',
            'format': 'N/A',
            'venue': 'N/A',
            'start_time': None
        }
    
    def get_live_commentary(self):
        """Get live commentary and match details."""
        active_match = self.find_active_match()
        if not active_match or not active_match.get('match_id'):
            return None
        
        try:
            # Get commentary
            comm_data = self._make_request(f'mcenter/v1/{self.match_id}/comm')
            if not comm_data:
                return None
            
            # Get scorecard for detailed stats
            score_data = self._make_request(f'mcenter/v1/{self.match_id}/scard')
            if not score_data:
                return None
            
            # Get latest commentary
            commentaries = comm_data.get('commentaryList', [])
            if not commentaries:
                return None
            
            latest_comm = commentaries[0]
            
            # Don't return same commentary twice
            if (self.last_commentary and 
                self.last_commentary.get('timestamp') == latest_comm.get('timestamp')):
                return None
            
            self.last_commentary = latest_comm
            
            # Get current innings info
            current_inning = score_data.get('scoreCard', [{}])[0]
            bat_team = current_inning.get('batTeam', {})
            bowl_team = current_inning.get('bowlTeam', {})
            
            # Get current batsmen
            batsmen = []
            for batter in current_inning.get('batsmen', []):
                if batter.get('isBatting'):
                    runs = batter.get('runs', 0)
                    balls = batter.get('balls', 0)
                    fours = batter.get('fours', 0)
                    sixes = batter.get('sixes', 0)
                    batsmen.append(
                        f"{batter.get('name')} {runs}({balls}) [4s: {fours}, 6s: {sixes}]"
                    )
            
            # Get current bowler
            bowlers = []
            for bowler in current_inning.get('bowlers', []):
                if bowler.get('isBowling'):
                    wickets = bowler.get('wickets', 0)
                    runs = bowler.get('runs', 0)
                    overs = bowler.get('overs', 0)
                    maidens = bowler.get('maidens', 0)
                    bowlers.append(
                        f"{bowler.get('name')} {wickets}-{runs} ({overs} ov, {maidens} mdns)"
                    )
            
            # Format commentary text
            comm_text = latest_comm.get('commText', '')
            for fmt in latest_comm.get('commentaryFormats', {}).get('bold', {}).items():
                comm_text = comm_text.replace(fmt[0], fmt[1])
            
            context = {
                'match_info': active_match,
                'commentary': comm_text,
                'over': current_inning.get('overs', '0.0'),
                'score': f"{bat_team.get('score', 0)}/{bat_team.get('wickets', 0)}",
                'run_rate': current_inning.get('runRate', '0.00'),
                'batsmen': batsmen,
                'bowlers': bowlers,
                'recent_events': [
                    self._format_commentary(comm)
                    for comm in commentaries[:3]
                ],
                'partnership': current_inning.get('partnership', {})
            }
            
            return context
            
        except Exception as e:
            print(f"Error getting commentary: {e}")
            return None
    
    def _format_commentary(self, comm_data):
        """Format commentary text with bold markers."""
        text = comm_data.get('commText', '')
        formats = comm_data.get('commentaryFormats', {}).get('bold', {})
        if formats:
            for fmt_id, fmt_value in formats.items():
                text = text.replace(fmt_id, fmt_value)
        return text
    
    def get_match_stats(self):
        """Get current match statistics."""
        if not self.match_id:
            return None
        
        try:
            return self._make_request(f'matches/get-scorecard', {'matchId': self.match_id})
        except Exception as e:
            print(f"Error getting match stats: {e}")
            return None
    
    def get_match_context(self):
        """Get comprehensive match context for tweet generation."""
        commentary_data = self.get_live_commentary()
        if not commentary_data:
            # Return a richer default context for general cricket tweets
            return {
                'state': 'general',
                'teams': None,
                'series': None,
                'format': 'General',
                'venue': None,
                'commentary': None,
                'match_state': 'general',
                'topics': [
                    'cricket history',
                    'cricket stats',
                    'cricket legends',
                    'cricket moments',
                    'cricket records',
                    'cricket teams',
                    'cricket tournaments',
                    'cricket analysis',
                    'cricket news'
                ],
                'recent_events': []
            }
        
        match_info = commentary_data['match_info']
        context = {
            'teams': f"{match_info['team1']} vs {match_info['team2']}",
            'series': match_info['series'],
            'format': match_info['format'],
            'state': match_info['state'],
            'venue': match_info['venue'],
            'commentary': commentary_data['commentary'],
            'match_state': (
                f"Score: {commentary_data['score']}, "
                f"Over: {commentary_data['over']}, "
                f"RR: {commentary_data.get('run_rate', '0.00')}"
            )
        }
        
        if commentary_data.get('batsmen'):
            context['batsmen'] = commentary_data['batsmen']
        if commentary_data.get('bowlers'):
            context['bowlers'] = commentary_data['bowlers']
        if commentary_data.get('recent_events'):
            context['recent_events'] = commentary_data['recent_events']
        if commentary_data.get('partnership'):
            partnership = commentary_data['partnership']
            context['partnership'] = (
                f"Partnership: {partnership.get('runs', 0)} runs "
                f"in {partnership.get('balls', 0)} balls"
            )
        
        return context 