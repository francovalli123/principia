from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.comments.models import Comment
from apps.forums.models import Forum, ForumMembership
from apps.publications.models import Publication
from apps.simulations.models import Simulation
from apps.users.models import User


class CommentOrderingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="commenter",
            email="commenter@example.com",
            password="password123",
        )
        forum = Forum.objects.create(name="Physics", owner=self.user)
        ForumMembership.objects.create(forum=forum, user=self.user)
        simulation = Simulation.objects.create(
            owner=self.user,
            phenomenon_type="oblique_projectile_motion",
            visibility="public",
        )
        self.publication = Publication.objects.create(
            title="Projectile experiment",
            description="A simulation shared in the forum.",
            simulation=simulation,
            owner=self.user,
            forum=forum,
        )
        self.client.force_authenticate(user=self.user)

    def test_comments_are_listed_oldest_first_across_pages(self):
        first_created_at = timezone.now()
        expected_ids = []

        for minute in range(12):
            comment = Comment.objects.create(
                owner=self.user,
                publication=self.publication,
                content=f"Comment {minute}",
            )
            created_at = first_created_at + timedelta(minutes=minute)
            Comment.objects.filter(pk=comment.pk).update(creation_date=created_at)
            expected_ids.append(comment.id)

        first_page = self.client.get(
            f"/api/comments/?publication_id={self.publication.id}&page=1"
        )
        second_page = self.client.get(
            f"/api/comments/?publication_id={self.publication.id}&page=2"
        )

        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(second_page.status_code, 200)
        comments = (
            first_page.data["data"]["results"]
            + second_page.data["data"]["results"]
        )
        self.assertEqual([comment["id"] for comment in comments], expected_ids)
