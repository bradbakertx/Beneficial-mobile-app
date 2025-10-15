import os
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from fastapi import HTTPException

# Google Calendar API scopes
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

def get_google_auth_url(state: str = None):
    """Generate Google OAuth URL"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")]
            }
        },
        scopes=SCOPES,
        redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',  # Force consent screen to get refresh_token
        state=state
    )
    
    return authorization_url, state


def exchange_code_for_token(code: str):
    """Exchange authorization code for access token"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")]
            }
        },
        scopes=SCOPES,
        redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
    )
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }


def get_calendar_events(credentials_dict: dict, start_date: datetime = None, end_date: datetime = None):
    """Fetch calendar events from Google Calendar"""
    try:
        # Validate that all required fields are present
        required_fields = ['access_token', 'refresh_token', 'token_uri', 'client_id', 'client_secret']
        missing_fields = [field for field in required_fields if not credentials_dict.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required credential fields: {', '.join(missing_fields)}. Please reconnect Google Calendar."
            )
        
        # Create credentials object with all required fields
        credentials = Credentials(
            token=credentials_dict.get("access_token"),
            refresh_token=credentials_dict.get("refresh_token"),
            token_uri=credentials_dict.get("token_uri"),
            client_id=credentials_dict.get("client_id"),
            client_secret=credentials_dict.get("client_secret"),
            scopes=credentials_dict.get("scopes", SCOPES)
        )
        
        # Build the Calendar API service
        # The service will automatically refresh the token if needed
        service = build('calendar', 'v3', credentials=credentials)
        
        # Set default date range if not provided (current week)
        if not start_date:
            start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            # Get start of week (Monday)
            start_date = start_date - timedelta(days=start_date.weekday())
        
        if not end_date:
            end_date = start_date + timedelta(days=7)
        
        # Format for Google Calendar API
        time_min = start_date.isoformat() + 'Z'
        time_max = end_date.isoformat() + 'Z'
        
        # Call the Calendar API
        events_result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            maxResults=100,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        # Format events for frontend
        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            
            formatted_events.append({
                'id': event['id'],
                'title': event.get('summary', 'No title'),
                'start': start,
                'end': end,
                'description': event.get('description', ''),
                'location': event.get('location', ''),
                'all_day': 'date' in event['start']
            })
        
        # Return both events and updated credentials (in case token was refreshed)
        return {
            'events': formatted_events,
            'credentials': {
                'access_token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            } if credentials.token != credentials_dict.get("access_token") else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching calendar events: {str(e)}")
