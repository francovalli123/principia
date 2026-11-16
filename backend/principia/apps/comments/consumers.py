import hashlib
from datetime import timedelta

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db import transaction
from django.utils import timezone

from apps.comments.models import CommentSocketTicket
from apps.forums.models import ForumMembership
from apps.publications.models import Publication


class ForumEventsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        forum_id = self.scope["url_route"]["kwargs"]["forum_id"]
        ticket = next(
            (
                protocol.removeprefix("ticket.")
                for protocol in self.scope.get("subprotocols", [])
                if protocol.startswith("ticket.")
            ),
            None,
        )
        user_id = await self.consume_ticket(ticket) if ticket else None
        if user_id is None or not await self.is_forum_member(user_id, forum_id):
            await self.close(code=4403)
            return

        self.forum_id = forum_id
        self.group_name = f"forum_{forum_id}_events"
        self.user_id = user_id
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept(subprotocol="principia.comments.v1")

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def comment_created(self, event):
        publication_id = event["payload"].get("publication")
        if not await self.is_forum_member(self.user_id, self.forum_id):
            await self.close(code=4403)
            return
        if not await self.can_access_publication(self.user_id, self.forum_id, publication_id):
            return
        await self.send_json({"type": "comment.created", "comment": event["payload"]})

    async def comment_deleted(self, event):
        publication_id = event["payload"].get("publication")
        if not await self.is_forum_member(self.user_id, self.forum_id):
            await self.close(code=4403)
            return
        if not await self.can_access_publication(self.user_id, self.forum_id, publication_id):
            return
        await self.send_json({"type": "comment.deleted", **event["payload"]})

    async def publication_created(self, event):
        publication = event["payload"]
        if not await self.is_forum_member(self.user_id, self.forum_id):
            await self.close(code=4403)
            return
        if publication.get("forum") != self.forum_id or not await self.can_access_publication(
            self.user_id,
            self.forum_id,
            publication.get("id"),
        ):
            return
        await self.send_json({"type": "publication.created", "publication": publication})

    async def publication_deleted(self, event):
        publication = event["payload"]
        if not await self.is_forum_member(self.user_id, self.forum_id):
            await self.close(code=4403)
            return
        if publication.get("forum") != self.forum_id:
            return
        if (
            publication.get("visibility") == "hidden"
            and publication.get("simulation_owner_id") != self.user_id
        ):
            return
        await self.send_json({
            "type": "publication.deleted",
            "publication_id": publication["id"],
        })

    @database_sync_to_async
    def consume_ticket(self, ticket):
        token_hash = hashlib.sha256(ticket.encode("utf-8")).hexdigest()
        with transaction.atomic():
            stored_ticket = (
                CommentSocketTicket.objects.select_for_update()
                .filter(token_hash=token_hash, expires_at__gt=timezone.now())
                .first()
            )
            if stored_ticket is None:
                return None
            user_id = stored_ticket.user_id
            stored_ticket.delete()
            return user_id

    @database_sync_to_async
    def is_forum_member(self, user_id, forum_id):
        return ForumMembership.objects.filter(user_id=user_id, forum_id=forum_id).exists()

    @database_sync_to_async
    def can_access_publication(self, user_id, forum_id, publication_id):
        publication = Publication.objects.select_related("simulation").filter(
            id=publication_id,
            forum_id=forum_id,
        ).first()
        if publication is None:
            return False
        simulation = publication.simulation
        return simulation.owner_id == user_id or simulation.visibility.lower() != "hidden"