from django.urls import path

from .views import SimulationView

urlpatterns = [
    path("simulations/", SimulationView.as_view()),
    path("simulations/<int:id>/", SimulationView.as_view()),
]
