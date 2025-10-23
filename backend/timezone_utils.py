"""
Timezone utilities to ensure all dates/times are handled in Central Time (US/Central)
"""
from datetime import datetime, date
from zoneinfo import ZoneInfo

# Central Time Zone
CENTRAL_TZ = ZoneInfo("America/Chicago")

def get_central_now() -> datetime:
    """Get current datetime in Central Time"""
    return datetime.now(CENTRAL_TZ)

def get_central_today() -> date:
    """Get today's date in Central Time"""
    return get_central_now().date()

def parse_date_central(date_string: str) -> date:
    """
    Parse a date string (YYYY-MM-DD) as a Central Time date
    Returns a date object (no time component)
    """
    if not date_string:
        return None
    try:
        return datetime.strptime(date_string, "%Y-%m-%d").date()
    except (ValueError, AttributeError):
        return None

def format_date_for_display(date_obj) -> str:
    """
    Format a date object as YYYY-MM-DD string for display/storage
    """
    if isinstance(date_obj, str):
        return date_obj
    if isinstance(date_obj, datetime):
        date_obj = date_obj.date()
    if isinstance(date_obj, date):
        return date_obj.strftime("%Y-%m-%d")
    return None

def datetime_to_central(dt: datetime) -> datetime:
    """Convert any datetime to Central Time"""
    if dt.tzinfo is None:
        # Assume UTC if no timezone
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(CENTRAL_TZ)
