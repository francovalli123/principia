from rest_framework.test import APITestCase

from apps.forums.models import Forum, ForumMembership
from apps.users.models import User


class ForumMembersTests(APITestCase):
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
		self.forum = Forum.objects.create(name="Physics", owner=self.owner)
		ForumMembership.objects.create(forum=self.forum, user=self.owner)
		ForumMembership.objects.create(forum=self.forum, user=self.member)

	def test_member_can_list_forum_members(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.get(f"/api/forums/{self.forum.id}/members/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data["data"]), 2)

	def test_owner_can_list_forums_without_membership_row(self):
		legacy_forum = Forum.objects.create(name="Legacy forum", owner=self.owner)
		self.client.force_authenticate(user=self.owner)

		response = self.client.get("/api/forums/mine/")

		self.assertEqual(response.status_code, 200)
		forum_ids = [forum["id"] for forum in response.data["data"]["results"]]
		self.assertIn(legacy_forum.id, forum_ids)

	def test_forum_lists_include_membership_state(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.get("/api/forums/mine/")

		self.assertEqual(response.status_code, 200)
		serialized_forum = next(
			forum for forum in response.data["data"]["results"]
			if forum["id"] == self.forum.id
		)
		self.assertTrue(serialized_forum["is_member"])
		self.assertFalse(serialized_forum["is_owner"])

	def test_suggested_forums_are_not_memberships(self):
		self.client.force_authenticate(user=self.owner)
		suggested_forum = Forum.objects.create(name="Suggested")

		response = self.client.get("/api/forums/suggested/")

		self.assertEqual(response.status_code, 200)
		serialized_forum = next(
			forum for forum in response.data["data"]["results"]
			if forum["id"] == suggested_forum.id
		)
		self.assertFalse(serialized_forum["is_member"])
		self.assertFalse(serialized_forum["is_owner"])

	def test_only_owner_can_expel_member(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.delete(
			f"/api/forums/{self.forum.id}/members/{self.owner.id}/"
		)

		self.assertEqual(response.status_code, 403)
		self.assertTrue(
			ForumMembership.objects.filter(
				forum=self.forum,
				user=self.member,
			).exists()
		)

	def test_owner_can_expel_member(self):
		self.client.force_authenticate(user=self.owner)

		response = self.client.delete(
			f"/api/forums/{self.forum.id}/members/{self.member.id}/"
		)

		self.assertEqual(response.status_code, 204)
		self.assertFalse(
			ForumMembership.objects.filter(
				forum=self.forum,
				user=self.member,
			).exists()
		)

	def test_owner_cannot_expel_themselves(self):
		self.client.force_authenticate(user=self.owner)

		response = self.client.delete(
			f"/api/forums/{self.forum.id}/members/{self.owner.id}/"
		)

		self.assertEqual(response.status_code, 400)
