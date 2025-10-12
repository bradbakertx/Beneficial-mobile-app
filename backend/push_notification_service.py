import requests
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Send a push notification via Expo Push Notification service"""
    if not push_token or not push_token.startswith('ExponentPushToken'):
        logger.warning(f"Invalid push token: {push_token}")
        return False
    
    try:
        message = {
            "to": push_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",
        }
        
        response = requests.post(
            EXPO_PUSH_URL,
            json=message,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout=10
        )
        
        response.raise_for_status()
        result = response.json()
        
        if result.get("data") and result["data"].get("status") == "ok":
            logger.info(f"Push notification sent successfully to {push_token[:20]}...")
            return True
        else:
            logger.error(f"Push notification failed: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send push notification: {str(e)}")
        return False


def send_inspection_cancelled_notification(push_token: str, property_address: str, is_owner: bool = False):
    """Send cancellation notification"""
    if is_owner:
        title = "Inspection Cancelled"
        body = f"You cancelled the inspection at {property_address}"
    else:
        title = "Inspection Cancelled"
        body = f"Your inspection at {property_address} has been cancelled"
    
    return send_push_notification(
        push_token=push_token,
        title=title,
        body=body,
        data={"type": "inspection_cancelled", "property_address": property_address}
    )


def send_quote_received_notification(push_token: str, property_address: str, quote_amount: float):
    """Send quote received notification"""
    return send_push_notification(
        push_token=push_token,
        title="Quote Ready!",
        body=f"Your quote for {property_address} is ready: ${quote_amount:.2f}",
        data={"type": "quote_received", "property_address": property_address, "amount": quote_amount}
    )


def send_inspection_scheduled_notification(push_token: str, property_address: str, scheduled_date: str, scheduled_time: str, is_owner: bool = False):
    """Send inspection scheduled notification"""
    if is_owner:
        title = "Inspection Scheduled"
        body = f"You scheduled an inspection at {property_address} for {scheduled_date} at {scheduled_time}"
    else:
        title = "Inspection Scheduled!"
        body = f"Your inspection at {property_address} is confirmed for {scheduled_date} at {scheduled_time}"
    
    return send_push_notification(
        push_token=push_token,
        title=title,
        body=body,
        data={
            "type": "inspection_scheduled",
            "property_address": property_address,
            "date": scheduled_date,
            "time": scheduled_time
        }
    )


def send_new_message_notification(push_token: str, sender_name: str, message_preview: str):
    """Send new chat message notification"""
    return send_push_notification(
        push_token=push_token,
        title=f"New message from {sender_name}",
        body=message_preview[:100],
        data={"type": "new_message", "sender": sender_name}
    )
