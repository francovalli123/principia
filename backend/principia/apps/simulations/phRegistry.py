
from .serializers import (
    ObliqueProjectileMotionSerializer
)

PHENOMENON_SERIALIZERS = {
    "Oblique Projectile Motion": {
        "serializer": ObliqueProjectileMotionSerializer,
        "related_name": "oblique_projectile_motion"
    },
}