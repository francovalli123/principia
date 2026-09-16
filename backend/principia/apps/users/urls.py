from django.urls import path

from .views import (
    LogoutAllView,
    LogoutView,
    ProfileView,
    UserView,
    LoginView
)

urlpatterns = [
    path("users/", UserView.as_view()),
    path("users/<int:id>/", UserView.as_view()),
    path("users/profile/", ProfileView.as_view()),
    path("users/login/", LoginView.as_view()),
    path("users/logout/", LogoutView.as_view()),
    path("users/logout-all/", LogoutAllView.as_view()),
    path("users/profile/<int:id>/", ProfileView.as_view()),
]
