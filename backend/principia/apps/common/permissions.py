from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    message = 'Must be owner.'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Instance must have an attribute named `owner`.
        return obj.owner == request.user
