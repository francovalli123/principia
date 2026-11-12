from django.urls import path  

from .views import (
    FavouriteView,
    PhenomenonCatalogView,
    PhenomenonTypeView,
    SimulationCloneView,
    SimulationView,
)

urlpatterns = [  
    path("phenomena/", PhenomenonCatalogView.as_view()),  
    path("phenomenonConfig/<int:simulation_id>/",PhenomenonTypeView.as_view()),  
    path("simulations/", SimulationView.as_view()),  
    path("simulations/<int:simulation_id>/clone/", SimulationCloneView.as_view()),
    path("simulations/<int:id>/",SimulationView.as_view()),  
    path("simulations/favourites/", FavouriteView.as_view()),  
    path("simulations/favourites/<int:simulation_id>/", FavouriteView.as_view()),  
]
