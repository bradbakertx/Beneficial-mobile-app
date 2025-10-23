"""
Socket.IO Server for Real-time Updates
Provides instant notifications for quotes, inspections, messages, and scheduling events
"""
import socketio
from fastapi import HTTPException
from auth import decode_token
import logging

logger = logging.getLogger(__name__)

# Create Socket.IO AsyncServer with CORS support
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

# Store user sessions: {user_id: set_of_session_ids}
user_sessions = {}

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection with JWT authentication"""
    try:
        # Get token from auth dict
        token = auth.get('token') if auth else None
        
        if not token:
            logger.warning(f"Connection {sid} rejected: No token provided")
            return False
        
        # Decode and validate token
        try:
            payload = decode_token(token)
            user_id = payload.get('sub')
            user_role = payload.get('role')
            
            if not user_id:
                logger.warning(f"Connection {sid} rejected: Invalid token")
                return False
            
            # Store user session
            if user_id not in user_sessions:
                user_sessions[user_id] = set()
            user_sessions[user_id].add(sid)
            
            # Store user info in session
            await sio.save_session(sid, {
                'user_id': user_id,
                'role': user_role
            })
            
            logger.info(f"✅ Socket.IO: User {user_id} ({user_role}) connected. Session: {sid}")
            
            # Emit connection success
            await sio.emit('connection_established', {
                'user_id': user_id,
                'role': user_role,
                'message': 'Real-time updates enabled'
            }, room=sid)
            
            return True
            
        except Exception as e:
            logger.error(f"Connection {sid} rejected: Token decode error - {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Connection {sid} error: {str(e)}")
        return False


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    try:
        session = await sio.get_session(sid)
        user_id = session.get('user_id') if session else None
        
        if user_id and user_id in user_sessions:
            user_sessions[user_id].discard(sid)
            if not user_sessions[user_id]:
                del user_sessions[user_id]
        
        logger.info(f"❌ Socket.IO: Session {sid} disconnected (User: {user_id})")
        
    except Exception as e:
        logger.error(f"Disconnect error for {sid}: {str(e)}")


# ============= Helper Functions for Emitting Events =============

async def emit_to_user(user_id: str, event: str, data: dict):
    """Emit event to all sessions of a specific user"""
    if user_id in user_sessions:
        for session_id in user_sessions[user_id]:
            try:
                await sio.emit(event, data, room=session_id)
                logger.info(f"📤 Emitted '{event}' to user {user_id} (session {session_id})")
            except Exception as e:
                logger.error(f"Error emitting to session {session_id}: {str(e)}")


async def emit_to_role(role: str, event: str, data: dict):
    """Emit event to all users with a specific role"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    
    # Get all sessions
    for user_id, session_ids in user_sessions.items():
        for session_id in session_ids:
            try:
                session = await sio.get_session(session_id)
                if session and session.get('role') == role:
                    await sio.emit(event, data, room=session_id)
                    logger.info(f"📤 Emitted '{event}' to {role} user {user_id}")
            except Exception as e:
                logger.error(f"Error emitting to role {role}: {str(e)}")


async def emit_to_all_owners(event: str, data: dict):
    """Emit event to all owner users"""
    await emit_to_role('owner', event, data)


async def broadcast_event(event: str, data: dict):
    """Broadcast event to all connected clients"""
    try:
        await sio.emit(event, data)
        logger.info(f"📢 Broadcasted '{event}' to all clients")
    except Exception as e:
        logger.error(f"Error broadcasting {event}: {str(e)}")


# ============= Event Emitters for Business Logic =============

async def emit_new_quote(quote_id: str, quote_data: dict, is_agent_quote: bool = False):
    """Emit new quote event to all owners"""
    await emit_to_all_owners('new_quote', {
        'quote_id': quote_id,
        'is_agent_quote': is_agent_quote,
        'property_address': quote_data.get('property_address'),
        'customer_name': quote_data.get('customer_name') or quote_data.get('agent_name'),
        'timestamp': quote_data.get('created_at')
    })


