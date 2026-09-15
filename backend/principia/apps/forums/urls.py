from django.urls import path

from .views import ForumView, JoinForumView, LeaveForumView

urlpatterns = [
    path("forums/", ForumView.as_view()),
    path("forums/<int:id>/", ForumView.as_view()),
    path("forums/<int:id>/join/", JoinForumView.as_view()),
    path("forums/<int:id>/leave/", LeaveForumView.as_view()),
]