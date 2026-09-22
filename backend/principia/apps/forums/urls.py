from django.urls import path

from .views import ForumMembersView, ForumView, JoinForumView, LeaveForumView

urlpatterns = [
    path("forums/", ForumView.as_view()),
    path("forums/<int:id>/", ForumView.as_view()),
    path("forums/<int:id>/join/", JoinForumView.as_view()),
    path("forums/<int:id>/leave/", LeaveForumView.as_view()),
    path("forums/<int:id>/members/", ForumMembersView.as_view()),
    path("forums/<int:id>/members/<int:user_id>/", ForumMembersView.as_view()),
]