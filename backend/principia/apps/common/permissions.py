from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    message = 'Must be owner.'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Instance must have an attribute named `owner`.
        return obj.owner == request.user


class SimulationPermission(permissions.BasePermission):
    message = "You do not have permission to access this simulation."

    def has_object_permission(self, request, view, obj):
        # Gets related simulation
        simulation = getattr(obj, "simulation", obj)  # works for both Simulation and Publication
        if request.user == simulation.owner:
            return True
        visibility = simulation.visibility.lower()
        if visibility == "hidden":
            return False
        if visibility == "private":
            return getattr(view, "access_context", None) == "forum" #Allowed from forum , but not from profile
        #Public
        return True
