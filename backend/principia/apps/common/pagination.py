from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView


class PaginatedAPIView(APIView):
    # APIView no aplica DEFAULT_PAGINATION_CLASS automáticamente.
    pagination_class = api_settings.DEFAULT_PAGINATION_CLASS

    # Recibe el queryset completo y la peticion HTTP
    def paginate_queryset(self, queryset, request):
        if self.pagination_class is None:
            return None # Devuelve None si la paginación está desactivada

        # Se conserva el paginador para generar después los enlaces y metadatos.
        self.paginator = self.pagination_class()
        return self.paginator.paginate_queryset(queryset, request, view=self)

    # Recibe los datos serializados de la pagina actual
    def get_paginated_response(self, data):
        # Mantiene el formato existente y añade la respuesta estándar de DRF en data.
        response = self.paginator.get_paginated_response(data)
        return Response(
            {"status": "success", "data": response.data},
            status=response.status_code,
            headers=response.headers,
        )