async def emit_quote_updated(quote_id: str, customer_id: str, quote_data: dict):
    """Emit quote update to customer"""
    await emit_to_user(customer_id, 'quote_updated', {
        'quote_id': quote_id,
        'status': quote_data.get('status'),
        'quote_amount': quote_data.get('quote_amount'),
        'property_address': quote_data.get('property_address'),
        'timestamp': quote_data.get('updated_at')
    })


async def emit_new_inspection(inspection_id: str, inspection_data: dict):
    """Emit new inspection to owners"""
    await emit_to_all_owners('new_inspection', {
        'inspection_id': inspection_id,
        'property_address': inspection_data.get('property_address'),
        'customer_name': inspection_data.get('customer_name'),
        'status': inspection_data.get('status'),
        'timestamp': inspection_data.get('created_at')
    })


async def emit_inspection_updated(inspection_id: str, customer_id: str, inspection_data: dict):
    """Emit inspection update to customer and owners"""
    update_data = {
        'inspection_id': inspection_id,
        'status': inspection_data.get('status'),
        'property_address': inspection_data.get('property_address'),
        'scheduled_date': inspection_data.get('scheduled_date'),
        'scheduled_time': inspection_data.get('scheduled_time'),
        'timestamp': inspection_data.get('updated_at')
    }
    
    # Emit to customer
    if customer_id:
        await emit_to_user(customer_id, 'inspection_updated', update_data)
    
    # Emit to all owners
    await emit_to_all_owners('inspection_updated', update_data)


async def emit_time_slots_offered(inspection_id: str, customer_id: str, inspection_data: dict):
    """Emit time slot offers to customer"""
    await emit_to_user(customer_id, 'time_slots_offered', {
        'inspection_id': inspection_id,
        'property_address': inspection_data.get('property_address'),
        'offered_time_slots': inspection_data.get('offered_time_slots'),
        'timestamp': inspection_data.get('updated_at')
    })


async def emit_time_slot_confirmed(inspection_id: str, inspection_data: dict):
    """Emit time slot confirmation to owners and inspector"""
    confirmation_data = {
        'inspection_id': inspection_id,
        'property_address': inspection_data.get('property_address'),
        'scheduled_date': inspection_data.get('scheduled_date'),
        'scheduled_time': inspection_data.get('scheduled_time'),
        'customer_name': inspection_data.get('customer_name'),
        'timestamp': inspection_data.get('updated_at')
    }
    
    # Emit to all owners
    await emit_to_all_owners('time_slot_confirmed', confirmation_data)
    
    # Emit to inspector if assigned
    inspector_id = inspection_data.get('inspector_id')
    if inspector_id:
        await emit_to_user(inspector_id, 'time_slot_confirmed', confirmation_data)


async def emit_new_message(message_data: dict, recipient_ids: list):
    """Emit new message to recipients"""
    message_event = {
        'message_id': message_data.get('id'),
        'sender_id': message_data.get('sender_id'),
        'sender_name': message_data.get('sender_name'),
        'sender_role': message_data.get('sender_role'),
        'message_text': message_data.get('message_text'),
        'inspection_id': message_data.get('inspection_id'),
        'conversation_id': message_data.get('conversation_id'),
        'timestamp': message_data.get('created_at')
    }
    
    # Emit to each recipient
    for recipient_id in recipient_ids:
        await emit_to_user(recipient_id, 'new_message', message_event)


async def emit_calendar_updated(user_ids: list, calendar_data: dict):
    """Emit calendar update to specific users"""
    for user_id in user_ids:
        await emit_to_user(user_id, 'calendar_updated', calendar_data)


async def emit_reschedule_request(inspection_id: str, inspection_data: dict):
    """Emit reschedule request to owners"""
    await emit_to_all_owners('reschedule_request', {
        'inspection_id': inspection_id,
        'property_address': inspection_data.get('property_address'),
        'customer_name': inspection_data.get('customer_name'),
        'timestamp': inspection_data.get('updated_at')
    })


logger.info("✅ Socket.IO server initialized with real-time event handlers")
