from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView


class PaginatedAPIView(APIView):
    # APIView does not automatically apply DEFAULT_PAGINATION_CLASS
    pagination_class = api_settings.DEFAULT_PAGINATION_CLASS

    # Receives the complete queryset and the HTTP request
    def paginate_queryset(self, queryset, request):
        if self.pagination_class is None:
            return None # Returns None if pagination is disabled

        # The paginator is retained so that links and metadata can be generated later
        self.paginator = self.pagination_class()
        return self.paginator.paginate_queryset(queryset, request, view=self)

    # Receives the serialized data from the current page
    def get_paginated_response(self, data):
        # Mantains the existing format and adds the standard DRF response within data
        response = self.paginator.get_paginated_response(data)
        return Response(
            {"status": "success", "data": response.data},
            status=response.status_code,
            headers=response.headers,
        )