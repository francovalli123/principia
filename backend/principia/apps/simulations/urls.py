from django.urls import path

from .views import PhenomenonCatalogView, SimulationView, FavouriteView

urlpatterns = [
    path("phenomena/", PhenomenonCatalogView.as_view()),
    path("simulations/", SimulationView.as_view()),
    path("simulations/favourites/", FavouriteView.as_view()),
    path("simulations/favourites/<int:simulation_id>/", FavouriteView.as_view()),
]
