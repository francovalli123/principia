from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.forums.models import Forum, ForumMembership
from apps.publications.models import Publication
from apps.simulations.models import Favourite, ObliqueProjectileMotion, Simulation


class SimulationCreationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="simulation-owner",
            email="simulation-owner@example.com",
            password="test-password",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_creates_simulation_with_metadata_and_parameters(self):
        response = self.client.post(
            "/api/simulations/",
            {
                "title": "Tiro oblicuo",
                "description": "Un proyectil lanzado desde el suelo.",
                "phenomenon_type": "Oblique Projectile Motion",
                "visibility": "private",
                "allow_cloning": False,
                "parameters": {
                    "initial_velocity": 18,
                    "angle": 37,
                    "initial_height": 2,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["title"], "Tiro oblicuo")
        self.assertIsInstance(response.data["data"]["id"], int)
        simulation = Simulation.objects.get(pk=response.data["data"]["id"])
        self.assertEqual(simulation.title, "Tiro oblicuo")
        self.assertEqual(simulation.description, "Un proyectil lanzado desde el suelo.")
        self.assertEqual(simulation.visibility, "private")
        self.assertFalse(simulation.allow_cloning)
        self.assertTrue(
            ObliqueProjectileMotion.objects.filter(
                simulation=simulation,
                initial_velocity=18,
                angle=37,
                initial_height=2,
            ).exists()
        )

        config_response = self.client.get(
            f"/api/phenomenonConfig/{simulation.id}/"
        )

        self.assertEqual(config_response.status_code, 200)
        self.assertEqual(
            config_response.data,
            {
                "status": "success",
                "data": {
                    "initial_velocity": 18.0,
                    "angle": 37.0,
                    "initial_height": 2.0,
                },
            },
        )

    def test_rejects_non_string_title_without_server_error(self):
        response = self.client.post(
            "/api/simulations/",
            {
                "title": None,
                "phenomenon_type": "Oblique Projectile Motion",
                "parameters": {
                    "initial_velocity": 18,
                    "angle": 37,
                    "initial_height": 2,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["message"], "title must be a string")

    def test_owner_can_update_simulation_metadata_and_parameters(self):
        simulation = Simulation.objects.create(
            owner=self.user,
            phenomenon_type="Oblique Projectile Motion",
            title="Tiro inicial",
            visibility="public",
        )
        ObliqueProjectileMotion.objects.create(
            simulation=simulation,
            initial_velocity=18,
            angle=37,
            initial_height=2,
        )

        response = self.client.patch(
            f"/api/simulations/{simulation.id}/",
            {
                "title": "Tiro actualizado",
                "visibility": "hidden",
                "parameters": {
                    "initial_velocity": 24,
                    "angle": 45,
                    "initial_height": 3,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        simulation.refresh_from_db()
        configuration = simulation.obliqueprojectilemotion
        self.assertEqual(simulation.title, "Tiro actualizado")
        self.assertEqual(simulation.visibility, "hidden")
        self.assertEqual(configuration.initial_velocity, 24)
        self.assertEqual(configuration.angle, 45)
        self.assertEqual(configuration.initial_height, 3)

    def test_rejects_invalid_parameters_without_updating_metadata(self):
        simulation = Simulation.objects.create(
            owner=self.user,
            phenomenon_type="Oblique Projectile Motion",
            title="Tiro inicial",
            visibility="public",
        )
        ObliqueProjectileMotion.objects.create(
            simulation=simulation,
            initial_velocity=18,
            angle=37,
            initial_height=2,
        )

        response = self.client.patch(
            f"/api/simulations/{simulation.id}/",
            {
                "title": "No guardar",
                "parameters": {
                    "initial_velocity": 24,
                    "angle": 120,
                    "initial_height": 3,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        simulation.refresh_from_db()
        self.assertEqual(simulation.title, "Tiro inicial")
        self.assertEqual(simulation.obliqueprojectilemotion.angle, 37)

    def test_another_user_cannot_update_simulation(self):
        simulation = Simulation.objects.create(
            owner=self.user,
            phenomenon_type="Oblique Projectile Motion",
            title="Tiro inicial",
            visibility="public",
        )
        other_user = get_user_model().objects.create_user(
            username="simulation-other",
            email="simulation-other@example.com",
            password="test-password",
        )
        self.client.force_authenticate(user=other_user)

        response = self.client.patch(
            f"/api/simulations/{simulation.id}/",
            {"title": "No autorizado"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        simulation.refresh_from_db()
        self.assertEqual(simulation.title, "Tiro inicial")


class SimulationCloneAndFavouriteTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="simulation-owner",
            email="simulation-owner@example.com",
            password="test-password",
        )
        self.member = user_model.objects.create_user(
            username="forum-member",
            email="forum-member@example.com",
            password="test-password",
        )
        self.outsider = user_model.objects.create_user(
            username="forum-outsider",
            email="forum-outsider@example.com",
            password="test-password",
        )
        self.forum = Forum.objects.create(name="Physics", owner=self.owner)
        ForumMembership.objects.create(forum=self.forum, user=self.owner)
        ForumMembership.objects.create(forum=self.forum, user=self.member)
        self.simulation = Simulation.objects.create(
            owner=self.owner,
            phenomenon_type="Oblique Projectile Motion",
            title="Tiro de prueba",
            description="Parámetros de prueba",
            visibility="private",
            allow_cloning=True,
        )
        ObliqueProjectileMotion.objects.create(
            simulation=self.simulation,
            initial_velocity=18,
            angle=37,
            initial_height=2,
        )
        self.publication = Publication.objects.create(
            title="Tiro de prueba",
            description="Simulación publicada en el foro.",
            simulation=self.simulation,
            owner=self.owner,
            forum=self.forum,
        )
        self.client = APIClient()

    def test_forum_member_can_load_private_simulation_configuration(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            f"/api/phenomenonConfig/{self.simulation.id}/"
            f"?publication_id={self.publication.id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["angle"], 37.0)

    def test_non_member_cannot_load_private_forum_simulation_configuration(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(
            f"/api/phenomenonConfig/{self.simulation.id}/"
            f"?publication_id={self.publication.id}"
        )

        self.assertEqual(response.status_code, 403)

    def test_forum_member_can_clone_a_permitted_simulation(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            f"/api/simulations/{self.simulation.id}/clone/",
            {"publication_id": self.publication.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        clone = Simulation.objects.get(pk=response.data["data"]["id"])
        self.assertEqual(clone.owner, self.member)
        self.assertEqual(clone.title, f"{self.simulation.title} - Copia")
        self.assertEqual(clone.description, self.simulation.description)
        self.assertEqual(clone.visibility, "private")
        self.assertTrue(clone.allow_cloning)
        self.assertEqual(
            (
                clone.obliqueprojectilemotion.initial_velocity,
                clone.obliqueprojectilemotion.angle,
                clone.obliqueprojectilemotion.initial_height,
            ),
            (18, 37, 2),
        )

    def test_non_member_cannot_clone_a_forum_simulation(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            f"/api/simulations/{self.simulation.id}/clone/",
            {"publication_id": self.publication.id},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(Simulation.objects.count(), 1)

    def test_member_cannot_clone_when_source_disallows_cloning(self):
        self.simulation.allow_cloning = False
        self.simulation.save(update_fields=["allow_cloning"])
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            f"/api/simulations/{self.simulation.id}/clone/",
            {"publication_id": self.publication.id},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(Simulation.objects.count(), 1)

    def test_member_can_favourite_and_remove_a_private_forum_simulation(self):
        self.client.force_authenticate(user=self.member)
        favourite_url = f"/api/simulations/favourites/{self.simulation.id}/"

        response = self.client.post(
            favourite_url,
            {"publication_id": self.publication.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["simulation"], self.simulation.id)
        self.assertEqual(
            response.data["data"]["simulation_details"]["title"],
            "Tiro de prueba",
        )
        self.assertEqual(
            response.data["data"]["publication"],
            {"id": self.publication.id, "forum": self.forum.id},
        )
        self.assertTrue(
            Favourite.objects.filter(
                owner=self.member,
                simulation=self.simulation,
                publication=self.publication,
            ).exists()
        )

        response = self.client.delete(favourite_url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Favourite.objects.filter(owner=self.member).exists())

    def test_deleting_publication_also_deletes_its_favourites(self):
        Favourite.objects.create(
            owner=self.member,
            simulation=self.simulation,
            publication=self.publication,
        )

        self.publication.delete()

        self.assertFalse(Favourite.objects.filter(owner=self.member).exists())
        self.assertTrue(Simulation.objects.filter(pk=self.simulation.pk).exists())

    def test_deleting_forum_also_deletes_favourites_from_its_publications(self):
        Favourite.objects.create(
            owner=self.member,
            simulation=self.simulation,
            publication=self.publication,
        )

        self.forum.delete()

        self.assertFalse(Favourite.objects.filter(owner=self.member).exists())
        self.assertTrue(Simulation.objects.filter(pk=self.simulation.pk).exists())
