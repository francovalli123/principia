from django.test import TestCase
from rest_framework.test import APITestCase

from apps.comments.models import Comment
from apps.forums.models import Forum, ForumMembership
from apps.publications.models import Publication
from apps.simulations.models import Simulation
from apps.users.models import User

# Create your tests here.


class CommentAccessTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="commenter",
			email="commenter@example.com",
			password="password123",
		)
		simulation = Simulation.objects.create(
			owner=self.user,
			phenomenon_type="oblique_projectile_motion",
			visibility="public",
		)
		self.publication = Publication.objects.create(
			title="Standalone experiment",
			description="This publication is not attached to a forum.",
			simulation=simulation,
			owner=self.user,
		)

	def test_cannot_create_comment_on_publication_without_forum(self):
		self.client.force_authenticate(user=self.user)

		response = self.client.post(
			"/api/comments/",
			{"publication": self.publication.id, "content": "A comment"},
			format="json",
		)

		self.assertEqual(response.status_code, 403)
		self.assertFalse(Comment.objects.exists())

	def test_comment_owner_cannot_delete_after_leaving_forum(self):
		forum = Forum.objects.create(name="Physics", owner=self.user)
		ForumMembership.objects.create(forum=forum, user=self.user)
		self.publication.forum = forum
		self.publication.save(update_fields=["forum"])
		comment = Comment.objects.create(
			owner=self.user,
			publication=self.publication,
			content="A comment",
		)
		ForumMembership.objects.filter(forum=forum, user=self.user).delete()
		self.client.force_authenticate(user=self.user)

		response = self.client.delete(f"/api/comments/{comment.id}/")

		self.assertEqual(response.status_code, 403)
		self.assertTrue(Comment.objects.filter(id=comment.id).exists())

	def test_member_cannot_access_comments_for_hidden_simulation(self):
		owner = User.objects.create_user(
			username="simulation-owner",
			email="simulation-owner@example.com",
			password="password123",
		)
		forum = Forum.objects.create(name="Physics", owner=owner)
		ForumMembership.objects.create(forum=forum, user=owner)
		ForumMembership.objects.create(forum=forum, user=self.user)
		hidden_simulation = Simulation.objects.create(
			owner=owner,
			phenomenon_type="oblique_projectile_motion",
			visibility="hidden",
		)
		publication = Publication.objects.create(
			title="Hidden experiment",
			description="This publication must not expose comments.",
			simulation=hidden_simulation,
			owner=owner,
			forum=forum,
		)
		comment = Comment.objects.create(
			owner=self.user,
			publication=publication,
			content="Hidden comment",
		)
		self.client.force_authenticate(user=self.user)

		list_response = self.client.get(
			f"/api/comments/?publication_id={publication.id}"
		)
		detail_response = self.client.get(f"/api/comments/{comment.id}/")
		post_response = self.client.post(
			"/api/comments/",
			{"publication": publication.id, "content": "Another comment"},
			format="json",
		)
		delete_response = self.client.delete(f"/api/comments/{comment.id}/")

		self.assertEqual(list_response.status_code, 403)
		self.assertEqual(detail_response.status_code, 403)
		self.assertEqual(post_response.status_code, 403)
		self.assertEqual(delete_response.status_code, 403)
