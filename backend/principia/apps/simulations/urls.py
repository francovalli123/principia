from django.urls import path  

from .views import PhenomenonCatalogView, SimulationView, FavouriteView,PhenomenonTypeView  

urlpatterns = [  
    path("phenomena/", PhenomenonCatalogView.as_view()),  
    path("phenomenonConfig/<int:simulation_id>/",PhenomenonTypeView.as_view()),  
    path("simulations/", SimulationView.as_view()),  
    path("simulations/<int:id>/",SimulationView.as_view()),  
    path("simulations/favourites/", FavouriteView.as_view()),  
    path("simulations/favourites/<int:simulation_id>/", FavouriteView.as_view()),  
]
