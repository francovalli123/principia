from django.urls import path

from .views import PhenomenonCatalogView, SimulationView

urlpatterns = [
    path("phenomena/", PhenomenonCatalogView.as_view()),
    path("simulations/", SimulationView.as_view()),
    path("simulations/<int:id>/", SimulationView.as_view()),
]
