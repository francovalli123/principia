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
