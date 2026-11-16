import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def publish_forum_event(forum_id, event_type, payload):
    if forum_id is None:
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    try:
        async_to_sync(channel_layer.group_send)(
            f"forum_{forum_id}_events",
            {"type": event_type, "payload": payload},
        )
    except Exception:
        logger.exception("Could not publish realtime event for forum %s", forum_id)