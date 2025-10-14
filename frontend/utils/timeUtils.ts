/**
 * Format a timestamp for display in chat
 * - Shows time for messages today (e.g., "2:30 PM")
 * - Shows "Yesterday" for messages from yesterday
 * - Shows date for older messages (e.g., "Oct 12")
 */
export function formatChatTime(timestamp: string | Date): string {
  // Ensure the timestamp is treated as UTC if it doesn't have timezone info
  let date: Date;
  if (typeof timestamp === 'string') {
    // If timestamp doesn't end with Z, add it to indicate UTC
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    date = new Date(utcTimestamp);
  } else {
    date = timestamp;
  }
  
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    // Show time only for today's messages
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return 'Yesterday';
  }
  
  // Check if this week
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  if (date > weekAgo) {
    // Show day of week (e.g., "Monday")
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  
  // Show date for older messages
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format a full timestamp for message details
 * Shows full date and time in local timezone
 */
export function formatFullTimestamp(timestamp: string | Date): string {
  // Ensure the timestamp is treated as UTC if it doesn't have timezone info
  let date: Date;
  if (typeof timestamp === 'string') {
    // If timestamp doesn't end with Z, add it to indicate UTC
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    date = new Date(utcTimestamp);
  } else {
    date = timestamp;
  }
  
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
