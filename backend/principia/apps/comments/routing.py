from django.urls import path

from apps.comments.consumers import ForumEventsConsumer

websocket_urlpatterns = [
    path("ws/forums/<int:forum_id>/events/", ForumEventsConsumer.as_asgi()),
]