from django.urls import path

from .views import CommentSocketTicketView, CommentView

urlpatterns = [
    path("comments/socket-ticket/", CommentSocketTicketView.as_view()),
    path("comments/", CommentView.as_view()),
    path("comments/<int:id>/", CommentView.as_view()),
]
