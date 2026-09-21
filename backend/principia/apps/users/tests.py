from django.db import IntegrityError, connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.users.security import hash_lookup_value


class SensitiveDataSecurityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="secure-password",
            first_name="Alice",
        )

    def test_sensitive_fields_are_encrypted_at_rest_and_readable_from_model(self):
        # El modelo devuelve valores utilizables, pero la base no debe guardar texto plano.
        with connection.cursor() as cursor:
            cursor.execute("SELECT email, first_name FROM users_user WHERE id = %s", [self.user.id])
            stored_email, stored_first_name = cursor.fetchone()

        self.assertNotEqual(stored_email, "alice@example.com")
        self.assertNotEqual(stored_first_name, "Alice")
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "alice@example.com")
        self.assertEqual(self.user.email_lookup_hash, hash_lookup_value("alice@example.com"))

    def test_partial_email_save_keeps_lookup_hash_in_sync(self):
        self.user.email = "new-alice@example.com"
        self.user.save(update_fields=["email"])
        self.user.refresh_from_db()

        self.assertEqual(self.user.email_lookup_hash, hash_lookup_value("new-alice@example.com"))

    def test_database_rejects_duplicate_email_lookup_hash(self):
        # Verifica la restriccion de base de datos, no solo la validacion del serializer.
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                User.objects.create_user(
                    username="duplicate-alice",
                    email="ALICE@example.com",
                    password="secure-password",
                )

    def test_user_endpoint_does_not_expose_another_users_data(self):
        other_user = User.objects.create_user(
            username="bob", email="bob@example.com", password="secure-password"
        )
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.get(f"/api/users/{other_user.id}/")

        self.assertEqual(response.status_code, 403)

    def test_logout_rejects_missing_refresh_token(self):
        client = APIClient(HTTP_HOST="localhost")
        client.force_authenticate(user=self.user)

        response = client.post("/api/users/logout/", {}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_logout_rejects_invalid_refresh_token(self):
        client = APIClient(HTTP_HOST="localhost")
        client.force_authenticate(user=self.user)

        response = client.post(
            "/api/users/logout/",
            {"refresh": "not-a-valid-refresh-token"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_logout_blacklists_valid_refresh_token(self):
        client = APIClient(HTTP_HOST="localhost")
        client.force_authenticate(user=self.user)
        refresh = str(RefreshToken.for_user(self.user))

        response = client.post(
            "/api/users/logout/",
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
