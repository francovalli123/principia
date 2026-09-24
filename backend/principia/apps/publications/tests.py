from django.test import TestCase
from rest_framework.test import APITestCase

from apps.forums.models import Forum, ForumMembership
from apps.publications.models import Publication
from apps.simulations.models import Simulation
from apps.users.models import User

# Create your tests here.


class PublicationAccessTests(APITestCase):
	def setUp(self):
		self.owner = User.objects.create_user(
			username="owner",
			email="owner@example.com",
			password="password123",
		)
		self.member = User.objects.create_user(
			username="member",
			email="member@example.com",
			password="password123",
		)
		self.outsider = User.objects.create_user(
			username="outsider",
			email="outsider@example.com",
			password="password123",
		)
		self.forum = Forum.objects.create(name="Physics", owner=self.owner)
		ForumMembership.objects.create(forum=self.forum, user=self.owner)
		ForumMembership.objects.create(forum=self.forum, user=self.member)
		simulation = Simulation.objects.create(
			owner=self.owner,
			phenomenon_type="oblique_projectile_motion",
			visibility="private",
		)
		self.publication = Publication.objects.create(
			title="Private experiment",
			description="An experiment shared with the forum.",
			simulation=simulation,
			owner=self.owner,
			forum=self.forum,
		)

	def test_forum_member_can_access_private_published_simulation(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.get(f"/api/publications/{self.publication.id}/")

		self.assertEqual(response.status_code, 200)

	def test_non_member_cannot_access_private_published_simulation(self):
		self.client.force_authenticate(user=self.outsider)

		response = self.client.get(f"/api/publications/{self.publication.id}/")

		self.assertEqual(response.status_code, 403)
