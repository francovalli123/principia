from django.urls import path

from .views import PublicationView

urlpatterns = [
    path("publications/", PublicationView.as_view()),
    path("publications/<int:id>/", PublicationView.as_view()),
]
