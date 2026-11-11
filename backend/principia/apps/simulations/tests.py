from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.simulations.models import ObliqueProjectileMotion, Simulation


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
